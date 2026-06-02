// Slack notifications via webhook to #chord-os in edernityteam.slack.com

export async function notifySlack(message: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn('[slack] SLACK_WEBHOOK_URL not set — skipping notification');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    if (!res.ok) console.error('[slack] webhook failed:', res.status, await res.text());
  } catch (e) {
    console.error('[slack] error:', e);
  }
}

// Convenience helpers
export const slack = {
  newBlock: (person: string, brand: string, hours: number, start: string) =>
    notifySlack(`📅 *New block* — ${person} blocked ${hours}h for *${brand}* starting ${start}`),
  overrun: (person: string, brand: string) =>
    notifySlack(`⚠️ *Overrun* — ${person} hasn't marked the *${brand}* block as done`),
  readyForReview: (reviewer: string, owner: string, brand: string) =>
    notifySlack(`✅ *Ready for review* — ${owner} finished a *${brand}* task. ${reviewer} please review.`),
  gateFailed: (person: string, brand: string, gate: string) =>
    notifySlack(`🚧 *AI gate failed* — ${person}'s *${brand}* work failed the ${gate} check`),
  reassigned: (deliverable: string, from: string, to: string, by: string) =>
    notifySlack(`🔁 *Reassigned* — "${deliverable}" moved from *${from}* to *${to}* by ${by}`),
  acknowledged: (person: string, deliverable: string, brand: string) =>
    notifySlack(`👀 *Acknowledged* — ${person} confirmed: "${deliverable}" (${brand})`),
  submitted: (person: string, deliverable: string, brand: string, reviewer: string, link: string) =>
    notifySlack(`📎 *Submitted* — ${person} submitted "${deliverable}" (${brand}). ${reviewer ? `${reviewer} to review.` : 'Awaiting reviewer.'}\n🔗 ${link}`),
  delayed: (person: string, deliverable: string, brand: string, daysLate: number) =>
    notifySlack(`⚠️ *Delayed* — "${deliverable}" (${brand}) assigned to *${person}* is ${daysLate} day${daysLate !== 1 ? 's' : ''} overdue. No submission yet.`),
  repeatDelay: (person: string, count: number) =>
    notifySlack(`🚨 *Repeat delay — ${person}* has accumulated ${count} delays this month. Flag for review.`),
  revisionRequested: (reviewer: string, person: string, deliverable: string, brand: string, round: number, notes: string) =>
    notifySlack(`🔄 *Rework requested (Round ${round})* — ${reviewer} requested changes on "${deliverable}" (${brand}) from *${person}*.\nNotes: ${notes}`),
  revisionThreshold: (deliverable: string, brand: string, round: number) =>
    notifySlack(`🚩 *Revision alert* — "${deliverable}" (${brand}) is on round *${round}*. Escalate to manager for sync.`),
  approved: (person: string, deliverable: string, brand: string, approver: string) =>
    notifySlack(`✅ *Approved* — "${deliverable}" (${brand}) by *${person}* approved by ${approver}. Ready to ship.`),
};
