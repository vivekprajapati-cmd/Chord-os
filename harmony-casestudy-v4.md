# Harmony

### I built a task management system for a team that had hired the right people but had no way to see whether they were working.

**Role:** AI Engineer, Product Manager
**Type:** Internal Tool, Org-Wide
**Timeline:** 0 to 1, In Production
**Users:** 30 to 40 people across creative, video, operations, and brand servicing
**Organisation:** Chord, Creative Marketing Agency, Mumbai

---

## The thing nobody could explain

Chord had hired the right number of people to deliver the right number of assets every month. The equation was simple: X resources should produce Y assets.

X was not producing Y.

Shivangi, the CEO, framed it precisely: *"The problem that we were facing was that X was not delivering Y and the reason for it was undetermined. There were a lot of conversations from people and management — burnout, too many feedback rounds — but it was all happening on a very personal level. You cannot track it quantitatively."*

The team was pulling ten to twelve hour days. Backlogs were growing. And nobody at the top could explain why, because nobody at the top could see anything.

---

## What I saw before I built anything

The first thing I did was observe — not interview, observe.

Every morning, the team gathered for a task allocation meeting. It lasted at least an hour. Assignments were given verbally. Priorities were debated in real time. By the time it ended, nothing was written down in a place anyone could find later.

What stuck with me was watching Shivani re-brief the same task to interns two, sometimes three times in a single day. The brief had been given in the morning. But there was nowhere it lived after the meeting ended. So people came back asking. She answered again. They came back again. She answered again — and this was not a failure of memory or effort. It was a structural problem. When work lives in conversation, it disappears the moment the conversation ends.

That observation shaped every decision that followed.

---

## What was actually happening across the team

Before writing a line of code, I mapped the workflow across four roles.

**Shivani, Operations:** spent roughly one and a half hours every day on task allocation and re-briefing alone. *"It was only like there was one and a half hours going, only in allocating things. Now it's like everyone has to just, a day prior, allocate the task and it's there on their desktop and everything."*

**Shanvi, Brands Manager:** out of a nine-hour day, two to three hours went to logistics — resolving priority conflicts between brands all demanding the same video team at the same time. *"When we actually go to the video team, because there are three or four brands with all high-priority content, organising the day gets a little difficult and frustrating at times."* Fifteen to twenty-five creative outputs per week, coordinated almost entirely by word of mouth.

**Pierre, Senior Art Director:** managed the creative and video team through morning meetings and end-of-day updates from juniors. Recurring content was manageable. Ad-hoc work was not. *"The only irritating part was the ad-hoc work because most of the time I would not really know about it. It would come to me suddenly from my juniors. Things get lost in translation."*

**Shivangi, CEO:** no visibility into who was overloaded, who was underutilised, or which brand's output was quietly falling behind. *"Conversational gaps were increasing and their everyday coordination was getting almost to zero."*

**Pratik, Graphic Designer:** the outlier in this picture. His task allocation took ten to fifteen minutes per day — face-to-face, disciplined, no real confusion. His team knew what they were doing. But that knowledge stayed inside the room. The servicing team had no way to check what Pratik's team was working on without asking him directly. *"Earlier I would do the face-to-face communication. Now I am assigning tasks directly from here. Anyone can come — service people can also check what tasks they did two days ago. They get a track record. That is a plus point."* The problem for Pratik was not chaos. It was opacity.

Five people, different severities, same missing layer. There was no shared place where work existed — and the people who felt it least were still limited by it.

---

## What I built — and how it evolved

Harmony started small, deliberately. The first version had four things: a dashboard, a task tab, a team view, and a brand directory. Enough to answer one question — is the right work assigned to the right person? — without adding anything else.

Once that was stable and in use, the gaps became visible.

Task creation needed more flexibility. Recurring tasks were a real pattern at a content agency — the same deliverables cycling every month for every brand. Flexible tasks, spanning date ranges without fixed time slots, were how the team actually thought about some of their work. Both were added.

Shivangi asked for a calendar. Not a simplified one — she wanted something close to Google Calendar, where she could see each employee's blocked time for the day before assigning a task on top of it. She also wanted it connected to Google Calendar, so team meetings and Google Meet calls showed up alongside work blocks. That integration was built: a weekly grid view per person, with Google Calendar overlaid, all in IST.

Analytics came next — task completion rates, on-time delivery, hours logged — scoped to individual staff for personal tracking, and opened up to admins and leads for team-level visibility.

The operations tab followed. The team was already pulling data from multiple Google Sheets — a weekly management tracker, an influencer campaign tracker, a brand performance tracker. Rather than continuing to manage those outside the product, the tab pulled them in directly via the Google Sheets API, surfacing the data inside Harmony where the ops team was already working.

