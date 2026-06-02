import { NextResponse } from 'next/server';
import { notifySlack } from '@/lib/slack';

export async function POST(req: Request) {
  const body = await req.json();
  const { type, task, reviewer, from, to, by, person, round, notes, link, days_late, delay_count, approver } = body;

  let message = '';

  if (type === 'task_approved') {
    message = `✅ *Approved* — "${task.deliverable}" (${task.brand}) approved by ${approver ?? reviewer ?? 'manager'}. Ready to ship.`;
  } else if (type === 'task_rework_requested') {
    message = `🔄 *Rework requested (Round ${round ?? 1})* — ${reviewer} requested changes on "${task.deliverable}" (${task.brand}) from *${person ?? 'assignee'}*.\nNotes: ${notes ?? 'No notes provided.'}`;
  } else if (type === 'task_reassigned') {
    message = `🔁 *Reassigned* — "${task.deliverable}" moved from *${from}* to *${to}* by ${by}`;
  } else if (type === 'task_acknowledged') {
    message = `👀 *Acknowledged* — ${person} confirmed: "${task.deliverable}" (${task.brand})`;
  } else if (type === 'task_submitted') {
    message = `📎 *Submitted* — ${person} submitted "${task.deliverable}" (${task.brand}). ${reviewer ? `${reviewer} to review.` : 'Awaiting reviewer.'}\n🔗 ${link}`;
  } else if (type === 'task_delayed') {
    message = `⚠️ *Delayed* — "${task.deliverable}" (${task.brand}) assigned to *${person}* is ${days_late} day${days_late !== 1 ? 's' : ''} overdue. No submission yet.`;
  } else if (type === 'repeat_delay') {
    message = `🚨 *Repeat delay* — *${person}* has accumulated ${delay_count} delays this month. Flag for review.`;
  } else if (type === 'revision_threshold') {
    message = `🚩 *Revision alert* — "${task.deliverable}" (${task.brand}) is on round *${round}*. Escalate to manager for sync.`;
  }

  try {
    await notifySlack(message);
  } catch (err) {
    console.error('Slack notification failed:', err);
  }

  return NextResponse.json({ ok: true });
}
