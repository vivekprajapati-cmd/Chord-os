'use client';

import { useState } from 'react';
import TaskDetailModal from '@/components/task-detail-modal';
import { useRouter } from 'next/navigation';

type BrandTask = {
  id: string;
  deliverable: string;
  status: string;
  priority: string;
  deadline: string | null;
  task_type: string | null;
  owner: { name: string } | null;
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  scheduled:        { bg: 'rgba(13,13,11,0.06)',   color: 'var(--gray)' },
  pending:          { bg: 'rgba(13,13,11,0.06)',   color: 'var(--gray)' },
  in_progress:      { bg: 'rgba(34,38,217,0.08)',  color: '#2226D9' },
  ready_for_review: { bg: 'rgba(233,196,106,0.2)', color: '#7a5c00' },
  review:           { bg: 'rgba(233,196,106,0.2)', color: '#7a5c00' },
  rework:           { bg: 'rgba(229,93,74,0.1)',   color: 'var(--coral)' },
  approved:         { bg: 'rgba(42,157,92,0.1)',   color: '#1a7a45' },
  done:             { bg: 'rgba(42,157,92,0.1)',   color: '#1a7a45' },
};

export default function BrandTasksList({ tasks }: { tasks: BrandTask[] }) {
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return <p className="text-sm text-[var(--gray)]">No tasks found for this brand.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {tasks.map(t => {
          const sc = STATUS_COLOR[t.status] ?? STATUS_COLOR.scheduled;
          return (
            <div
              key={t.id}
              onClick={() => setSelectedTaskId(t.id)}
              className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 hover:shadow-[4px_4px_0_var(--ink)] transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{t.deliverable}</p>
                  <p className="text-xs text-[var(--gray)] font-mono mt-0.5">
                    {t.owner?.name}
                    {t.task_type && ` · ${t.task_type}`}
                    {t.deadline && ` · due ${new Date(t.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-xs font-mono uppercase px-2 py-0.5 rounded"
                    style={sc}
                  >
                    {t.status.replace(/_/g, ' ')}
                  </span>
                  <span
                    className="text-xs font-mono uppercase border rounded px-2 py-0.5"
                    style={
                      t.priority === 'P0' ? { background: 'var(--red)', color: '#fff', border: 'none' } :
                      t.priority === 'P1' ? { background: 'var(--ink)', color: 'var(--cream)', border: 'none' } :
                      { borderColor: 'var(--line)' }
                    }
                  >
                    {t.priority}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => { setSelectedTaskId(null); router.refresh(); }}
        />
      )}
    </>
  );
}
