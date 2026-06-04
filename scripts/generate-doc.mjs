import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, Header, Footer, PageNumber, LevelFormat } from 'docx';
import { writeFileSync } from 'fs';

const CORAL = 'E55D4A';
const INK = '2B2B2B';
const GRAY = '7A7468';
const LIGHT = 'F5EBDD';
const WHITE = 'FFFFFF';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: CORAL };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, font: 'Poppins', size: 36, bold: true, color: INK })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, font: 'Poppins', size: 28, bold: true, color: INK })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: 'Poppins', size: 24, bold: true, color: CORAL })],
  });
}

function p(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, font: 'Nunito', size: 22, color: INK, ...options })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Nunito', size: 22, color: INK })],
  });
}

function gap(size = 1) {
  return new Paragraph({ spacing: { before: size * 80, after: 0 }, children: [new TextRun('')] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function tableHeader(cols, widths) {
  return new TableRow({
    tableHeader: true,
    children: cols.map((col, i) => new TableCell({
      borders: headerBorders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: CORAL, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: col, font: 'Poppins', size: 20, bold: true, color: WHITE })] })],
    })),
  });
}

function tableRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((cell, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: shade ? 'FAF7F2' : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), font: 'Nunito', size: 20, color: INK })] })],
    })),
  });
}

