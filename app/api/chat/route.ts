import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { slack } from '@/lib/slack';
import { createCalendarEvent } from '@/lib/google-calendar';

export const runtime = 'nodejs';

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

function tomorrowAt10amIST(): string {
  const now = Date.now();
  const ist = new Date(now + IST_OFFSET);
  ist.setDate(ist.getDate() + 1);
  ist.setHours(10, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET).toISOString();
}

type BrandForPrompt = {
  slug: string;
  name: string;
  knowledge?: { rules?: { rule: string; category: string }[] };
};
type PersonForPrompt = {
  id: string;
  name: string;
  first_name: string;
  department: string;
  active_hours: number;
};
type MeetingForPrompt = {
  brand_name: string;
  date: string;
  summary: string | null;
  decisions: { text: string; impact: string }[];
};

function buildSystemPrompt(
  person: { name: string; role: string; department: string },
  brands: BrandForPrompt[],
  people: PersonForPrompt[],
  recentMeetings: MeetingForPrompt[]
) {
  const brandList = brands.map(b => `${b.slug} (${b.name})`).join(', ');

  const peopleList = people
    .map(p => `${p.first_name} (${p.name}, ${p.department}) — ${p.active_hours}h active`)
    .join('\n');

  const brandKnowledge = brands
    .filter(b => b.knowledge?.rules?.length)
    .map(b => {
      const rules = b.knowledge!.rules!.map(r => `  [${r.category}] ${r.rule}`).join('\n');
      return `${b.name}:\n${rules}`;
    })
    .join('\n\n');

  const meetingContext = recentMeetings.length
    ? recentMeetings.map(m => {
        const highDecisions = m.decisions
          ?.filter(d => d.impact === 'high')
          .map(d => `  → ${d.text}`)
          .join('\n') ?? '';
        return `${m.brand_name} (${m.date}): ${m.summary ?? 'No summary'}${highDecisions ? '\n' + highDecisions : ''}`;
      }).join('\n\n')
    : '';

  return `You are Harmony, the AI allocator for the 1702 Digital + Chord team.

Current user: ${person.name}, ${person.role} (${person.department} team). You are a team lead.

Team members and their current active task load:
${peopleList}

Active brands: ${brandList}
${brandKnowledge ? `\nBrand brain — rules and preferences from client meetings:\n${brandKnowledge}\n` : ''}${meetingContext ? `\nRecent client meetings (last 60 days):\n${meetingContext}\n` : ''}
Your job:
1. Parse what the lead says — who, what, when, how long, priority, references.
2. Call create_task_and_block or reassign_task as needed. For bulk messages, call create_task_and_block once per person sequentially.
3. After all tool calls complete, confirm in a short summary. For bulk, list each assignment in one line each. No fluff.

Rules:
- Due date is REQUIRED. If not specified, ask before doing anything else.
- If hours not specified, ask ONCE. If the lead says no or skips it, proceed without hours — no calendar block will be created, task will have deadline only.
- If priority not specified, default P1.
- If start time not specified, default tomorrow 10am IST.
- Match person by first name (case-insensitive).
- Match brand by name or slug (case-insensitive).
- Check active task load before assigning — if someone already has 20h+ active, flag it and ask if intentional.
- References are optional. If not provided, ask ONCE. If the lead says no or skips it, proceed without references.
- Reviewer is optional. If specified (e.g. "Pierre reviews this"), set reviewer_first_name. If not mentioned, skip — don't ask.
- Apply brand brain rules automatically — never violate a hard_no rule.
- Use recent meeting context to surface relevant decisions or pending work when relevant.
- If unclear on something critical (wrong name, unknown brand), ask ONE question.

Bulk allocation: If the lead lists multiple assignments in one message (e.g. morning block), process ALL of them — call create_task_and_block once per assignment without asking clarifying questions between them, unless something is critically missing (no due date, unknown person, unknown brand). At the end, confirm all assignments in a short list.

Reassignment: Use reassign_task when the lead says things like "move X to Y", "reassign", "give this to someone else", or "swap". Match the task by keywords from the deliverable.`;
}

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'create_task_and_block',
    description: 'Create a task and optional calendar block. Use for new assignments.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brand_slug: { type: 'string' },
        owner_first_name: { type: 'string', description: 'First name of the person to assign' },
        deliverable: { type: 'string' },
        task_type: { type: 'string', enum: ['copy', 'design', 'video', 'seo', 'content', 'strategy', 'other'] },
        estimated_hours: { type: 'number', description: 'Optional. If not provided, no calendar block is created — task will have deadline only.' },
        deadline: { type: 'string', description: 'ISO 8601 UTC. REQUIRED — due date for the task.' },
        priority: { type: 'string', enum: ['P0', 'P1', 'P2'] },
        reviewer_first_name: { type: 'string', description: 'Optional. First name of the person who will review and approve this task.' },
        start_at: { type: 'string', description: 'ISO 8601 UTC. Only relevant if estimated_hours is provided. Default: tomorrow 10am IST.' },
        references: { type: 'array', description: 'List of reference URLs (mood boards, inspiration, storyboards, etc.)', items: { type: 'string' } },
      },
      required: ['brand_slug', 'owner_first_name', 'deliverable', 'task_type', 'deadline', 'priority'],
    },
  },
  {
    name: 'reassign_task',
    description: 'Reassign an existing task to a different person. Use when the lead says "move X to Y", "reassign", "give this to someone else", or "swap".',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_keywords: { type: 'string', description: 'Keywords from the task deliverable to search for (e.g. "indiagate reel")' },
        new_owner_first_name: { type: 'string', description: 'First name of the new assignee' },
        estimated_hours: { type: 'number', description: 'Optional. If provided, creates a new calendar block for the new owner.' },
        start_at: { type: 'string', description: 'ISO 8601 UTC. Only used if estimated_hours is provided. Default: tomorrow 10am IST.' },
      },
      required: ['task_keywords', 'new_owner_first_name'],
    },
  },
];

