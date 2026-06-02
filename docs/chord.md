# ChordOS
*Operations + AI workspace for 1702 Digital + Chord*
*Last updated: 2026-05-13*

---

## What ChordOS is

ChordOS is the internal ops system for the 1702 + Chord team. It replaces the WhatsApp-and-spreadsheet stack for task allocation, creative briefing, and work tracking.

The core problem it solves: **knowledge from client calls dies before it reaches the art team.** A POC takes a call, sends a WhatsApp summary, it gets buried, and the designer produces something the client never asked for. Rework. Wasted time. Repeat.

ChordOS fixes this with a **brand brain** — every client meeting is logged, Claude extracts rules + decisions + tasks, and that knowledge travels intact into every brief. The designer sees exactly what the client said. The allocator enforces brand rules before work even starts.

---

## The system in three parts

### 1. Brand Brain
Every brand has an accumulated knowledge base built from logged meetings.

- POC or lead logs raw meeting notes on the brand page
- Claude extracts: summary, decisions (with impact level), suggested tasks with full briefs, new rules, contacts
- Rules are tagged: **tone** / **visual** / **process** / **hard_no**
- Knowledge accumulates over time — each meeting adds to the previous, never duplicates
- Every subsequent task brief and allocator instruction is informed by this brain

### 2. Allocator (Chat)
Team leads assign work by typing naturally in the Chat interface.

> "Block Pratik 5 hours Thursday for TrueSilver product shoot post-processing, P1. Ref: [Figma link]"

The system:
- Checks the assignee's calendar for conflicts
- Warns if their active task load is over 20 hours
- Applies brand rules from the brain automatically
- Creates the task + calendar block
- Sends Slack notification to the assignee

References (mood board, storyboard, Figma, Drive link) are required before any task is created.

### 3. Tasks + Calendar
Every task has a status (Scheduled → In Progress → Ready for Review → Approved → Done), an owner, a deadline, a brief, and a linked calendar block.

- **Tasks page** — filterable by status, brand, person
- **Calendar** — week view with day breakdown; every block shows brand colors, priority, brief inline
- **Briefings** — chronological feed of all logged meetings across brands, filterable by brand
- **Dashboard** — today's blocks, tasks needing attention, items ready for review

---

## The team

### Leadership + Account

| Name | Role | Email | Access |
|---|---|---|---|
| Shivangi Shekhar | Chief of Creative and Strategy | shivangi.shekhar@1702digital.com | Lead |
| Trupti Maidh | Account Lead | trupti.maidh@1702digital.com | Lead |
| Darshit Raut | Founders Office (ops) | darshit@ampmnetwork.com | Lead |

### Creative

| Name | Role | Email | Access |
|---|---|---|---|
| Pierre Santos | Sr. ACD | pierre@1702digital.com | Lead |
| Pratik Kshirsagar | Art Director | pratik.kshirsagar@1702digital.com | Lead |
| Manan Shah | Copywriter | manan.shah@1702digital.com | Staff |
| Kuldip Mankar | AI Motion Graphic | kuldipmankarr@gmail.com | Staff |
| Yashika Mistry | Jr. Graphic Designer | yashika.mistry@1702digital.com | Staff |

### Video

| Name | Role | Email | Access |
|---|---|---|---|
| Nimesh Shinde | Video Lead | nimesh.shinde@1702digital.com | Lead |
| Vineet Shelar | Video Editor | vineet@1702digital.com | Staff |
| Tarun | Video Editor (Ahmedabad) | tarun@1702digital.com | Staff |

### SEO + Content

| Name | Role | Email | Access |
|---|---|---|---|
| Aman Adodra | SEO Business Head | aman@1702digital.com | Lead |
| Dhwani Chhelavda | Content Creator (Ahmedabad) | dhwani.chhelavda@1702digital.com | Staff |

### Brand Solutions (POC tier — pending activation)

| Name | Role | Email | Access |
|---|---|---|---|
| Muskaan Madnani | Brand Solutions Executive | muskaan@1702digital.com | Staff → POC |
| Moksha Mehta | Brand Solutions Executive | moksha@1702digital.com | Staff → POC |
| Shivani Reshamwala | Brand Solutions Executive | shivani.reshamwala@1702digital.com | Staff → POC |

### Marketing