The most recent additions: a voice-controlled task allocator — so team leads can assign tasks by speaking rather than typing, transcribed and structured by AI — and Admin Brain, a new tab connected to a Google Spreadsheet tracking the entire team's monthly content backlog, giving Shivangi a live operational view without opening another tool.

Each addition came from a real gap the team was navigating. None of them were in the original spec.

---

## What the feedback sessions surfaced

After launch, I ran structured sessions with each of the four primary users.

Shivani's most pressing request: a proper URL field inside tasks. She had been pasting Google Docs links and mood board references as plain text in the brief. *"Sometimes it is easier to see the visual rather than it being in words. If it directly redirects them to that, it will be easier for them."* That feature was shipped.

Shanvi validated the priority system and flagged onboarding. The Slack-based login works once someone is in the workspace, but assigning access tiers still requires a manual step that could be streamlined at the point of joining.

Pierre had no new requests. His read on the system: *"The moment you start using it, it doesn't take you time to really understand the whole system. It's very simple."*

Pratik assigned roughly twenty-five to thirty tasks per week through Harmony and had no confusion with the interface. His read was grounded: the biggest shift was not personal — it was that the servicing team could now independently track task history without coming to him. Accountability had been distributed, not just centralised.

Shivangi's rating: 7 out of 10 for reducing operational confusion. Her assessment was direct: *"The gap still is getting people to do it and use the tool."* The product works. Getting the entire organisation to reach for it consistently — without being reminded — is the problem that remains.

---

## What I deliberately did not build

A dedicated time-tracking layer was deliberately left out. Harmony does surface hours through the calendar — when a block is assigned to a task, the duration is captured — but that is a byproduct of scheduling, not a logging requirement. Making people manually enter time spent would have added overhead to everyone doing the work and introduced a surveillance dynamic that does not belong in a creative team.

A full reporting dashboard for clients was deliberately out of scope. Clients do have access to Harmony — a scoped read-only view of their own brand's tasks and details — but they do not see the agency's internal operational layer. A client seeing cross-brand allocation data or internal priority logic would have changed the nature of the tool entirely.

A chat layer inside tasks was a real temptation, but Chord already has Slack. A second messaging layer would not have replaced it. It would have created another inbox.

Automated task creation was the most counterintuitive cut. The discipline of writing a brief is part of the value. If task creation became automatic, brief quality would drop, and with it the entire point of the system.

Shanvi, who self-describes as not a techy person, put the design philosophy plainly: *"It's a very simple interface to understand. It's quite direct, so I really appreciate it."* Every cut was a deliberate choice about what the product was actually for.

---

## What changed

Shivani no longer spends an hour and a half re-briefing tasks. The brief lives in the task. If someone needs to revisit it, they open Harmony.

Shanvi stopped running behind the video team in the final hours before a deadline. *"We get creatives in a more orderly manner and fashion now and I don't have to sort of run behind the video team or hustle in the last few hours to match a deadline. That has definitely reduced."*

Pierre opens the dashboard on Monday morning and already knows what every person on his team is working on — without sending a message to find out.

Shivangi can see task allocation and completion at the org level for the first time. The question she started with — why is X not producing Y — now has a place to be answered.

Thirty to forty people across creative, video, operations, and brand servicing use this every day. Not a pilot. The entire org.

---

## The honest gap

Harmony works. The people who use it most, use it consistently. The gap is adoption depth — not everyone opens it without being prompted, and the morning meeting habit has not fully broken.

The next version needs to make the cost of not opening Harmony felt before a deadline slips — smarter reminders, accountability signals, something that pulls people in rather than waiting for them to remember. That work is ongoing.

---

## What I learned

**Watch before you ask.** The re-briefing problem — Shivani repeating the same brief two or three times a day to the same interns — was something I saw happen before anyone named it as a problem. If I had only run interviews, I would have gotten descriptions of frustration. Watching gave me the mechanism. The mechanism is what you build for.

**Iteration is the product, not a phase after it.** The first version of Harmony had four features. The current version has nine tabs. Every addition came from something the team was doing outside the tool that should have been inside it — a Google Sheet for influencer tracking, a verbal conversation for priority negotiation, a morning meeting for task allocation. Each time, the question was the same: why is this still happening outside? That question drove the roadmap more reliably than any planned feature list.

**Shipping is the beginning, not the finish line.** Getting the product built and deployed is the tractable part. Getting thirty people to change their daily behaviour — to open a new tool instead of sending a Slack message — is the harder, slower work. That gap does not close through better features alone. It closes through accountability loops, visible consequences, and time.

---

*Vivek Prajapati, AI Engineer and Product Manager, Chord, Mumbai, 2026*