async function executeTool(
  toolInput: Record<string, unknown>,
  assignedById: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const {
    brand_slug,
    owner_first_name,
    deliverable,
    task_type,
    estimated_hours,
    deadline,
    priority,
    reviewer_first_name,
    start_at,
    references,
  } = toolInput as {
    brand_slug: string;
    owner_first_name: string;
    deliverable: string;
    task_type: string;
    estimated_hours?: number;
    deadline: string;
    priority: string;
    reviewer_first_name?: string;
    start_at?: string;
    references?: string[];
  };

  // Resolve reviewer if specified
  let reviewerId: string | null = null;
  if (reviewer_first_name) {
    const { data: allPeople } = await supabase.from('people').select('id, name');
    const reviewer = allPeople?.find((p: { id: string; name: string }) =>
      p.name.toLowerCase().startsWith(reviewer_first_name.toLowerCase())
    );
    if (reviewer) reviewerId = reviewer.id;
  }

  // Resolve brand
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name')
    .eq('slug', brand_slug.toLowerCase())
    .maybeSingle();
  if (!brand) return `Brand "${brand_slug}" not found.`;

  // Resolve person
  const { data: people } = await supabase.from('people').select('id, name, email, google_refresh_token');
  const owner = people?.find(
    (p: { id: string; name: string; email: string; google_refresh_token: string | null }) =>
      p.name.toLowerCase().startsWith(owner_first_name.toLowerCase())
  ) as { id: string; name: string; email: string; google_refresh_token: string | null } | undefined;
  if (!owner) return `No one named "${owner_first_name}" found on the team.`;

  const hasHours = !!estimated_hours && estimated_hours > 0;
  const startAt = start_at ?? tomorrowAt10amIST();
  const endAt = hasHours
    ? new Date(new Date(startAt).getTime() + estimated_hours! * 3600000).toISOString()
    : null;

  // Check for conflicting blocks only if hours provided
  if (hasHours && endAt) {
    const { data: conflicts } = await supabase
      .from('blocks')
      .select('id, start_at, end_at, tasks(deliverable, brands(name))')
      .eq('person_id', owner.id)
      .eq('status', 'scheduled')
      .lt('start_at', endAt)
      .gt('end_at', startAt);

    if (conflicts && conflicts.length > 0) {
      const existing = (conflicts[0] as any);
      return `Conflict: ${owner.name} already has a block from ${existing.start_at} to ${existing.end_at} (${existing.tasks?.deliverable ?? 'unknown task'} for ${existing.tasks?.brands?.name ?? 'unknown brand'}). Pick a different time or ask if this is higher priority.`;
    }
  }

  // Create task
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .insert({
      brand_id: brand.id,
      deliverable,
      task_type,
      owner_id: owner.id,
      reviewer_id: reviewerId,
      assigned_by_id: assignedById,
      priority,
      estimated_hours: estimated_hours ?? null,
      status: 'scheduled',
      deadline: deadline,
    })
    .select('id')
    .single();

  if (taskErr || !task) return `Failed to create task: ${taskErr?.message}`;

  // Create references
  if (references && references.length > 0) {
    const refEntries = references.map((url: string) => ({
      task_id: task.id,
      ref_type: url.includes('figma') ? 'figma' : url.includes('miro') ? 'miro' : 'reference',
      url: url.startsWith('http') ? url : `https://${url}`,
    }));
    await supabase.from('task_references').insert(refEntries);
  }

  // Create block only if hours were provided
  if (hasHours && endAt) {
    const { error: blockErr } = await supabase.from('blocks').insert({
      task_id: task.id,
      person_id: owner.id,
      start_at: startAt,
      end_at: endAt,
      status: 'scheduled',
    });
    if (blockErr) return `Task created but block failed: ${blockErr.message}`;

    // Create Google Calendar event if owner has connected their calendar
    if (owner.google_refresh_token) {
      await createCalendarEvent({
        refreshToken: owner.google_refresh_token,
        title: `[${brand.name}] ${deliverable}`,
        description: `Priority: ${priority}\nTask type: ${task_type}\nAssigned via Harmony`,
        startAt,
        endAt,
      }).catch(err => console.warn('[google-calendar] Failed to create event:', err));
    }
  }

  // Log activity
  await supabase.from('activity_log').insert({
    actor_id: assignedById,
    action: 'task_created',
    task_id: task.id,
    details: { brand: brand.name, owner: owner.name, deliverable, hours: estimated_hours, priority },
  });

  // Notify Slack — always show deadline in IST
  const deadlineStr = new Date(deadline).toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });

  if (hasHours) {
    await slack.newBlock(owner.name, brand.name, estimated_hours!, deadlineStr);
    return `Done. ${owner.name} blocked ${estimated_hours}h for ${brand.name} — ${deliverable} (${priority}). Due ${deadlineStr}.`;
  } else {
    await slack.newBlock(owner.name, brand.name, 0, deadlineStr);
    return `Done. ${owner.name} assigned ${brand.name} — ${deliverable} (${priority}). Due ${deadlineStr}. No calendar block created.`;
  }
}

