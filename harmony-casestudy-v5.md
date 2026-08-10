# Harmony

### A task management system for a team that was absolutely, definitely, definitely working hard.

**Role:** AI Engineer, Product Manager
**Type:** Internal Tool, Org-Wide
**Timeline:** 0 to 1, In Production
**Users:** 30 to 40 people across creative, video, operations, and brand servicing
**Organisation:** Chord, Creative Marketing Agency, Mumbai

---

## The problem that everyone felt but nobody could prove

Here is a fun situation to be in: you have hired exactly the right number of people. You are paying them. They are showing up. They are, by all accounts, very busy. And somehow, the work is still not getting done.

Shivangi, the CEO, had a precise way of describing this: *"The problem that we were facing was that X was not delivering Y and the reason for it was undetermined. There were a lot of conversations from people and management — burnout, too many feedback rounds — but it was all happening on a very personal level. You cannot track it quantitatively."*

The team was pulling ten to twelve hour days. Backlogs were growing. And the official explanation was essentially vibes. Nobody at the top could see what was actually happening — because nobody had built a place for what was actually happening to live.

---

## What I saw when I showed up and paid attention

Before writing a single line of code, I decided to just watch.

Every morning, the team had a meeting to decide who was doing what. It lasted at least an hour. Assignments were given out loud, into the air, to people holding nothing to write with. By the afternoon, those assignments existed only in the memory of whoever received them — which, it turns out, is not a reliable storage system.

The part that really got me: watching Shivani re-brief the same task to the same interns two, sometimes three times in one day. The brief had been given. It had been discussed. It had been nodded at. And then it had completely ceased to exist, because it was never written down anywhere a person could actually find it later.

This was not a people problem. The interns were not secretly sabotaging the creative pipeline. The information just had nowhere to go. When work lives entirely in conversation, it evaporates the moment the conversation ends — and then everyone acts surprised when nothing gets done.

Shocking, truly.

---

## What five people told me when I asked them how things were going

Spoiler: not great.

**Shivani, Operations:** responsible for making sure thirty-plus people know what they are doing every day. Her method, pre-Harmony, involved approximately one and a half hours of logistics every morning plus repeating herself multiple times to anyone who forgot the brief — which was everyone. *"I have to give them the brief again and again. It is already there in the JSR. We had discussed it — but I have to give the brief again and again, once or twice in the day."* Her favourite part of the job, clearly.

**Shanvi, Brands Manager:** juggling fifteen to twenty-five creative outputs per week across multiple brands, each of which believed its content was the most important content in the building. Getting the video team to agree on a priority order required the kind of daily negotiation typically reserved for international diplomacy. *"When we actually go to the video team, because there are three or four brands with all high-priority content, organising the day gets a little difficult and frustrating at times."* Two to three hours of a nine-hour day, just on logistics. Completely normal. Totally fine.

**Pierre, Senior Art Director:** ran the creative and video team through morning meetings and word of mouth, which worked perfectly until something unexpected happened — which, at a creative agency, is every day. Ad-hoc requests would arrive, pass through three people in translation, and reach him at some point later, slightly unrecognisable. *"The only irritating part was the ad-hoc work because most of the time I would not really know about it. It would come to me suddenly from my juniors. Things get lost in translation."* A perfectly sustainable system.

**Shivangi, CEO:** could see none of this. No visibility into who was overloaded, who had nothing to do, or why a particular brand was quietly falling behind every month. *"Conversational gaps were increasing and their everyday coordination was getting almost to zero."*

And then there was Pratik, graphic designer — who, refreshingly, had things mostly under control. Task allocation took him ten to fifteen minutes a day. His team knew what they were doing. No chaos, no re-briefing, no WhatsApp archaeology. Genuinely impressive.

The catch: nobody outside his team knew any of this. The servicing team had no way to see what Pratik's people were working on without physically asking him. His whole operation was efficient and completely invisible. *"Earlier I would do the face-to-face communication. Now I am assigning tasks directly from here. Anyone can come — service people can also check what tasks they did two days ago. They get a track record. That is a plus point."* For Pratik, the problem was not the mess. It was the opacity.

Five people. Five different experiences of the same missing layer. Even the person who had it together was limited by it.

---

## What I built — and how it kept growing

Harmony started with four features: a dashboard, a task tab, a team view, and a brand directory. The idea was to answer exactly one question — is the right work assigned to the right person — and do nothing else.

Minimalism is easy to maintain until people start actually using a product.

Once the basics were in and stable, every new request came with a story attached.

**Task creation got more sophisticated.** Content agencies run on recurring cycles — the same deliverables, same brands, same calendar every month. Flexible date-range tasks also needed to exist, because not everything has a fixed time slot. Both were added.

**Then came the calendar.** Shivangi wanted to see each employee's blocked time for the day before assigning a new task on top of it — a reasonable thing to want before loading someone who is already fully booked. She also wanted it connected to Google Calendar so that meetings and calls showed up alongside work. A weekly grid per person, synced with Google Calendar, all in IST. Built.

**Then analytics.** Task completion rates, on-time delivery, hours logged — visible per employee, opened up to admins and leads for team-level review. So the original invisible problem — is X producing Y — finally had somewhere to be measured.

