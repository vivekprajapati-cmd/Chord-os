# Testing Checklist

Before filing issues, verify these work end-to-end.

## Pre-Test Checklist

- [ ] `.env.local` has all 5 keys (SUPABASE_URL, SUPABASE_ANON_KEY, ANTHROPIC_API_KEY, SLACK_WEBHOOK_URL, ANTHROPIC_MODEL_ID)
- [ ] Supabase `schema.sql` ran successfully (8 tables exist)
- [ ] Supabase `seed.sql` ran (19 people + 4 brands in database)
- [ ] Google OAuth is configured in Supabase
- [ ] `npm run dev` starts without errors
- [ ] You can log in with your @theampmworld.com Google account

## Core Features

### ✓ Dashboard
1. Log in → land on Dashboard
2. See "Today's blocks", "In progress", "Needs review" cards
3. If no blocks, see "No blocks today" message
4. Click "Full calendar" → goes to Calendar page

### ✓ Calendar (Week View)
1. Go to Calendar
2. See 7 days (Mon-Sun) with current week
3. Today's day is highlighted
4. Click another day → view changes
5. (If no blocks assigned yet, shows "No blocks assigned for this day")

### ✓ Chat Allocator (Team Leads Only)
1. Go to Chat (only shows if you're a `is_team_lead = true`)
2. Type: `Block Vineet 3h tomorrow for IndiaGate design. Mood board: https://pinterest.com/...`
3. See Claude respond with confirmation: "Done. Vineet blocked 3h for IndiaGate — design (P1) starting [time]."
4. Go to Calendar → Vineet's calendar should show the new block
5. (If no references, Claude asks for them before proceeding)

### ✓ Task Assignment (End-to-End)
1. In Chat: `Block Aquib 2h tomorrow for IndiaGate copy. Figma: https://figma.com/... Inspiration: https://...`
2. Task created with:
   - Owner: Aquib
   - Brand: IndiaGate
   - Type: copy
   - Hours: 2
   - Priority: P1 (default)
   - Status: scheduled
   - References: [your two URLs]

### ✓ Reviewer Approval Flow
1. Log in as **owner** (e.g., Aquib)
2. Go to Calendar → click the task you just assigned
3. See context modal with:
   - Brand colors
   - Voice & Tone
   - References (the two URLs you provided)
4. Click "Mark done"
5. Task status changes to `ready_for_review`
6. Log out, log back in as the **reviewer** (assigned in chat, default if not specified)
7. Go to Calendar → click the same task
8. See "Approve" + "Request rework" buttons (not "Mark done")
9. Click "Approve"
   - Task status → `approved`
   - Slack notification fires in #chord-os
10. Log in as owner → task no longer shows in calendar (approved)

### ✓ Rework Flow
1. As **owner**: mark task done (status → ready_for_review)
2. As **reviewer**: click "Request rework"
   - Task status → `assigned`
   - Slack notification: "🔄 Rework requested"
3. Owner sees task back in calendar (assigned again)

### ✓ Tasks List
1. Go to Tasks
2. See sections: "In Progress", "Scheduled", "Ready for Review", etc.
3. Each task shows:
   - Deliverable name
   - Brand
   - Owner
   - Hours
   - Due date (if set)
   - Priority pill
4. Click filter buttons ("Active", "Review queue", "Done")

### ✓ Brand Pages
1. Go to Brands
2. See list of 4 brands (IndiaGate, TrueSilver, AlphaKid, Vadilal)
3. Click one → detail page shows:
   - Brand colors (hex values)
   - Typography (font names)
   - Voice & Tone summary
   - Tasks filtered for that brand

### ✓ Slack Notifications
1. Create a task via Chat
   - Should see: "📅 New block — [owner] blocked Xh for [brand]..."
2. Approve a task as reviewer
   - Should see: "✅ Approved — [task] has been approved..."
3. Request rework
   - Should see: "🔄 Rework requested — [reviewer] is requesting rework..."

(If SLACK_WEBHOOK_URL is missing, notifications silently fail — check console for errors)

### ✓ Realtime Calendar
1. Open calendar in two browser windows (or Chrome + Safari)
2. In one window, go to Chat and assign a task
3. In the other window, watch the calendar update instantly (no refresh needed)

---

## Edge Cases / Error Handling

- [ ] **Unknown brand**: In Chat, type `Block someone 2h for UnknownBrand`. Should say "Brand not found."
- [ ] **Unknown person**: `Block UnknownPerson 2h for IndiaGate`. Should say "No one named..." found.
- [ ] **No references**: `Block Vineet 2h for IndiaGate`. Should ask for references.
- [ ] **Conflicting time**: Assign same person two overlapping blocks. Second should reject with conflict message.
- [ ] **Unauthorized access**: Log in as non-lead, try to go to /chat. Should redirect or show error.
- [ ] **Not a reviewer**: Approve a task when not the assigned reviewer. Buttons shouldn't appear.

---

## Performance / Budget

- [ ] Chat response is fast (< 2s) — indicates prompt caching is working
- [ ] Subsequent chat requests are even faster — cache hits are happening
- [ ] Calendar updates in < 500ms when blocks are created — realtime subscription works
- [ ] No errors in browser console (check DevTools → Console)
- [ ] No 500 errors in terminal

---

## What to Report

If something fails, include:

1. **What you did** — exact steps
2. **What you expected** — what should happen
3. **What happened instead** — error message or wrong behavior
4. **Console errors** — browser DevTools → Console
5. **Terminal output** — any errors from `npm run dev`
6. **Your role** — were you a lead, owner, or reviewer?

---

## Known Limitations (v1)

- Calendar only shows current week (not previous/future weeks)
- References only store URLs (not file uploads)
- No email notifications (Slack only)
- AI gates exist in schema but not enforced in UI yet
- PWA icons not generated (installable not working on mobile)

---

## Quick Fixes

| Problem | Fix |
|---|---|
| Can't log in | Check Google OAuth config in Supabase |
| "Person record not found" | Run the SQL to link auth user to people table |
| "Brand not found" | Check spelling (lowercase: `indiagate` not `IndiaGate`) |
| Chat returns error | Check ANTHROPIC_API_KEY is valid |
| No Slack notifications | Check SLACK_WEBHOOK_URL is valid + #chord-os channel exists |
| App crashes on load | Check all 5 env vars are in `.env.local` |

