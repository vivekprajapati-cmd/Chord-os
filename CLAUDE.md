# ChordOS — Project CLAUDE.md

## What This Is

ChordOS is an internal operations platform for Chord, a digital marketing agency. It manages tasks, team capacity, brand briefs, analytics, and creator briefings. Staff log in via Slack OAuth. No public users.

## How to Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Environment variables required (copy from Vercel or ask Vivek):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- `OPENAI_API_KEY` (chat feature)
- `CRON_SECRET` (delay-check cron endpoint security)

## How to Verify

```bash
npx tsc --noEmit    # type check
npm run build       # full build check
```

No automated test suite — verify features manually in browser after changes.

## Stack

- **Framework:** Next.js 15 App Router (TypeScript)
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth via Slack OAuth
- **Styling:** Tailwind CSS + CSS variables (no hardcoded colors)
- **Deployment:** Vercel
  - `main` branch → production Supabase
  - `develop` branch → staging Supabase (separate project, RLS disabled)

## Project Structure

```
app/
  (app)/          # Authenticated app routes (dashboard, tasks, calendar, etc.)
  (auth)/         # Login page
  api/            # API routes (tasks CRUD, Slack notify, cron, capacity, etc.)
  demo/           # Public demo routes (no auth required)
components/       # Shared UI components
lib/supabase/     # Supabase client helpers (client.ts, server.ts, admin.ts)
docs/             # Onboarding docs per team member, brand/system docs
```

## Access Tier System

Stored in `people.access_tier`. Controls what each user can see and do.

| Tier | Who | Access |
|---|---|---|
| `admin` | Vivek, senior leads | Full access to everything |
| `operations` | Ops team (e.g. Trupti) | Full team view on calendar and tasks |
| `lead` | Department leads | Full team view, can assign/edit tasks |
| `staff` | Everyone else | Own tasks only |
| `viewer` | External viewers | Scoped read-only (Pierre + Nimesh teams) |

Check `app/(app)/tasks/page.tsx` and `app/(app)/calendar/page.tsx` for how tier gates data queries.

## Features Overview

### Calendar
- Weekly grid view (Mon–Sun), hours 08:00–22:00.
- **Blocks** are time slots — each block links to one task via `task_id`. Stored in `blocks` table with `start_at`, `end_at`, `person_id`, `status`.
- Admins/leads/operations can switch between team members via a person switcher — loads that person's blocks for the selected week.
- **Flexible tasks** (no fixed time slot) appear as date-range chips above the grid — one chip per day they span.
- **Google Calendar integration** — optional per user. When connected (`google_calendar_connected = true` on people row), the calendar also fetches that user's Google Calendar events via `/api/calendar/google-events` and overlays them. OAuth flow: `/api/auth/google` → Google consent → `/api/auth/google/callback` stores tokens on the people row. Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` env vars.

### Tasks
- Task creation: all tiers can create tasks. Staff are locked to assigning only to themselves.
- Tasks have `flexible` boolean — flexible tasks span a date range, regular tasks have a specific datetime.
- Submission flow: staff submit a URL, status moves to `ready_for_review`, Slack notifies the reviewer.
- Delayed tasks: cron job marks tasks as `delayed` when deadline passes and task is not submitted.

### Briefings
- Stored in `brand_meetings` table, linked to a brand.
- Each briefing contains: AI summary, decisions (with impact level), tasks_suggested, knowledge_delta (brand rules: tone/visual/process/hard_no).
- Logged from a brand page via "Log meeting" — AI processes the notes and fills the structured fields.
- `tasks_confirmed` flag tracks whether suggested tasks have been created from the briefing.

### Chat
- AI chat powered by OpenAI via `/api/chat/route.ts`.
- Visible to all tiers but primarily used by team leads for context queries.

### Operations Tab
- Pinboard of useful internal links (`ops_links` table: title, url, sort_order).
- Only admins can add/reorder/delete links. All other tiers can view and click.

### Analytics
- Shows task completion stats, on-time rate, hours logged.
- Staff see only their own stats. Admins/leads/operations see full team breakdown.

### Team
- People directory — lists all staff with department, role, capacity.
- Admins can edit people records directly from this tab.

## Key Conventions

### Dates and Timezones

- All datetimes stored as UTC in Supabase.
- The app is IST-first (India Standard Time, UTC+5:30).
- Calendar week calculations use IST offset manually: `IST_OFFSET_MS = 5.5 * 60 * 60 * 1000`.
- **Never use `toISOString()` for local date comparisons** — it shifts IST dates back one day. Use `getFullYear()`, `getMonth()`, `getDate()` to build date strings.

### Flexible Tasks

- Tasks with `flexible = true` have no fixed time slot — they span a date range.
- Deadline stored as `T23:59:59Z` (end of day UTC) — no timezone conversion on write.
- Display: show date only (no time) for flexible tasks. Show full datetime for regular tasks.
- Calendar chips for flexible tasks use local date components, not ISO string.

### Slack Notifications

- All Slack notifications go through `/api/slack/notify`.
- **Staging has Slack notifications disabled** — check `SLACK_WEBHOOK_URL` env var is unset on staging Vercel Preview environment.

### Cron

- `/api/cron/delay-check` marks tasks as delayed when deadline has passed.
- Secured with `CRON_SECRET` — caller must send `Authorization: Bearer <secret>` header.
- Runs via cronjob.org hitting the Vercel URL.

## Design System

- **Colors:** CSS variables only (`var(--ink)`, `var(--cream)`, `var(--paper)`, `var(--cobalt)`, `var(--coral)`, `var(--red)`, `var(--gray)`). Never hardcode hex in components.
- **Typography:** Anton (display/headlines), Bricolage Grotesque (body), JetBrains Mono (labels/metadata), Fraunces (italic/editorial).
- **Cards:** 1.5px border, offset shadow `8px 8px 0 var(--ink)`, `--paper` background.
- **Buttons:** Pill-shaped (`border-radius: 999px`), uppercase mono, 1px border.
- Full reference: `DESIGN.md`

## Database

- Main tables: `people`, `tasks`, `blocks`, `brands`, `briefings`, `task_references`
- `people.auth_user_id` links Supabase auth user to a people row — required for app to work after login.
- RLS is **enabled on production**, **disabled on staging** (intentional).
- Schema reference: `meeting-schema.sql`, `access-tier.sql`, `seed.sql`

## People Record Setup (new users)

After a new person signs in via Slack for the first time:
1. Find their `auth.users` UUID in Supabase.
2. Run: `UPDATE people SET auth_user_id = '<uuid>' WHERE email = '<email>';`
3. Set correct `access_tier` if not staff.
