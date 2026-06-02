# ChordOS

Operations + AI workspace for **Chord** + **1702 Digital**. 19-person team. Built on the HireStack pattern.

## What it does (v1)

- Chat allocator for team leads ("Block Vineet 3 hrs tomorrow for IndiaGate edit, P1")
- Internal calendar (no Google Calendar sync — everything lives in ChordOS)
- Click-to-Context modal — every calendar block opens with brand pack, references, AI gates
- Brand pages — read-only display of brand second-brain MDs
- Slack + email notifications (workspace: `edernityteam.slack.com`, channel: `#chord-os`)

## Stack

- Next.js 16 + Tailwind v4 + ShadCN-style UI
- Supabase (Postgres + Auth + Storage + RLS)
- Anthropic Claude Sonnet 4.6 (tool use for chat allocator)
- Google SSO restricted to `@1702digital.com` (+ whitelist for Kuldip's gmail)
- Deployed as a PWA at `chord-os.theampmworld.com`

## Setup

**⚡ Quick start: See [`QUICKSTART.md`](./QUICKSTART.md)** — 5-minute setup guide.

Detailed setup steps are in the Quick Start. TL;DR:
1. `npm install`
2. Create Supabase project → run `schema.sql` + `seed.sql`
3. Create `.env.local` with Supabase + Anthropic keys
4. `npm run dev` → http://localhost:3000

## Project structure

```
chord-os/
├── app/
│   ├── (auth)/login/           # Google sign-in
│   ├── (app)/
│   │   ├── layout.tsx          # Nav + auth gate
│   │   ├── dashboard/          # Home — today + blocks summary
│   │   ├── calendar/           # Week view (wiring in v1.1)
│   │   ├── tasks/              # Task list
│   │   ├── brands/             # Brand pages (linked to second-brain MDs)
│   │   └── chat/               # Allocator (team leads only)
│   ├── api/
│   │   ├── auth/callback/      # Supabase OAuth callback
│   │   └── chat/               # Claude tool-use endpoint
│   ├── globals.css             # Chord brand palette
│   └── layout.tsx              # Root layout, fonts
├── lib/
│   ├── supabase/               # Browser + server clients
│   └── slack.ts                # Webhook helpers
├── schema.sql                  # Postgres schema (run in Supabase)
├── seed.sql                    # 19 people + 4 brands
├── middleware.ts               # Domain restriction + auth gate
└── package.json
```

## Build status

| Module | Status |
|---|---|
| Repo scaffold | ✓ |
| Supabase schema + seed | ✓ |
| Google SSO + domain restriction | ✓ |
| App shell (nav, layout) | ✓ |
| Dashboard (real data) | ✓ |
| Tasks list (grouped by status) | ✓ |
| Brands list + detail | ✓ |
| Chat allocator (Claude tool-use) | ✓ |
| Calendar week view + realtime | ✓ |
| Click-to-Context modal | ✓ |
| Reviewer approval flow | ✓ |
| Required references (mood boards, storyboards) | ✓ |
| Slack notifications | ✓ |
| Prompt caching (cost optimization) | ✓ |
| PWA icons | — next (optional) |
| AI gates enforcement | — v1.5 (schema ready) |
| Standup logger | — v2 |

**See [`PROGRESS.md`](./PROGRESS.md) for detailed status.**

## See also

- [`../1702-ai-sprint/chord-crm/decisions-locked.md`](../1702-ai-sprint/chord-crm/decisions-locked.md) — decisions log
- [`../1702-ai-sprint/second-brain/`](../1702-ai-sprint/second-brain/) — role packs + brand packs (the "second brain")
- [`../hiring-stack/`](../hiring-stack/) — sibling app, shares auth pattern
