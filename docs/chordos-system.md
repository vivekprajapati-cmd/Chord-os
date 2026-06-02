# ChordOS — System Overview
*For Nikhil Kasturi + Darshit Raut · internal co-builder doc*

---

## What this is

ChordOS is the internal AI-augmented ops workspace for 1702 Digital + Chord. It replaces spreadsheets + WhatsApp + memory as the system of record for task allocation, brand knowledge, and work tracking.

The goal: every deliverable that leaves the agency should have a traceable trail — who assigned it, what the brief said, what the client decided in the last meeting, and whether it violated a brand rule.

---

## Why we built it

The core problem at the agency was **knowledge transfer**. POCs know what the client said. Art team doesn't. Work gets done wrong. Rework happens. Time dies.

ChordOS fixes this by building a **brand brain** that accumulates per-brand rules, decisions, and contacts across every client meeting — and feeds that brain into both the task allocation AI (Allocator) and the meeting extraction flow.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 App Router (server components + client where needed) |
| Database + Auth | Supabase (Postgres + RLS + Google SSO) |
| AI | Anthropic Claude API — Haiku for extraction, Sonnet for allocator |
| Styling | Tailwind v4 + CSS custom properties |
| Notifications | Slack (via webhook) |
| Deploy | Vercel (expected) |

Auth is Google SSO restricted to `@1702digital.com` domain with a whitelist for exceptions (see `app/api/auth/callback/route.ts`).

---

## Architecture

```
User (browser)
    │
    ├── Next.js App Router
    │     ├── (auth) login page — Google SSO via Supabase
    │     └── (app) layout — sidebar, auth guard
    │           ├── /dashboard
    │           ├── /tasks
    │           ├── /calendar
    │           ├── /briefings
    │           ├── /brands/[slug]
    │           ├── /brands/[slug]/meeting  ← meeting log + brain
    │           └── /chat  ← AI allocator (admin only)
    │
    ├── API Routes (/app/api/)
    │     ├── /auth/callback  ← Google callback + auth_user_id link
    │     ├── /chat           ← Allocator: Claude tool-use agentic loop
    │     ├── /brands/meeting ← Extract (Haiku) + Confirm (saves + creates tasks)
    │     └── /tasks          ← Manual task creation
    │
    └── Supabase
          ├── people          ← 19 team members, roles, is_team_lead
          ├── brands          ← 4 active brands + knowledge JSONB
          ├── brand_meetings  ← meeting records + AI extraction output
          ├── tasks           ← deliverables with status, brief, meeting_id
          ├── blocks          ← calendar entries (start_at, end_at per person)
          ├── task_references ← ref URLs per task
          └── activity_log    ← audit trail
```

---

## Key features

### 1. Brand Brain
- POC logs raw meeting notes on `/brands/[slug]/meeting`
- Claude Haiku extracts: summary, decisions (with impact level), tasks, brand rules, contacts
- User reviews + can edit briefs per task, set deadlines
- On confirm: meeting saved, tasks created with full brief + `meeting_id`, brand knowledge JSONB updated
- Knowledge accumulates over time — every subsequent meeting sees the previous rules and only adds deltas

### 2. AI Allocator (`/chat`)
- Claude Sonnet with tool use (`create_task_and_block`)
- System prompt includes: brand brain rules, recent 60 days of meeting summaries, active task load per person
- Conflict detection on calendar blocks
- References (mood boards, storyboards) required before any task is assigned
- Hard_no brand rules enforced — allocator will refuse to violate them
- Slack notification on every task creation

### 3. Calendar Blocks
- Every task has a linked `block` (start_at, end_at, person_id)
- Calendar page shows the week strip + day view with context modal (brand colors, typography, voice, references all visible inline)
- Supabase Realtime subscription on blocks — live updates when someone is assigned work

### 4. Briefings
- Chronological feed of all meeting records across brands
- Shows: summary, high-impact decisions, tasks created, new brand rules per meeting
- Filterable by brand

### 5. Access tiers
Currently uses `is_team_lead` boolean. Migration to 3-tier (`admin` / `poc` / `staff`) ready in `access-tier.sql`.

---

## Data model (key tables)

```sql
people       id, name, email, role, department, seniority, is_team_lead, access_tier
brands       id, slug, name, category, tier, typography, colors, voice_summary, knowledge (JSONB)
brand_meetings  id, brand_id, meeting_date, raw_notes, ai_summary, decisions, tasks_suggested, knowledge_delta
tasks        id, brand_id, deliverable, task_type, owner_id, priority, status, deadline, brief, meeting_id
blocks       id, task_id, person_id, start_at, end_at, status, actual_hours
task_references  id, task_id, ref_type, url
```

---

## AI integration points

| Point | Model | Purpose |
|---|---|---|
| Meeting extraction | Claude Haiku | Parse raw notes → JSON (summary, decisions, tasks, rules) |
| Allocator system prompt | Cached via `cache_control: ephemeral` | Brand brain + team capacity context |
| Allocator tool use | Claude Sonnet (`claude-sonnet-4-6`) | `create_task_and_block` — agentic loop up to 5 steps |
| (Planned) AI co-review | TBD | Flag deliverables against brand guidelines before approval |

---

## Files to know

```
app/
  (app)/
    chat/               ← Allocator page + client
    brands/[slug]/
      page.tsx           ← Brand page with brain panel
      meeting/page.tsx   ← Meeting log (single-page form)
    briefings/page.tsx
    tasks/page.tsx
    calendar/            ← CalendarClient with Realtime
    dashboard/page.tsx

app/api/
  chat/route.ts          ← Agentic allocator
  brands/meeting/route.ts← Extract + confirm flow
  tasks/route.ts         ← Manual task creation

lib/supabase/
  server.ts              ← SSR client (cookie-based)
  client.ts              ← Browser client
  admin.ts               ← Service-role client (bypasses RLS for auth linking)
```

---

## Env vars required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
SLACK_WEBHOOK_URL         (optional — Slack notifications)
ANTHROPIC_MODEL_ID        (optional — defaults to claude-sonnet-4-6)
```

---

## What's next (AI output expansion roadmap)

1. **AI co-review gate** — when a task moves to `ready_for_review`, Claude checks the submitted asset against brand guidelines + hard_no rules. Flags issues, suggests changes. No human reviewer needed for first-pass.

2. **Brand reference packs** — monthly PDF/PPT upload per brand in Supabase Storage. Text extracted and fed into meeting extraction + allocator context.

3. **POC tier activation** — run `access-tier.sql`, set brand solutions team to `poc`. They get meeting logging + full visibility without allocator access.

4. **Storyboard AI generation** — generate rough storyboard from brief via image AI. Attached to task as a reference automatically.

5. **Output analytics** — track estimated vs actual hours, overruns by person + brand, knowledge-base growth over time.

---

## Running locally

```bash
cd projects/chord-os
npm install
# copy .env.local.example → .env.local, fill in Supabase + Anthropic keys
npm run dev
```

Run in Supabase SQL Editor in order:
1. `schema.sql`
2. `rls-patch.sql`
3. `meeting-schema.sql`
4. `seed.sql`
5. `access-tier.sql` (when ready to activate POC tier)