| Name | Role | Email | Access |
|---|---|---|---|
| Rajat Dey | Marketing and Alliance | rajat@1702digital.com | Lead |
| Shawn Dsouza | Influencer Marketing Intern | shawn@1702digital.com | Staff |
| Shanvi Patel | Marketing Trainee | shanvi@1702digital.com | Staff |
| Yassha Gada | Marketing Trainee | yassha@1702digital.com | Staff |

---

## Access tiers

| Tier | Who | What they can do |
|---|---|---|
| **Lead** | Shivangi, Trupti, Pierre, Pratik, Nimesh, Aman, Rajat, Darshit | See all tasks, use Allocator, log meetings, approve work |
| **POC** | Muskaan, Moksha, Shivani (pending migration) | See all tasks for their brands, log meetings — no Allocator |
| **Staff** | Manan, Kuldip, Yashika, Vineet, Tarun, Dhwani, Shawn, Shanvi, Yassha | See own tasks, mark status, view calendar |

POC tier activates after running `access-tier.sql` in Supabase.

---

## Active brands

| Brand | Category | Tier | Brain status |
|---|---|---|---|
| IndiaGate | FMCG — Basmati Rice | 1 (hard AI gates) | Active — rules loaded |
| Vadilal | FMCG — Ice Cream / Dairy | 2 | Pending — first meeting needed |
| TrueSilver | Jewellery | 2 | Pending — first meeting needed |
| AlphaKid | Kids | 2 | Pending — first meeting needed |

All brands managed by Trupti Maidh (Account Lead).

Full brand details, identity, and accumulated rules: [`brands.md`](./brands.md)

---

## Task statuses

| Status | Meaning |
|---|---|
| Scheduled | Assigned, not started |
| In Progress | Work underway |
| Ready for Review | First pass done — with lead for sign-off |
| Approved | Lead signed off |
| Done | Delivered |

---

## Login

All logins are Google SSO restricted to `@1702digital.com`.

One exception: Kuldip Mankar logs in with `kuldipmankarr@gmail.com` (whitelisted).

---

## Individual onboarding docs

Each team member has a personal doc in this folder:

| Person | File |
|---|---|
| Shivangi Shekhar | [onboarding-shivangi.md](./onboarding-shivangi.md) |
| Trupti Maidh | [onboarding-trupti.md](./onboarding-trupti.md) |
| Pierre Santos | [onboarding-pierre.md](./onboarding-pierre.md) |
| Pratik Kshirsagar | [onboarding-pratik.md](./onboarding-pratik.md) |
| Manan Shah | [onboarding-manan.md](./onboarding-manan.md) |
| Kuldip Mankar | [onboarding-kuldip.md](./onboarding-kuldip.md) |
| Yashika Mistry | [onboarding-yashika.md](./onboarding-yashika.md) |
| Nimesh Shinde | [onboarding-nimesh.md](./onboarding-nimesh.md) |
| Vineet Shelar | [onboarding-vineet.md](./onboarding-vineet.md) |
| Tarun | [onboarding-tarun.md](./onboarding-tarun.md) |
| Aman Adodra | [onboarding-aman.md](./onboarding-aman.md) |
| Dhwani Chhelavda | [onboarding-dhwani.md](./onboarding-dhwani.md) |
| Muskaan Madnani | [onboarding-muskaan.md](./onboarding-muskaan.md) |
| Moksha Mehta | [onboarding-moksha.md](./onboarding-moksha.md) |
| Shivani Reshamwala | [onboarding-shivani.md](./onboarding-shivani.md) |
| Rajat Dey | [onboarding-rajat.md](./onboarding-rajat.md) |
| Shawn Dsouza | [onboarding-shawn.md](./onboarding-shawn.md) |
| Shanvi Patel | [onboarding-shanvi.md](./onboarding-shanvi.md) |
| Yassha Gada | [onboarding-yassha.md](./onboarding-yassha.md) |

---

## What's next

| Feature | Status |
|---|---|
| Brand brain — all 4 brands populated | Vadilal / TrueSilver / AlphaKid need first client meeting logged |
| POC tier activation | Run `access-tier.sql` in Supabase |
| AI co-review gate | When task → Ready for Review, Claude checks against brand brain before human sees it |
| Brand reference packs | Monthly PPT/PDF upload per brand → text extracted into brain context |
| Output analytics | Estimated vs actual hours, overruns by person + brand |

---

## Technical reference

For stack, architecture, API routes, data model, and local dev setup: [`chordos-system.md`](./chordos-system.md)
