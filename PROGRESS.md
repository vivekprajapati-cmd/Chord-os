# ChordOS Progress

**Status:** MVP functional. Reviewer approval + required references shipped. Budget optimization complete.

**Last Updated:** 2026-05-12

---

## What's Done

### Core Allocator
- Chat interface with Claude tool-use (agentic loop)
- `create_task_and_block` tool wired to Supabase
- Conflict detection (prevents double-booking)
- Prompt caching: system prompt + tools cached for 5min (~90% cost reduction on cache hits)
- Model no longer hardcoded — reads from `ANTHROPIC_MODEL_ID` env var

### Calendar + Real-Time
- Week view with day selector
- Click-to-context modal (brand colors, voice, references, notes)
- Supabase realtime subscriptions — calendar updates instantly when blocks assigned
- Mark done → task moves to ready_for_review

### Reviewer Approval Flow (NEW)
- Approve button → task status = `approved` → Slack notification
- Request rework button → task reverts to `assigned` → owner retries
- Shows only to reviewer when task is `ready_for_review`
- Powered by Slack #chord-os webhook

### Required References (NEW)
- Mood boards / storyboards / inspiration links now REQUIRED when assigning
- System prompt enforces this: "References are REQUIRED. If not provided, ask."
- References auto-stored in `task_references` table
- Task holder sees them in context modal

### Dashboard
- Today's blocks (scheduled + in progress)
- In progress count
- Review queue alert (red badge if tasks waiting for your approval)
- Real data from Supabase

### Tasks Page
- Grouped by status (in_progress, scheduled, ready_for_review, approved, done)
- Role-based: leads see all, others see own
- Sortable by priority + deadline

### Auth + Access Control
- Google OAuth, domain-restricted (@theampmworld.com)
- RLS policies on all tables (people, tasks, blocks)
- Auto-link auth_user_id to people table on first login

### Brand Pages
- Brand list + detail view
- Brand colors, typography, voice summary
- Tasks filtered by brand

### Database
- 8 tables: people, brands, tasks, blocks, task_references, ai_gate_results, chat_messages, activity_log
- 19 team members seeded (from CSV)
- 4 brands seeded (IndiaGate, TrueSilver, AlphaKid, Vadilal)
- RLS policies enforce role-based access

### PWA
- `manifest.json` configured (installable on mobile/desktop)
- Still needs: icon-192.png + icon-512.png in `/public/`

---

## What's Left

### High Priority (Ship Next)
1. **PWA Icons** — 30min
   - Generate 192×192 and 512×512 PNG files
   - Save to `/public/icon-192.png` and `/public/icon-512.png`
   - Makes app installable on mobile/desktop

### Medium Priority (Nice to Have)
2. **AI Gate Enforcement** — 3-4h
   - Wire gate checks into task detail view
   - Block approval if tier-1 brand fails gate
   - Currently in schema, not connected to UI
   - Skip unless you hit a specific quality issue

### Not Needed for MVP
- Email notifications (using Slack only per request)
- Additional task fields beyond what exists

---

## Budget Status

**Spend:** $31 / $40 (77% used)

**Optimizations shipped:**
- ✅ Removed hardcoded `claude-sonnet-4-6` model from chat route
- ✅ Implemented prompt caching (5-min ephemeral, ~90% cost reduction on cache hits)
- ✅ Model now reads from `ANTHROPIC_MODEL_ID` env var (no hardcoding)

**Remaining burn:** Only on actual API calls to Anthropic for chat allocations. No wasted token burn.

---

## How to Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in Chrome.

**Required env vars:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
SLACK_WEBHOOK_URL=
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022  # optional, defaults to this
```

---

## File Structure

```
app/
  (app)/
    dashboard/
    calendar/
    tasks/
    brands/
  api/
    chat/              # allocator endpoint with tool-use
    slack/notify/      # approval notifications
lib/
  slack.ts            # webhook + notification helpers
components/
  context-modal.tsx   # task detail + approval buttons
```

---

## Next Steps

1. Generate PWA icons (30min, optional but recommended for polish)
2. Test the full flow:
   - Lead assigns task via chat with references
   - Owner marks done → task to ready_for_review
   - Reviewer approves or requests rework
   - Slack notification fires
3. Ship to team

---

## Notes for Future Work

- **AI gate:** Schema ready (`ai_gate_results` table), just needs UI wiring + enforcement logic
- **Scaling:** RLS policies are in place. Can add more people/brands without code changes.
- **References:** Currently accepts URLs. Can extend to accept Figma embeds, Miro links, etc.
- **Reviewer routing:** Currently assigned via task creation. Could be automated by role/brand later.
