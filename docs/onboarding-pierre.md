# ChordOS — Pierre Santos
*Sr. ACD · 1702 Digital*

---

## What ChordOS is

ChordOS is the internal ops workspace for 1702 + Chord. It's the system where all creative work gets assigned, briefed, and tracked — from the moment a client meeting happens to when the deliverable is approved.

The core problem it solves: **knowledge doesn't travel from the client call to the art team.** ChordOS fixes that with a brand brain that captures client decisions, tone rules, and preferences across every meeting — and surfaces them automatically when work is assigned.

Login: `pierre@1702digital.com` — Google SSO.

---

## Your access level

You are a **team lead** (Sr. ACD). That means:

- Full visibility — all tasks, all brands, all statuses
- Allocator access — assign work to anyone on the creative team via Chat
- Log client meetings and update brand knowledge
- See the brand brain for every active brand

---

## Your team in the system

| Name | Role |
|---|---|
| Pierre Santos | Sr. ACD |
| Pratik Kshirsagar | Art Director |
| Manan Shah | Copywriter |
| Kuldip Mankar | AI Motion Graphic |
| Yashika Mistry | Jr. Graphic Designer |

You can assign tasks to all of them directly from the Allocator.

---

## How briefs reach the art team

This is the most important thing ChordOS changes for you.

**Old flow:** POC calls client → WhatsApp summary → lost in chat → art team asks "what did they say?" → rework.

**New flow:**
1. POC or lead logs meeting notes on `/brands/[slug]/meeting`
2. Claude extracts decisions, tasks, and brand rules from the raw notes
3. Tasks are created with a full **brief** — what the client said, tone, references, what to avoid
4. Art team opens their task in ChordOS and sees the exact brief

That brief came from the meeting notes. Nothing got lost.

---

## The Brand Brain

Every brand page has a **Brand Brain** panel — accumulated knowledge from all past meetings.

It categorises rules into:
- **Tone** — voice, language, what to say and how
- **Visual** — colors, layouts, references that work
- **Process** — timelines, approval preferences, file formats
- **Hard No** — things the client has explicitly rejected. The AI allocator will never assign work that violates these.

When you log a meeting, Claude only adds *new* rules — it reads the existing brain and skips anything already captured.

---

## Day-to-day: allocating creative work

Go to **Allocator** in the sidebar. Type naturally:

> "Block Pratik 5 hours Thursday for TrueSilver product shoot post-processing, P1. Ref: [Figma link]"

The AI will:
- Check Pratik's calendar for conflicts
- Check his current task load (warns if 20h+ already active)
- Apply brand rules from TrueSilver's brain automatically
- Create the task + block + Slack notification

You must provide at least one reference link. The system will ask before assigning if it's missing.

---

## Brand rules and your creative standards

The brand brain feeds into the allocator's context. If IndiaGate has a rule `[hard_no] No discount or price messaging`, the allocator will surface it when you assign copy or design work for that brand.

If a task was created from a client briefing, it shows a **Briefing** badge in the tasks list. The full meeting brief is in the task card — available to Pratik, Manan, or whoever is assigned.

---

## Active brands

| Brand | Category | Quick notes |
|---|---|---|
| IndiaGate | FMCG — Basmati Rice | Navy `#1A3C6E` + gold `#D4AF37`. Premium heritage. No exclamation marks. No price/discount messaging. Homemaker audience. |
| Vadilal | FMCG — Ice Cream / Dairy | Summer-driven. High-volume content. Fun, accessible. |
| TrueSilver | Jewellery | Aspirational. Visual-first. Premium but not cold. |
| AlphaKid | Kids | Energetic, bright. Parents + kids dual audience. |

Full typography, color, and voice rules on each brand's page in **Brands**.

---

## Task statuses (what to tell the team)

| Status | What it means |
|---|---|
| Scheduled | Assigned, not started. Block is on the calendar. |
| In Progress | Work has started. |
| Ready for Review | First pass done — waiting for your review / approval. |
| Approved | You've signed off. |
| Done | Delivered to client or marked complete. |

---

## What's coming

**AI co-review** — when a task moves to "Ready for Review," Claude will check the submitted creative against the brand brain (tone rules, hard_nos, visual guidelines) and flag issues before it reaches you. First-pass quality gate, automatic. You'll only see work that's already been through it.
