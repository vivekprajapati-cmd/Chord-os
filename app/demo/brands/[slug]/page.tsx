import { MOCK_BRANDS, MOCK_TASKS } from '@/lib/mock-data';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function DemoBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = MOCK_BRANDS.find(b => b.slug === slug);
  if (!brand) notFound();

  const brandTasks = MOCK_TASKS.filter(t => t.brands?.name === brand.name);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/demo/brands" className="text-xs font-mono uppercase text-[var(--cobalt)] hover:opacity-70">← Brands</Link>
        <h1 className="font-display text-6xl uppercase tracking-tight mt-3">{brand.name}</h1>
        <p className="text-sm text-[var(--gray)] font-mono mt-1">{brand.category} · {brand.tier}</p>
      </div>

      {/* Colors */}
      <section>
        <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">Brand Colors</p>
        <div className="flex gap-4 flex-wrap">
          {Object.entries(brand.colors).map(([name, hex]) => (
            <div key={name} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-[var(--line)] shadow-[4px_4px_0_var(--ink)]" style={{ background: hex }} />
              <div>
                <p className="text-xs font-mono uppercase text-[var(--gray)]">{name}</p>
                <p className="text-xs font-mono font-medium">{hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">Typography</p>
        <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 space-y-1">
          {Object.entries(brand.typography).map(([role, font]) => (
            <div key={role} className="flex gap-4 text-sm">
              <span className="font-mono text-xs text-[var(--gray)] uppercase w-20 shrink-0">{role}</span>
              <span>{font}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Voice */}
      {brand.voice_summary && (
        <section>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">Voice & Tone</p>
          <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-5">
            <p className="text-sm leading-relaxed">{brand.voice_summary}</p>
          </div>
        </section>
      )}

      {/* Active tasks */}
      {brandTasks.length > 0 && (
        <section>
          <p className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gray)] mb-3">Active Tasks ({brandTasks.length})</p>
          <div className="space-y-2">
            {brandTasks.map(task => (
              <div key={task.id} className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{task.deliverable}</p>
                  <p className="text-xs font-mono text-[var(--gray)]">{task.owner?.name} · {task.estimated_hours}h</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono uppercase px-2 py-0.5 rounded"
                    style={task.priority === 'P0' ? { background: 'var(--red)', color: '#fff' } : task.priority === 'P1' ? { background: 'var(--ink)', color: 'var(--cream)' } : { border: '1px solid var(--ink)' }}
                  >{task.priority}</span>
                  <span className="text-xs font-mono text-[var(--gray)] capitalize">{task.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
