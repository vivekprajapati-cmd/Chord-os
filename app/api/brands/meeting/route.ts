import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const DEPARTMENTS: Record<string, string> = {
  design: 'Creative',
  copy: 'Creative',
  video: 'Video',
  seo: 'SEO',
  content: 'Content',
  strategy: 'Account',
  other: 'Creative',
};

function buildExtractionPrompt(
  brandName: string,
  brandVoice: string | null,
  existingKnowledge: Record<string, unknown>,
  rawNotes: string
): string {
  const rules = existingKnowledge?.rules as unknown[] | undefined;
  const knowledgeContext = rules?.length
    ? `\n\nExisting brand knowledge:\n${JSON.stringify(rules, null, 2)}`
    : '';

  return `You are the brand brain for ${brandName}, a creative agency tool.
${brandVoice ? `Brand voice: ${brandVoice}` : ''}${knowledgeContext}

A POC just logged notes from a client meeting. Extract structured data from them.

Return ONLY valid JSON with this exact shape:
{
  "summary": "2-3 sentence plain-English summary of what was discussed and decided",
  "decisions": [
    { "text": "Decision text", "impact": "high|medium|low" }
  ],
  "tasks_suggested": [
    {
      "deliverable": "Specific deliverable name",
      "task_type": "design|copy|video|seo|content|strategy|other",
      "estimated_hours": 3,
      "priority": "P0|P1|P2",
      "assignee_role": "Art Director|Copywriter|Video Editor|etc",
      "brief": "Full brief for the art team — what the client wants, tone, references mentioned, what to avoid"
    }
  ],
  "knowledge_delta": [
    {
      "rule": "Specific rule or preference learned",
      "category": "tone|visual|process|hard_no"
    }
  ],
  "contacts": [
    { "name": "Contact name", "role": "Their role at the brand" }
  ]
}

Rules:
- tasks_suggested should be concrete, actionable deliverables — not vague
- brief must be rich enough that someone who wasn't in the meeting understands exactly what's needed
- knowledge_delta should only include NEW learnings — skip anything already in existing knowledge
- hard_no category = things the client has explicitly rejected or hates
- If no new rules were learned, return empty array for knowledge_delta

Meeting notes:
${rawNotes}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: person } = await supabase
    .from('people')
    .select('id, is_team_lead')
    .eq('email', user.email!)
    .maybeSingle();

  if (!person?.is_team_lead) {
    return NextResponse.json({ error: 'Only team leads can log meetings.' }, { status: 403 });
  }

  const body = await req.json();
  const { brand_slug, raw_notes, meeting_date, action } = body;

  // Fetch brand with knowledge
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, voice_summary, knowledge')
    .eq('slug', brand_slug)
    .maybeSingle();

  if (!brand) return NextResponse.json({ error: 'Brand not found.' }, { status: 404 });

  // ── STEP 1: Extract (returns preview, doesn't save yet) ──
  if (action === 'extract') {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set. Add it to .env.local and restart.' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const model = process.env.ANTHROPIC_MODEL_ID || 'claude-haiku-4-5-20251001';

    let text = '';
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: buildExtractionPrompt(
              brand.name,
              brand.voice_summary,
              (brand.knowledge as Record<string, unknown>) ?? {},
              raw_notes
            ),
          },
        ],
      });
      text = response.content.find(c => c.type === 'text')?.text ?? '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Anthropic API error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    let extracted: Record<string, unknown> = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON. Try again.' }, { status: 500 });
    }

    return NextResponse.json({ extracted, brand_id: brand.id });
  }

  // ── STEP 2: Confirm — save meeting + create tasks + update knowledge ──
  if (action === 'confirm') {
    const { extracted, tasks_to_create } = body;
    const admin = createAdminClient();

    // Save meeting record
    const { data: meeting, error: meetingErr } = await admin
      .from('brand_meetings')
      .insert({
        brand_id: brand.id,
        logged_by_id: person.id,
        meeting_date: meeting_date || new Date().toISOString().split('T')[0],
        raw_notes,
        ai_summary: extracted.summary,
        decisions: extracted.decisions ?? [],
        tasks_suggested: extracted.tasks_suggested ?? [],
        knowledge_delta: extracted.knowledge_delta ?? [],
        tasks_confirmed: true,
      })
      .select('id')
      .single();

    if (meetingErr || !meeting) {
      return NextResponse.json({ error: meetingErr?.message ?? 'Failed to save meeting.' }, { status: 500 });
    }

    // Create confirmed tasks
    const createdTasks: string[] = [];
    for (const t of (tasks_to_create as Array<Record<string, unknown>>) ?? []) {
      // Find owner by department
      const dept = DEPARTMENTS[t.task_type as string] ?? 'Creative';
      const { data: candidates } = await supabase
        .from('people')
        .select('id, name')
        .eq('department', dept)
        .not('seniority', 'in', '("Intern","Trainee")')
        .limit(5);

      // Pick the assignee_id from the task if provided, else first candidate
      const owner_id = (t.owner_id as string) || candidates?.[0]?.id;
      if (!owner_id) continue;

      const deadline = t.deadline as string | undefined;

      const { data: task } = await admin
        .from('tasks')
        .insert({
          brand_id: brand.id,
          meeting_id: meeting.id,
          deliverable: t.deliverable,
          task_type: t.task_type,
          owner_id,
          assigned_by_id: person.id,
          priority: t.priority ?? 'P1',
          estimated_hours: t.estimated_hours,
          brief: t.brief,
          status: 'scheduled',
          deadline: deadline || null,
          notes: t.brief as string,
        })
        .select('id')
        .single();

      if (task) {
        createdTasks.push(task.id);
        if (deadline) {
          const endAt = new Date(deadline).toISOString();
          const startAt = new Date(
            new Date(deadline).getTime() - Number(t.estimated_hours) * 3600000
          ).toISOString();
          await admin.from('blocks').insert({
            task_id: task.id,
            person_id: owner_id,
            start_at: startAt,
            end_at: endAt,
            status: 'scheduled',
          });
        }
      }
    }

    // Merge new knowledge into brand.knowledge
    const existingKnowledge = (brand.knowledge as Record<string, unknown[]>) ?? { rules: [], rejections: [], approvals: [], contacts: [] };
    const newRules = (extracted.knowledge_delta as Array<{ rule: string; category: string }>) ?? [];
    const newContacts = (extracted.contacts as Array<Record<string, string>>) ?? [];

    const mergedRules = [
      ...(existingKnowledge.rules ?? []),
      ...newRules.map(r => ({
        ...r,
        meeting_id: meeting.id,
        date: new Date().toISOString().split('T')[0],
      })),
    ];

    const mergedContacts = [
      ...(existingKnowledge.contacts ?? []),
      ...newContacts.filter(
        nc => !(existingKnowledge.contacts as Array<{ name: string }>)
          ?.some(ec => ec.name.toLowerCase() === nc.name.toLowerCase())
      ),
    ];

    await admin
      .from('brands')
      .update({
        knowledge: {
          ...existingKnowledge,
          rules: mergedRules,
          contacts: mergedContacts,
        },
      })
      .eq('id', brand.id);

    return NextResponse.json({
      meeting_id: meeting.id,
      tasks_created: createdTasks.length,
    });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
