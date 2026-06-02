# ChordOS — External Cron Setup (cron-job.org)

Use this when deploying on Hostinger (or any non-Vercel host).
Vercel handles this automatically via vercel.json — this is only needed for Hostinger.

## What it does
Runs the daily delay check at 9am IST (3:30am UTC) every day.
Checks for overdue tasks, fires Slack alerts, sends 24hr reminders.

---

## Step 1 — Set CRON_SECRET in Hostinger env vars

In Hostinger panel → Environment Variables, add:
```
CRON_SECRET=your-random-string-here
```

Generate a random string at: https://randomkeygen.com
(use "Strong Passwords" section, any 32-char string works)

---

## Step 2 — Create cron job on cron-job.org

1. Go to https://cron-job.org → Sign up (free)
2. Click **Create cronjob**
3. Fill in:

| Field | Value |
|---|---|
| Title | ChordOS Delay Check |
| URL | `https://chord-os.theampmworld.com/api/cron/delay-check` |
| Schedule | Custom: `30 3 * * *` (every day at 3:30am UTC = 9am IST) |
| Request method | GET |
| Request headers | Add header: `Authorization` → `Bearer your-random-string-here` |

4. Click **Create** → Enable

---

## Step 3 — Verify it's working

After the first run (next day at 9am IST):
- Check cron-job.org → Execution History — should show 200 OK
- Check #chord-os Slack channel — should see delay/reminder messages

If you want to test immediately:
- In cron-job.org → your cron job → **Run now**
- Or hit the URL directly in browser with the auth header (use Postman or curl):

```bash
curl -H "Authorization: Bearer your-random-string-here" \
  https://chord-os.theampmworld.com/api/cron/delay-check
```

---

## What fires from this cron

| Alert | Condition |
|---|---|
| ⚠️ Delayed | Task past deadline, not submitted |
| ⏰ Due in 24h | Task due tomorrow, not submitted yet |
| 🚨 Repeat delay | Person has 3+ delays in last 30 days |

All fire to #chord-os on edernityteam.slack.com.