function makeTable(headers, rows, widths) {
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      tableHeader(headers, widths),
      ...rows.map((row, i) => tableRow(row, widths, i % 2 === 1)),
    ],
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Nunito', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Poppins', color: INK },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Poppins', color: INK },
        paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Poppins', color: CORAL },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: CORAL, space: 4 } },
          children: [
            new TextRun({ text: 'Harmony — Chord x 1702 Digital', font: 'Poppins', size: 18, bold: true, color: CORAL }),
            new TextRun({ text: '\t', font: 'Nunito', size: 18 }),
            new TextRun({ text: 'Internal Project Documentation', font: 'Nunito', size: 18, color: GRAY }),
          ],
          tabStops: [{ type: 'right', position: 9026 }],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } },
          children: [
            new TextRun({ text: 'Confidential — 1702 Digital + Chord', font: 'Nunito', size: 16, color: GRAY }),
            new TextRun({ text: '\t', font: 'Nunito', size: 16 }),
            new TextRun({ text: 'Page ', font: 'Nunito', size: 16, color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Nunito', size: 16, color: GRAY }),
          ],
          tabStops: [{ type: 'right', position: 9026 }],
        })],
      }),
    },
    children: [

      // ─── COVER ────────────────────────────────────────────────────────────
      new Paragraph({
        spacing: { before: 1440, after: 240 },
        children: [new TextRun({ text: 'HARMONY', font: 'Poppins', size: 72, bold: true, color: CORAL })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: 'Ops & Creative Task Automation System', font: 'Poppins', size: 36, color: INK })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'Internal Project Documentation', font: 'Nunito', size: 24, color: GRAY })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: CORAL, space: 8 } },
        children: [new TextRun({ text: '', font: 'Nunito', size: 24 })],
      }),
      gap(2),
      makeTable(
        ['Field', 'Value'],
        [
          ['Organisation', 'Chord / 1702 Digital'],
          ['Project Name', 'Harmony'],
          ['Version', 'v1.0 — Production Ready'],
          ['Date', 'June 2026'],
          ['Status', 'Feature-Complete MVP'],
          ['Prepared by', 'Darshit Raut, Founders Office'],
          ['Audience', 'Engineering · Ops · Brand · Creative'],
        ],
        [3000, 6026]
      ),
      pageBreak(),

      // ─── 1. OVERVIEW ──────────────────────────────────────────────────────
      h1('1. Project Overview'),
      p('Harmony is an internal operations and AI workspace built for the 19-person team at 1702 Digital and Chord. It eliminates manual task tracking, reduces coordination overhead, and creates a single source of truth for all work across the Ops and Creative teams.'),
      gap(),
      p('The system allows team leads to assign tasks using natural language ("Block Vineet 3hrs for IndiaGate reel, due 8 June") — the AI parses the instruction, creates the task, blocks the calendar, and notifies the team via Slack. Team members see their tasks, track submissions, and communicate status — all in one place.'),
      gap(),
      h3('Core Goals'),
      bullet('Zero manual data entry for task allocation'),
      bullet('Single source of truth for all work status'),
      bullet('AI-powered allocation with context awareness'),
      bullet('Real-time Slack notifications on every state change'),
      bullet('Mobile-first, accessible on any device'),
      gap(),
      h3('Team'),
      makeTable(
        ['Role', 'Access', 'Key Capabilities'],
        [
          ['Team Lead', 'Full access', 'Chat allocator, all tasks, approve/reject, analytics, team management'],
          ['Staff / Creative', 'Own tasks only', 'View assigned tasks, acknowledge, submit work, calendar'],
          ['Reviewer', 'Tasks where reviewer', 'Approve or request rework on assigned review tasks'],
        ],
        [2500, 2000, 4526]
      ),
      pageBreak(),

      // ─── 2. TECH STACK ────────────────────────────────────────────────────
      h1('2. Tech Stack'),
      makeTable(
        ['Layer', 'Technology', 'Purpose'],
        [
          ['Frontend', 'Next.js 16 + React 19', 'Full-stack framework, SSR, API routes'],
          ['Styling', 'Tailwind CSS v4', 'Utility-first CSS, responsive design'],
          ['Database', 'Supabase (PostgreSQL)', 'Primary data store, auth, realtime, RLS'],
          ['Authentication', 'Slack OAuth (OIDC)', 'SSO via 1702 Digital Slack workspace'],
          ['AI — Primary', 'Anthropic Claude Sonnet', 'Chat allocator, meeting extraction'],
          ['AI — Fallback 1', 'Groq Llama3 70B Tool Use', 'Free fallback with function calling'],
          ['AI — Fallback 2', 'Google Gemini 2.5 Flash', 'Second fallback via Gemini API'],
          ['Notifications', 'Slack Incoming Webhooks', 'All state changes fire to #1702fam'],
          ['Calendar', 'Google Calendar API', 'Read/write events on personal calendars'],
          ['Deployment', 'Hostinger Node.js', 'Production hosting'],
          ['Cron', 'cron-job.org', 'Daily delay check at 9am IST'],
          ['Font', 'Poppins + Nunito + JetBrains Mono', 'Brand typography stack'],
        ],
        [2200, 2800, 4026]
      ),
      gap(),
      h3('AI Fallback Chain'),
      p('The allocator tries AI providers in order:'),
      bullet('Anthropic Claude Sonnet — primary, best quality, prompt caching enabled'),
      bullet('Groq Llama3 70B Tool Use — free fallback, excellent function calling'),
      bullet('Google Gemini 2.5 Flash — second fallback, free tier'),
      bullet('If all fail — returns clear error message to user'),
      pageBreak(),

      // ─── 3. FEATURES ──────────────────────────────────────────────────────
      h1('3. Built Features'),

      h2('3.1 Authentication'),
      bullet('Slack OAuth login — restricted to 1702 Digital workspace'),
      bullet('Auto-creates people row on first login from Slack profile'),
      bullet('Default access: staff. Leads set manually in Supabase'),
      bullet('Session managed via Supabase cookies'),
      gap(),

      h2('3.2 Dashboard'),
      bullet('Greeting based on time of day'),
      bullet('Stat cards: Blocks today, In Progress, Hours Remaining, Awaiting Approval'),
      bullet('Daily capacity: 9h default, shows remaining hours after blocks'),
      bullet('Upcoming blocks list — today or next 7 days if today is empty'),
      bullet('Review queue alert — coral red when tasks await approval'),
      gap(),

      h2('3.3 Chat Allocator (AI)'),
      bullet('Natural language task assignment — plain English, casual or formal'),
      bullet('Bulk morning allocation — multiple people in one message'),
      bullet('Reassignment via chat — "move X to Y"'),
      bullet('Due date required, hours optional (asks once)'),
      bullet('References optional (asks once)'),
      bullet('Conflict detection — blocks if time slot already taken'),
      bullet('Daily capacity check — warns if 9h daily limit exceeded'),
      bullet('Brand brain context — rules, voice, meeting decisions fed to AI'),
      bullet('Reviewer assignment — "Pierre reviews this"'),
      gap(),

      h2('3.4 Tasks'),
      bullet('Grouped by status: In Progress, Scheduled, Review Queue, Delayed, Done'),
      bullet('Leads see all tasks; Staff see only own tasks'),
      bullet('Submit button on each task — paste URL, moves to review queue'),
      bullet('Edit modal — change deliverable, assignee, reviewer, priority, status, hours, deadline'),
      bullet('Block transfer on reassign — old block cancelled, new one created'),
      bullet('Conflict detection on task creation via Tasks tab'),
      gap(),

      h2('3.5 Calendar'),
      bullet('Week view with day selector — auto-selects today on load'),
      bullet('Task blocks shown per day'),
      bullet('Google Calendar events shown alongside task blocks'),
      bullet('Join Meet button on Google Meet events'),
      bullet('Daily capacity bar — Xh remaining of 9h'),
      bullet('Connect Google Calendar button — one-time OAuth per user'),
      bullet('Context modal on block click — brand colors, voice, references, submit, approve'),
      bullet('Realtime updates via Supabase subscriptions'),
      gap(),

      h2('3.6 Context Modal'),
      bullet('Brand colors, typography, voice shown per task'),
      bullet('Acknowledge button — assignee confirms task seen → Slack notified'),
      bullet('Mark Done + submission URL — required before moving to review'),
      bullet('Revision round counter'),
      bullet('Approve / Rework buttons — reviewer only'),
      bullet('Rework notes required — stored in task_revisions table'),
      bullet('Revision threshold alert at round 3+'),
      gap(),

      h2('3.7 Brands'),
      bullet('Brand list with color swatches'),
      bullet('Brand detail — colors, typography, tone & voice, active tasks'),
      bullet('Edit brand modal — leads only, color picker, font fields, voice text'),
      bullet('Add brand modal — leads only, auto-generates slug from name'),
      bullet('Log meeting — AI extracts tasks, decisions, brand rules from raw notes'),
      bullet('Manual meeting summary — fallback when no AI key configured'),
      bullet('Meeting history with link to Briefings'),
      gap(),

      h2('3.8 Briefings'),
      bullet('Meeting notes feed — all brands or filtered by brand'),
      bullet('Shows: AI summary, action items by impact level, tasks, new brand rules'),
      bullet('Clickable brand links → brand detail page'),
      gap(),

      h2('3.9 Analytics'),
      bullet('Leads see full team breakdown; Staff see own stats only'),
      bullet('Per-member: active tasks, total, completed, on-time rate, delays, avg turnaround'),
      bullet('Team-wide summary cards'),
      bullet('Export to Excel (.xlsx) — two sheets: Summary + Member Breakdown'),
      bullet('Export to PDF — browser print'),
      bullet('Rows with 3+ delays highlighted in coral red'),
      gap(),

      h2('3.10 Team'),
      bullet('Full team list grouped by department'),
      bullet('Add Person modal — name, email, role, department, seniority, team lead toggle'),
      bullet('Staff self-onboard via Slack login — no manual seeding needed'),
      bullet('Edit profile — each user can update their own name, role, department, location'),
      gap(),

      h2('3.11 Slack Notifications'),
      makeTable(
        ['Event', 'Trigger', 'Message'],
        [
          ['Task assigned', 'Chat allocator', '📅 New block — Person blocked Xh for Brand'],
          ['Acknowledged', 'Assignee taps Acknowledge', '👀 Acknowledged — Person confirmed task'],
          ['Submitted', 'Assignee marks done + URL', '📎 Submitted — Person submitted task. Reviewer to review.'],
          ['Approved', 'Reviewer approves', '✅ Approved — task approved, ready to ship'],
          ['Rework requested', 'Reviewer clicks Rework', '🔄 Rework (Round N) — notes included'],
          ['Reassigned', 'Lead reassigns via chat or edit', '🔁 Reassigned — from → to → by'],
          ['Delayed', '9am IST daily cron', '⚠️ Delayed — task is N days overdue'],
          ['24h reminder', '9am IST daily cron', '⏰ Due in 24h — submit before deadline'],
          ['Repeat delay', '9am IST daily cron', '🚨 Repeat delay — 3+ delays this month'],
          ['Revision alert', 'Reviewer requests 3+ rounds', '🚩 Revision alert — escalate to manager'],
        ],
        [2000, 2500, 4526]
      ),
      pageBreak(),

      // ─── 4. DATABASE ──────────────────────────────────────────────────────
      h1('4. Database Schema'),
      p('All data lives in Supabase (PostgreSQL). Row Level Security (RLS) is enabled on all tables. SQL files to run in order:'),
      bullet('schema.sql — all tables + RLS policies'),
      bullet('seed.sql — 4 brands (IndiaGate, TrueSilver, AlphaKid, Vadilal)'),
      bullet('features-patch.sql — acknowledgment, submission, revision tracking, member_stats view'),
      gap(),

      h2('4.1 Core Tables'),
      makeTable(
        ['Table', 'Key Columns', 'Purpose'],
        [
          ['people', 'id, name, email, role, department, is_team_lead, google_refresh_token, default_hours_per_day', 'All team members'],
          ['brands', 'id, slug, name, category, tier, colors, typography, voice_summary, knowledge', 'Client brands + brand brain'],
          ['tasks', 'id, brand_id, owner_id, reviewer_id, deliverable, status, priority, estimated_hours, deadline, start_date, submission_link, submitted_at, on_time, revision_round, delay_count', 'Core work units'],
          ['blocks', 'id, task_id, person_id, start_at, end_at, status, actual_hours', 'Calendar time blocks'],
          ['task_references', 'id, task_id, ref_type, url, caption', 'Figma/Miro/reference links per task'],
          ['task_revisions', 'id, task_id, round, submission_link, feedback_notes, reviewed_by_id', 'Rework round history'],
          ['brand_meetings', 'id, brand_id, meeting_date, ai_summary, decisions, tasks_suggested, knowledge_delta, tasks_confirmed, raw_notes', 'Client meeting notes'],
          ['activity_log', 'id, actor_id, action, task_id, details', 'Full audit trail'],
        ],
        [2000, 3500, 3526]
      ),
      gap(),

      h2('4.2 Views'),
      makeTable(
        ['View', 'Purpose'],
        [
          ['member_stats', 'Auto-calculated per-person analytics — total tasks, completed, on-time rate, delays, avg turnaround, active tasks'],
        ],
        [2500, 6526]
      ),
      gap(),

      h2('4.3 Task Status Flow'),
      p('scheduled → in_progress → ready_for_review → approved / done'),
      p('Cancelled is a terminal state at any stage.'),
      gap(),

      h2('4.4 RLS Policies'),
      makeTable(
        ['Table', 'Read', 'Write'],
        [
          ['people', 'All authenticated users', 'Own row only (via API route using service role)'],
          ['brands', 'All authenticated users', 'Team leads only'],
          ['tasks', 'All authenticated users', 'Owner, assigner, reviewer, or team lead'],
          ['blocks', 'All authenticated users', 'Block owner or team lead'],
          ['brand_meetings', 'All authenticated users', 'All authenticated users'],
          ['task_revisions', 'All authenticated users', 'All authenticated users'],
        ],
        [2000, 2800, 4226]
      ),
      pageBreak(),

      // ─── 5. API ROUTES ────────────────────────────────────────────────────
      h1('5. API Routes'),
      makeTable(
        ['Route', 'Method', 'Auth', 'Purpose'],
        [
          ['/api/auth/callback', 'GET', 'Public', 'Slack OAuth callback — creates people row on first login'],
          ['/api/auth/logout', 'GET', 'User', 'Signs out and redirects to login'],
          ['/api/auth/google', 'GET', 'User', 'Initiates Google Calendar OAuth'],
          ['/api/auth/google/callback', 'GET', 'User', 'Stores Google refresh token after Calendar auth'],
          ['/api/chat', 'POST', 'Lead only', 'AI chat allocator — creates tasks, reassigns, bulk assigns'],
          ['/api/tasks', 'POST', 'Lead only', 'Creates task from Tasks tab with conflict detection'],
          ['/api/brands/meeting', 'POST', 'Lead only', 'Logs meeting notes, extracts with AI'],
          ['/api/brands/update', 'PATCH', 'Lead only', 'Updates brand colors, typography, voice'],
          ['/api/brands/create', 'POST', 'Lead only', 'Creates new brand'],
          ['/api/people/me', 'PATCH', 'User', 'Updates own profile (name, role, department, location)'],
          ['/api/slack/notify', 'POST', 'Internal', 'Fires Slack webhook for various event types'],
          ['/api/calendar/google-events', 'GET', 'User', 'Fetches Google Calendar events for the week'],
          ['/api/capacity', 'GET/POST', 'User', 'Daily capacity — blocked hours vs 9h limit'],
          ['/api/cron/delay-check', 'GET', 'CRON_SECRET', 'Daily 9am IST — checks overdue tasks, fires Slack'],
        ],
        [2800, 1000, 1400, 3826]
      ),
      pageBreak(),

      // ─── 6. INTEGRATIONS ──────────────────────────────────────────────────
      h1('6. Integrations'),

      h2('6.1 Slack'),
      bullet('App: Created in 1702 Digital Slack workspace'),
      bullet('Login: Slack OIDC OAuth — workspace restriction enforces access control'),
      bullet('Notifications: Incoming webhook to #1702fam'),
      bullet('Auto-creates people row on first login using Slack profile name/email'),
      gap(),

      h2('6.2 Google Calendar'),
      bullet('Separate OAuth from Slack login — user connects once via Calendar page'),
      bullet('OAuth app created under @1702digital.com Google Workspace (Internal mode — no approval needed)'),
      bullet('Refresh token stored in people.google_refresh_token'),
      bullet('On task assignment: creates event on assignee\'s Google Calendar'),
      bullet('On calendar view: fetches user\'s Google Calendar events for the week'),
      bullet('Events show alongside task blocks with Join Meet button'),
      gap(),

      h2('6.3 AI Providers'),
      makeTable(
        ['Provider', 'Model', 'Usage', 'Cost'],
        [
          ['Anthropic', 'Claude Sonnet 4.6', 'Primary — chat allocator + meeting extraction', 'Paid (prompt caching enabled)'],
          ['Groq', 'Llama3 70B Tool Use', 'Fallback 1 — auto on Anthropic failure', 'Free tier'],
          ['Google Gemini', 'Gemini 2.5 Flash', 'Fallback 2 — auto on Groq failure', 'Free tier (Workspace account)'],
        ],
        [2000, 2500, 2800, 1726]
      ),
      pageBreak(),

      // ─── 7. DEPLOYMENT ────────────────────────────────────────────────────
      h1('7. Deployment'),

      h2('7.1 Environment Variables'),
      makeTable(
        ['Variable', 'Required', 'Description'],
        [
          ['NEXT_PUBLIC_SUPABASE_URL', 'Yes', 'Supabase project URL'],
          ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Yes', 'Supabase anon public key'],
          ['SUPABASE_SERVICE_ROLE_KEY', 'Yes', 'Supabase service role key (bypasses RLS)'],
          ['ANTHROPIC_API_KEY', 'Optional', 'Primary AI key — falls back to Groq if absent'],
          ['GROQ_API_KEY', 'Optional', 'Fallback AI key — free at console.groq.com'],
          ['GEMINI_API_KEY', 'Optional', 'Second fallback — from @1702digital.com Google account'],
          ['SLACK_WEBHOOK_URL', 'Yes', 'Incoming webhook URL for #1702fam'],
          ['GOOGLE_CLIENT_ID', 'Yes', 'Google Calendar OAuth Client ID'],
          ['GOOGLE_CLIENT_SECRET', 'Yes', 'Google Calendar OAuth Client Secret'],
          ['NEXT_PUBLIC_APP_URL', 'Yes', 'Production URL e.g. https://chord-os.theampmworld.com'],
          ['CRON_SECRET', 'Yes', 'Random string to secure cron endpoint'],
        ],
        [3000, 1000, 5026]
      ),
      gap(),

      h2('7.2 Deployment Steps'),
      bullet('Host: Hostinger Node.js hosting (not shared hosting)'),
      bullet('Node version: 20 (set in Hostinger panel)'),
      bullet('Build: npm install → npm run build → npm start'),
      bullet('Cron: Set up cron-job.org to hit /api/cron/delay-check at 3:30am UTC (9am IST) daily with Authorization: Bearer {CRON_SECRET}'),
      gap(),

      h2('7.3 Supabase Setup'),
      bullet('Run schema.sql in SQL Editor'),
      bullet('Run seed.sql (brands only — people self-onboard via Slack)'),
      bullet('Run features-patch.sql'),
      bullet('Run ALTER TABLE for start_date, meeting_id, google_refresh_token, google_calendar_connected, knowledge columns'),
      bullet('Enable Slack OIDC provider in Authentication → Providers → Slack'),
      bullet('Add production URL to Authentication → URL Configuration → Redirect URLs'),
      pageBreak(),

      // ─── 8. USER FLOWS ────────────────────────────────────────────────────
      h1('8. User Flows'),

      h2('8.1 Team Lead — Morning Allocation'),
      makeTable(
        ['Step', 'Action', 'System Response'],
        [
          ['1', 'Lead opens Harmony → Chat (Allocator)', 'AI ready with live team context — active task load, brand rules, recent meetings'],
          ['2', 'Types: "Block Vineet 3hrs for IndiaGate reel, due 8 June"', 'AI parses intent — resolves Vineet, IndiaGate, 3h, deadline'],
          ['3', 'AI asks for references if not provided', 'Lead pastes Figma URL or skips'],
          ['4', 'AI calls create_task_and_block', 'Task created, calendar block assigned, Google Calendar event created'],
          ['5', 'AI confirms assignment', 'Slack fires to #1702fam: New block notification'],
          ['6', 'Lead repeats for next person', 'Bulk allocation — all in one session'],
        ],
        [500, 3800, 4726]
      ),
      gap(),

      h2('8.2 Staff — Task Lifecycle'),
      makeTable(
        ['Step', 'Action', 'System Response'],
        [
          ['1', 'Staff logs in via Slack', 'Auto-creates people row on first login. Lands on Dashboard.'],
          ['2', 'Sees task on Dashboard or Tasks tab', 'Task shows with brand, deliverable, priority, deadline'],
          ['3', 'Opens Calendar — clicks task block', 'Context modal: brand colors, voice, references, notes'],
          ['4', 'Clicks Acknowledge', 'Slack fires: Acknowledged notification'],
          ['5', 'Clicks Submit — pastes URL', 'Task moves to ready_for_review. Slack notifies reviewer.'],
          ['6', 'Task shows "In review"', 'Awaiting reviewer action'],
        ],
        [500, 3800, 4726]
      ),
      gap(),

      h2('8.3 Reviewer — Approval Flow'),
      makeTable(
        ['Step', 'Action', 'System Response'],
        [
          ['1', 'Reviewer sees task in Review Queue', 'Only tasks where they are set as reviewer'],
          ['2', 'Opens context modal — reviews submission link', 'Brand brief, revision history shown'],
          ['3a', 'Clicks Approve', 'Task approved. Slack fires. Assignee notified.'],
          ['3b', 'Clicks Rework + types notes', 'Round counter increments. Slack fires with notes.'],
          ['4 (3+ rounds)', 'Third rework requested', 'Additional Slack: Revision alert — escalate to manager'],
        ],
        [500, 3800, 4726]
      ),
      gap(),

      h2('8.4 Lead — Brand Meeting Flow'),
      makeTable(
        ['Step', 'Action', 'System Response'],
        [
          ['1', 'Brands → Select brand → Log meeting', 'Meeting form opens'],
          ['2', 'Paste raw meeting notes', 'Free-text, no structure needed'],
          ['3', 'Click Extract with AI', 'AI extracts: summary, decisions, tasks, brand rules'],
          ['4', 'Review and edit extracted data', 'Toggle tasks, edit briefs, set deadlines'],
          ['5', 'Click Confirm', 'Meeting saved, tasks created, brand knowledge updated'],
          ['6', 'Next allocator use for this brand', 'AI auto-includes meeting context in reasoning'],
        ],
        [500, 3800, 4726]
      ),
      gap(),

      h2('8.5 Role-Based Access Summary'),
      makeTable(
        ['Feature', 'Team Lead', 'Staff', 'Reviewer (non-lead)'],
        [
          ['Dashboard', 'All stats + full team', 'Own stats only', 'Own stats only'],
          ['Tasks', 'All tasks + Edit', 'Own tasks only', 'Own + review tasks'],
          ['Chat Allocator', 'Yes', 'No', 'No'],
          ['Calendar', 'Full + add via Chat', 'Own + Google sync', 'Own + Google sync'],
          ['Brands', 'View + Edit + Add + Log meeting', 'View only', 'View only'],
          ['Briefings', 'View all', 'View all', 'View all'],
          ['Team', 'View all + Add person', 'No', 'No'],
          ['Analytics', 'Full team + export', 'Own stats only', 'Own stats only'],
          ['Approve/Reject', 'Yes (if reviewer)', 'No', 'Yes (assigned tasks)'],
        ],
        [2800, 1800, 1800, 2626]
      ),
      pageBreak(),

      // ─── 9. FUTURE SCOPE ──────────────────────────────────────────────────
      h1('9. Future Scope'),

      h2('8.1 Pending from Current Build'),
      makeTable(
        ['Feature', 'Priority', 'Notes'],
        [
          ['Reviewer assignment flow improvement', 'High', 'Auto-suggest reviewer by role/department when allocating'],
          ['Rejection notes visible to assignee', 'High', 'Rework notes fire to Slack but not shown in assignee task view'],
          ['Creative capacity dashboard', 'Medium', 'Visual bandwidth panel — active hours per person before assigning'],
          ['Briefings → Confirm tasks button', 'Medium', 'Convert meeting-suggested tasks to real tasks in one click'],
          ['AI gates enforcement', 'Medium', 'Schema ready, UI pending — block approval for tier-1 brands failing quality checks'],
          ['DM to assignee on Slack', 'Medium', 'Requires Slack Bot token (currently webhook only — channel posts only)'],
          ['PWA icons', 'Low', 'Add icon-192.png + icon-512.png to /public for mobile install badge'],
          ['Standup logger', 'Low', 'Daily team standup summary auto-generated from task status'],
        ],
        [3000, 1200, 4826]
      ),
      gap(),

      h2('8.2 Phase 2 Features'),
      makeTable(
        ['Feature', 'Description'],
        [
          ['Utilization analytics', 'Average % of daily 9h capacity used per person per week — identify overloaded and underutilized team members'],
          ['Google Calendar sync (reverse)', 'Pull Google Meet and other meetings into Harmony calendar — currently one-way only'],
          ['Bulk morning allocation', 'Already partially built — refine UX for daily standup allocation in one message'],
          ['Client portal (read-only)', 'Brand clients can view task status, delivery timelines without accessing internal tools'],
          ['Asset version control', 'Track v1/v2/v3 deliverable files per task with feedback per version'],
          ['Overdue escalation', 'Auto-escalate to department lead after 2 days overdue — currently only Slack alert'],
          ['Monthly auto-report email', 'Send analytics report to leads every 1st of month via email'],
          ['Multi-workspace support', 'Extend to support multiple Slack workspaces for agency group expansion'],
          ['AI brief generation', 'From meeting notes, auto-generate full creative brief PDF for art team'],
          ['Timesheet export', 'Export actual hours (from blocks) per person per week to Excel for billing'],
        ],
        [3000, 6026]
      ),
      gap(),

      h2('8.3 Infrastructure Scale'),
      bullet('Move from Hostinger to Vercel for automatic CI/CD, edge functions, and built-in cron'),
      bullet('Add Redis caching for member stats and capacity calculations at scale'),
      bullet('Implement database connection pooling (PgBouncer) for production load'),
      bullet('Add error monitoring (Sentry) for production error tracking'),
      bullet('Add rate limiting on AI endpoints to prevent abuse'),
      gap(),

      h2('8.4 Mobile App'),
      bullet('Current PWA is installable but limited — native React Native app for push notifications'),
      bullet('Push notification on task assignment (currently Slack only)'),
      bullet('Offline mode — view cached tasks and calendar without internet'),
      gap(),

      // ─── 9. DESIGN ────────────────────────────────────────────────────────
      pageBreak(),
      h1('9. Design System'),
      makeTable(
        ['Token', 'Hex', 'Usage'],
        [
          ['--cream (background)', '#F5EBDD', 'Page background — Beige Base'],
          ['--paper (cards)', '#FAF7F2', 'Card and panel surfaces — off-white'],
          ['--ink (text)', '#2B2B2B', 'Primary text — Text Charcoal'],
          ['--coral (accent)', '#E55D4A', 'CTAs, highlights, card shadows, error states'],
          ['--cobalt (links)', '#2C7CE5', 'Azure Blue — links, digital accents'],
          ['--lime', '#D8E04D', 'Fresh accent — available for CTAs'],
          ['--orange', '#F2951B', 'Pumpkin — icons, subheadlines'],
          ['--gray', '#7A7468', 'Secondary text, labels'],
          ['--red', '#FF3B2F', 'Error states, hard alerts'],
        ],
        [2500, 1500, 5026]
      ),
      gap(),
      makeTable(
        ['Font Role', 'Font', 'Weight', 'Usage'],
        [
          ['Display', 'Poppins', '600/700 Bold', 'Headlines, page titles, stat numbers'],
          ['Body', 'Nunito', '400/500 Regular', 'All body text, descriptions, form labels'],
          ['Accent', 'Bricolage Grotesque', '500 Medium', 'Pull quotes, callouts, highlights'],
          ['Mono', 'JetBrains Mono', '400', 'Labels, metadata, code, uppercase tags'],
        ],
        [2000, 2500, 2000, 2526]
      ),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  writeFileSync('Harmony_Project_Documentation.docx', buffer);
  console.log('Document created: Harmony_Project_Documentation.docx');
});
