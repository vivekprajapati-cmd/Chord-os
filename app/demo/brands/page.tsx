import Link from 'next/link';
import { MOCK_BRANDS } from '@/lib/mock-data';

export default function DemoBrandsPage() {
  return (
    <div>
      <h1 className="font-display text-5xl uppercase tracking-tight mb-6">Brands</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_BRANDS.map((b) => (
          <Link
            key={b.id}
            href={`/demo/brands/${b.slug}`}
            className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-[6px_6px_0_var(--ink)] hover:shadow-[8px_8px_0_var(--ink)] transition"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-display text-3xl uppercase tracking-tight">{b.name}</h2>
              <span className="text-xs font-mono uppercase border border-[var(--ink)] rounded-full px-2 py-0.5">{b.tier}</span>
            </div>
            <p className="text-sm text-[var(--gray)]">{b.category}</p>

            {/* Color swatch preview */}
            <div className="flex gap-2 mt-4">
              {Object.entries(b.colors).slice(0, 4).map(([name, hex]) => (
                <div
                  key={name}
                  title={`${name}: ${hex}`}
                  className="w-6 h-6 rounded-full border border-[var(--line)]"
                  style={{ background: hex }}
                />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
