'use client';

import { useState } from 'react';
import TaskCreateModal from './task-create-modal';

type Brand = { id: string; name: string; slug: string };
type Person = { id: string; name: string; department: string };

export default function TaskCreateButton({
  brands,
  people,
}: {
  brands: Brand[];
  people: Person[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-mono uppercase tracking-[0.12em] px-5 py-2.5 rounded-full hover:opacity-90 transition shadow-[4px_4px_0_var(--gray)]"
        style={{ background: 'var(--ink)', color: 'var(--cream)' }}
      >
        + New Task
      </button>
      {open && (
        <TaskCreateModal
          brands={brands}
          people={people}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
