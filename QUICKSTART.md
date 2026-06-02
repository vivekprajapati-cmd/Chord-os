# ChordOS — Quick Start (5 min)

## Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- Google Cloud OAuth credentials
- Anthropic API key

## Step 1: Clone & Install
```bash
cd /Users/darshitraut/Desktop/EA/projects/chord-os
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → Create new project
2. Wait for it to finish (takes ~1 min)
3. Go to **Settings** → **API** → copy these three values:
   - `Project URL` (looks like `https://xxxx.supabase.co`)
   - `anon public key` (starts with `eyJ...`)
4. In the **SQL Editor**, paste the contents of `schema.sql` and run
5. Then paste `seed.sql` and run (loads 19 people + 4 brands)

## Step 3: Create `.env.local`

In the project root, create a file called `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ANTHROPIC_MODEL_ID=claude-3-5-sonnet-20241022
```

**Where to get each:**
- **SUPABASE_URL + ANON_KEY**: from Supabase Settings → API
- **ANTHROPIC_API_KEY**: from [console.anthropic.com](https://console.anthropic.com) → API Keys
- **SLACK_WEBHOOK_URL**: from edernityteam Slack → Apps → Incoming Webhooks (optional for testing)

## Step 4: Set Up Google OAuth in Supabase

1. In Supabase Dashboard → **Authentication** → **Providers** → **Google** → enable
2. You'll need Google OAuth credentials:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 Client ID (Web app)
   - Add redirect URI: `http://localhost:3000/api/auth/callback`
   - Copy Client ID + Secret into Supabase Google provider settings

## Step 5: Run Locally
```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

**Login:**
- Use your @theampmworld.com Google account (or whatever domain is allowed)
- First login may ask to link your auth user to the `people` table

## Step 6: Test the Flow

### Dashboard
- Click "Dashboard" — should show today's blocks, in progress, review queue

### Assign Work (Chat)
1. Click "Chat" (only visible if you're marked as `is_team_lead = true`)
2. Type: `Block Vineet 3h tomorrow for IndiaGate copy edit, P1. Figma: [paste mood board URL]`
3. Claude parses it and calls `create_task_and_block`
4. Task appears in owner's calendar

### Calendar
- Click "Calendar" → see week view
- Click any task → opens context modal with brand colors, voice, references
- Click "Mark done" → task moves to ready_for_review

### Reviewer Approval
- Log in as the reviewer (set in task creation)
- Open the task again
- See "Approve" and "Request rework" buttons
- Click one → task status updates, Slack notification fires

---

## Troubleshooting

**"Auth user not found"**
- Run in Supabase SQL editor:
  ```sql
  update people set auth_user_id = (select id from auth.users where email = 'YOUR-EMAIL@theampmworld.com')
  where email = 'YOUR-EMAIL@theampmworld.com';
  ```

**"Brand not found" in chat**
- Check `seed.sql` was run. Should have 4 brands: `indiagate`, `truesilver`, `alphakid`, `vadilal`

**"No references provided" error**
- When assigning tasks, include at least one reference/mood board URL

**Supabase connection fails**
- Double-check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Make sure they're in `.env.local`, not `.env.example`

---

## What You Can Test

| Feature | How |
|---|---|
| Chat allocator | Go to Chat, assign work with references |
| Calendar realtime | Open calendar in two windows, assign task in one, watch the other update |
| Reviewer approval | Mark a task done, then log in as reviewer and approve |
| Slack notifications | Check #chord-os when tasks are created/approved |
| Permissions | Try to access /tasks as a non-lead (should only see own tasks) |

---

## Next Steps

- Once tested locally, can deploy to Vercel with the same env vars
- PWA icons needed for mobile install (optional)
- AI gates ready to wire in (schema done, UI pending)