async function executeReassignTool(
  toolInput: Record<string, unknown>,
  assignedById: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { task_keywords, new_owner_first_name, estimated_hours, start_at } = toolInput as {
    task_keywords: string;
    new_owner_first_name: string;
    estimated_hours?: number;
    start_at?: string;
  };

  // Find task by keyword search on deliverable
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, deliverable, owner_id, brand_id, brands(name), owner:people!tasks_owner_id_fkey(name)')
    .not('status', 'in', '("done","cancelled","approved")')
    .ilike('deliverable', `%${task_keywords}%`)
    .limit(1);

  if (!tasks || tasks.length === 0) {
    return `No active task found matching "${task_keywords}". Try different keywords.`;
  }

  const task = tasks[0] as any;

  // Resolve new owner
  const { data: people } = await supabase.from('people').select('id, name');
  const newOwner = people?.find((p: { id: string; name: string }) =>
    p.name.toLowerCase().startsWith(new_owner_first_name.toLowerCase())
  );
  if (!newOwner) return `No one named "${new_owner_first_name}" found on the team.`;

  // Cancel only the old owner's block — leave other people's blocks untouched
  await supabase
    .from('blocks')
    .update({ status: 'cancelled' })
    .eq('task_id', task.id)
    .eq('person_id', task.owner_id)
    .eq('status', 'scheduled');

  // Update task owner
  await supabase
    .from('tasks')
    .update({ owner_id: newOwner.id })
    .eq('id', task.id);

  // Log activity
  await supabase.from('activity_log').insert({
    actor_id: assignedById,
    action: 'task_reassigned',
    task_id: task.id,
    details: { from: task.owner?.name, to: newOwner.name, deliverable: task.deliverable },
  });

  const fromName = task.owner?.name ?? 'previous owner';

  // Create new block if hours given
  const hasHours = !!estimated_hours && estimated_hours > 0;
  if (hasHours) {
    const startAt = start_at ?? tomorrowAt10amIST();
    const endAt = new Date(new Date(startAt).getTime() + estimated_hours! * 3600000).toISOString();
    await supabase.from('blocks').insert({
      task_id: task.id,
      person_id: newOwner.id,
      start_at: startAt,
      end_at: endAt,
      status: 'scheduled',
    });
  }

  // Notify Slack
  const { data: actor } = await supabase.from('people').select('name').eq('id', assignedById).maybeSingle();
  await slack.reassigned(task.deliverable, fromName, newOwner.name, actor?.name ?? 'a lead');

  if (hasHours) {
    return `Reassigned. "${task.deliverable}" moved from ${fromName} to ${newOwner.name}, ${estimated_hours}h block created. Slack notified.`;
  }
  return `Reassigned. "${task.deliverable}" moved from ${fromName} to ${newOwner.name}. Slack notified.`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Get person record
  const { data: person } = await supabase
    .from('people')
    .select('id, name, role, department, is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person?.is_team_lead) {
    return NextResponse.json({ error: 'Only team leads can use the allocator.' }, { status: 403 });
  }

  // Fetch live context: brands + knowledge, people, recent meetings, active task load
  const since60d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [
    { data: brands },
    { data: allPeople },
    { data: meetings },
    { data: activeTasks },
  ] = await Promise.all([
    supabase.from('brands').select('slug, name, knowledge').eq('status', 'active'),
    supabase.from('people').select('id, name, department'),
    supabase
      .from('brand_meetings')
      .select('meeting_date, ai_summary, decisions, brand:brands!brand_meetings_brand_id_fkey(name)')
      .gte('meeting_date', since60d)
      .order('meeting_date', { ascending: false })
      .limit(15),
    supabase
      .from('tasks')
      .select('owner_id, estimated_hours')
      .in('status', ['scheduled', 'in_progress']),
  ]);

  // Build per-person active hour load
  const loadById = ((activeTasks ?? []) as { owner_id: string; estimated_hours: number }[])
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.owner_id] = (acc[t.owner_id] ?? 0) + t.estimated_hours;
      return acc;
    }, {});

  const peopleForPrompt: PersonForPrompt[] = (allPeople ?? []).map(
    (p: { id: string; name: string; department: string }) => ({
      ...p,
      first_name: p.name.split(' ')[0],
      active_hours: Math.round((loadById[p.id] ?? 0) * 10) / 10,
    })
  );

  // Format recent meetings
  const meetingsForPrompt: MeetingForPrompt[] = ((meetings ?? []) as any[]).map(m => ({
    brand_name: m.brand?.name ?? 'Unknown',
    date: m.meeting_date,
    summary: m.ai_summary,
    decisions: (m.decisions ?? []) as { text: string; impact: string }[],
  }));

  const { messages } = await req.json();
  const systemText = buildSystemPrompt(person, brands ?? [], peopleForPrompt, meetingsForPrompt);

  const claudeMessages: Anthropic.Messages.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  let finalReply = '';

  // ── Try Anthropic first ──────────────────────────────────────────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const anthropicOk = anthropicKey && !anthropicKey.startsWith('sk-ant-placeholder');

  if (anthropicOk) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const model = process.env.ANTHROPIC_MODEL_ID || 'claude-sonnet-4-6';

      for (let i = 0; i < 20; i++) {
        const response = await (anthropic.messages.create as unknown as (p: Record<string, unknown>) => Promise<Anthropic.Messages.Message>)({
          model,
          max_tokens: 2048,
          system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
          tools: TOOLS.map((t, idx) =>
            idx === TOOLS.length - 1 ? { ...t, cache_control: { type: 'ephemeral' } } : t
          ),
          messages: claudeMessages,
        });

        if (response.stop_reason === 'end_turn') {
          const text = response.content.find((c): c is Anthropic.Messages.TextBlock => c.type === 'text');
          finalReply = text?.text ?? '';
          break;
        }

        if (response.stop_reason === 'tool_use') {
          const toolUse = response.content.find((c): c is Anthropic.Messages.ToolUseBlock => c.type === 'tool_use');
          if (!toolUse) break;

          const toolResult = toolUse.name === 'reassign_task'
            ? await executeReassignTool(toolUse.input as Record<string, unknown>, person.id, supabase)
            : await executeTool(toolUse.input as Record<string, unknown>, person.id, supabase);

          claudeMessages.push({ role: 'assistant', content: response.content });
          claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: toolResult }] });
          continue;
        }
        break;
      }
    } catch (err) {
      console.warn('[chat] Anthropic failed, falling back to Groq:', err instanceof Error ? err.message : err);
      finalReply = ''; // reset so Groq runs
    }
  }

  // ── Groq fallback (OpenAI-compatible API) ────────────────────────────────
  if (!finalReply) {
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {

    try {
      // Convert tools to OpenAI format
      const groqTools = TOOLS.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));

      // Convert messages to OpenAI format
      const groqMessages: { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string }[] = [
        { role: 'system', content: systemText },
        ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      ];

      for (let i = 0; i < 20; i++) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL_ID || 'llama3-groq-70b-8192-tool-use-preview',
            messages: groqMessages,
            tools: groqTools,
            tool_choice: 'auto',
            max_tokens: 2048,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('[chat] Groq error:', err);
          break;
        }

        const data = await res.json();
        const choice = data.choices?.[0];
        if (!choice) break;

        const msg = choice.message;

        // End turn — plain text reply
        if (choice.finish_reason === 'stop' || !msg.tool_calls?.length) {
          finalReply = msg.content ?? '';
          break;
        }

        // Tool call
        if (msg.tool_calls?.length) {
          groqMessages.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls });

          for (const toolCall of msg.tool_calls) {
            const toolName = toolCall.function.name;
            const toolInput = JSON.parse(toolCall.function.arguments ?? '{}');

            const toolResult = toolName === 'reassign_task'
              ? await executeReassignTool(toolInput, person.id, supabase)
              : await executeTool(toolInput, person.id, supabase);

            groqMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: toolResult,
            });
          }
          continue;
        }

        break;
      }
    } catch (err) {
      console.error('[chat] Groq failed:', err instanceof Error ? err.message : err);
    }
    } // end groqKey check
  }

  // ── Gemini fallback ──────────────────────────────────────────────────────
  if (!finalReply) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        // Convert tools to Gemini function declarations format
        const geminiTools = [{
          functionDeclarations: TOOLS.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.input_schema,
          })),
        }];

        const geminiMessages = messages.map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        for (let i = 0; i < 20; i++) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemText }] },
                contents: geminiMessages,
                tools: geminiTools,
                tool_config: { function_calling_config: { mode: 'AUTO' } },
              }),
            }
          );

          if (!res.ok) {
            console.error('[chat] Gemini error:', await res.text());
            break;
          }

          const data = await res.json();
          const candidate = data.candidates?.[0];
          if (!candidate) break;

          const parts = candidate.content?.parts ?? [];
          const textPart = parts.find((p: any) => p.text);
          const funcPart = parts.find((p: any) => p.functionCall);

          if (!funcPart) {
            finalReply = textPart?.text ?? '';
            break;
          }

          // Function call
          const toolName = funcPart.functionCall.name;
          const toolInput = funcPart.functionCall.args ?? {};

          const toolResult = toolName === 'reassign_task'
            ? await executeReassignTool(toolInput, person.id, supabase)
            : await executeTool(toolInput, person.id, supabase);

          // Add assistant + tool result to messages
          geminiMessages.push({ role: 'model', parts });
          geminiMessages.push({
            role: 'user',
            parts: [{ functionResponse: { name: toolName, response: { content: toolResult } } }],
          });
          continue;
        }
      } catch (err) {
        console.error('[chat] Gemini failed:', err instanceof Error ? err.message : err);
      }
    }
  }

  return NextResponse.json({ reply: finalReply || 'Something went wrong. All AI services unavailable.' });
}