**Then the operations tab.** The ops team was running a weekly management tracker, an influencer campaign tracker, and a brand performance tracker across three separate Google Sheets, because of course they were. All three were pulled into Harmony via the Sheets API. One place, finally.

**Then a voice-controlled allocator.** Speak a task out loud, it gets transcribed and structured by AI. Because typing is, apparently, a lot of effort.

**And most recently, Admin Brain** — a live tab connected to a Google Spreadsheet tracking the entire team's monthly content backlog. Shivangi can now see operational data without opening a separate tool and wondering which version she is looking at.

Nine tabs. It started as four. The product roadmap was essentially: watch what people are still doing outside Harmony, and then bring it inside.

---

## What the feedback sessions confirmed

After launch I ran structured sessions with each of the five primary users. They were, on the whole, polite.

Shivani's request was immediate: a proper URL field inside tasks. She had been pasting Google Docs links as plain text in the brief, which technically works, in the same way a lot of things technically work. *"Sometimes it is easier to see the visual rather than it being in words. If it directly redirects them to that, it will be easier for them."* Shipped.

Shanvi validated the priority system and flagged that onboarding new hires still requires a manual step to assign access tiers — reasonable feedback, noted for the next version.

Pierre had no new requests. *"The moment you start using it, it doesn't take you time to really understand the whole system. It's very simple."* High praise from someone who described pre-Harmony task management as entirely manual word of mouth.

Pratik was, predictably, fine. Twenty-five to thirty tasks assigned per week, no interface confusion, no complaints. His main observation: the servicing team can now check his team's task history independently, without looping him in for every question. Which means fewer interruptions for the one person who was already managing things well. Harmony rewarded the organised one by leaving him alone more often.

Shivangi gave it a 7 out of 10 for reducing operational confusion. Her exact words: *"The gap still is getting people to do it and use the tool."* The product works. Getting an entire organisation to change its daily habits is, as it turns out, a separate and considerably slower project.

---

## Things I could have built but chose not to

**Manual time tracking.** Harmony does capture hours — when a block is assigned to a task on the calendar, the duration is logged. But that is passive, a byproduct of scheduling. Making people manually enter time spent on every task would have created overhead, resentment, and data that nobody trusted because everyone was gaming it.

**A client-facing dashboard.** Clients do have access — a scoped read-only view of their own brand's tasks. But they do not see cross-brand data, internal allocation logic, or anything that would give them a reason to start questioning the agency's priorities out loud.

**A chat layer inside tasks.** Chord has Slack. Adding a second place to send messages would have created a second place to miss messages. Nobody needed that.

**Automated task creation.** The brief is the product. If a task creates itself, nobody writes the brief. If nobody writes the brief, Shivani goes back to explaining the same thing three times a day, which is exactly where this whole thing started.

Shanvi put it better than I could: *"It's a very simple interface to understand. It's quite direct, so I really appreciate it."* That simplicity came from saying no to a lot of things that seemed reasonable until you thought about who was actually going to use them.

---

## What actually changed

Shivani does not re-brief tasks anymore. The brief is in the task. It does not evaporate.

Shanvi stopped running behind the video team at eleven PM before a deadline. *"We get creatives in a more orderly manner and fashion now and I don't have to sort of run behind the video team or hustle in the last few hours to match a deadline. That has definitely reduced."*

Pierre opens the dashboard on Monday morning and knows what every person on his team is working on — without asking anyone, without waiting for a reply, without a meeting.

Shivangi can see allocation and output at the org level. The question she started with — why is X not producing Y — now has a place to be answered rather than debated in WhatsApp.

Thirty to forty people use this every day. The entire org. Not a pilot, not a proof of concept — the actual company, actually using it.

---

## The part where I admit it is not perfect

The 7 out of 10 is honest. The morning meeting has not fully died. Some people still default to Slack for things that should be in Harmony. Getting thirty people to permanently change how they work every day is not something that happens because you shipped a product — it happens slowly, through accountability and repetition and visible consequences.

The next version of Harmony needs to make the cost of not using it felt before a deadline slips rather than after. Smarter reminders. Signals that something is overdue before it becomes a problem. Something that makes opening Harmony feel necessary rather than optional.

That is the work still left to do. And yes, it will probably require building more tabs.

---

## What I actually learned from all of this

**Watch the workflow, not the complaints.** People told me they were stressed and overworked. That was true, but it was not the thing to fix. Watching Shivani repeat herself three times in a morning told me exactly what to build. You cannot design for the feeling. You have to find the mechanism.

**The product roadmap was just a list of things people were still doing outside Harmony.** Every new tab existed because someone was managing something in a Google Sheet that should have been inside the product. The question "why is this still happening outside?" turned out to be a better roadmap than anything I planned upfront.

**Shipping is not the hard part. Behaviour change is.** Four features became nine because the product kept growing to meet reality. But getting people to open it every day without being told — that is the part that does not respond to better engineering. It responds to time, and consequences, and leadership that holds the standard.

---

*Vivek Prajapati, AI Engineer and Product Manager, Chord, Mumbai, 2026*
