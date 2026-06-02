# ChordOS — Build Status

**Last Updated:** June 2026
**Status:** Feature-complete MVP. Ready for deployment.

---

## What's Built

### Auth
- Slack OAuth (edernityteam workspace only)
- Auto-creates `people` row on first login from Slack profile
- Role-based access: `is_team_lead` flag controls lead vs staff
- RLS policies on all tables

### Dashboard
- Today's blocks, in-progress count, review queue alert
- Upcoming blocks if nothing today
- Live data from Supabase

### Tasks
- Grouped by status: in_progress → scheduled → ready_for_review → approved → done
- Leads see all tasks, staff see own only
- Edit modal: change deliverable, assignee, priority, status, hours, deadline
- Block transfer on reassign (old block cancelled, new one created)

### Calendar
- Week view with day selector
- Click any block → Context modal
- Realtime updates via Supabase subscriptions

### Context Modal
- Brand colors, voice, references per task
- Acknowledge button (assignee confirms task seen) → Slack notified
- Mark done + submission URL required → Slack notified
- Revision round counter
- Approve / Rework with notes (reviewer only) → Slack notified
- Revision threshold alert at round 3+

### Chat Allocator (Team leads only)
- Natural language task assignment via Claude / Groq
- Bulk morning allocation (multiple people, one message)
- Reassignment via chat ("move X to Y")
- Due date required, hours optional
- References optional (asks once)
- Conflict detection, overload warning (20h+)
- Brand brain context (rules, meeting notes)
- AI fallback: Anthropic → Groq (auto)

### Brands
- Brand list + detail page
- Colors, typography, voice summary
- Active tasks per brand

### Briefings
- Meeting notes per brand
- Action items, decisions, tasks suggested, knowledge rules
- Filterable by brand

### Team (leads only)
- Full team list grouped by department
- Add Person modal → writes to Supabase `people` table
- Self-serve via Slack login (no manual seeding needed)

### Analytics (leads only)
- Per-member: active tasks, total, completed, on-time rate, delays, avg turnaround
- Team-wide summary
- Export to Excel (.xlsx) + PDF (browser print)

### Slack Notifications
All state changes fire to `#chord-os`:
- Task assigned, acknowledged, submitted, approved
- Rework requested (with notes + round number)
- Reassigned (from → to → by)
- Delayed (daily cron, 9am IST)
- 24hr deadline reminder (same cron)
- Repeat delay warning (3+ delays in 30 days)
- Revision threshold breach (round 3+)

### Mobile
- Responsive layout: sidebar on desktop, hamburger drawer on mobile
- Drawer has all nav links including Team + Analytics
- Context modal slides up from bottom on mobile
- Analytics table horizontally scrollable
- PWA manifest configured (portrait, installable)

---

## SQL Files (run in order)

```
1. schema.sql        — all tables + RLS policies
2. seed.sql          — 4 brands (IndiaGate, TrueSilver, AlphaKid, Vadilal)
3. features-patch.sql — acknowledgment, submission, revision tracking, member_stats view
```

Note: `seed.sql` no longer seeds people — they self-onboard via Slack login.

---

## Environment Variables

See `.env.example` for full list. Key ones:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY          # primary AI (optional if Groq set)
GROQ_API_KEY               # fallback AI (free at console.groq.com)
SLACK_WEBHOOK_URL          # #chord-os incoming webhook
NEXT_PUBLIC_APP_URL        # https://chord-os.theampmworld.com
CRON_SECRET                # random string, secures cron endpoint
```

---

## Cron Job

Daily delay check at 9am IST — see `docs/cron-setup.md` for setup on Hostinger via cron-job.org.

---

## What's Pending

| Item | Priority | Notes |
|---|---|---|
| PWA icons | Low | Add icon-192.png + icon-512.png to /public for mobile install |
| AI gates enforcement | Low | Schema ready, UI pending |
| Rejection notes visible to assignee | Medium | Rework notes fire to Slack but not shown in assignee's task view |
| Creative capacity dashboard | Medium | Active hours in allocator prompt only, no visual panel |
| Briefings → confirm tasks | Medium | `tasks_confirmed` flag exists, no UI action yet |
| Standup logger | v2 | Not started |
