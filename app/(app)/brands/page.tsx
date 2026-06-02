import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: brands } = await supabase
    .from('brands')
    .select('id, slug, name, category, tier, status')
    .order('name');

  return (
    <div>
      <h1 className="font-display text-5xl uppercase tracking-tight mb-6">Brands</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {brands?.map((b: any) => (
          <Link
            key={b.id}
            href={`/brands/${b.slug}`}
            className="bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-6 shadow-[6px_6px_0_var(--ink)] hover:shadow-[8px_8px_0_var(--ink)] transition"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-display text-3xl uppercase tracking-tight">{b.name}</h2>
              <span className="text-xs font-mono uppercase border border-[var(--ink)] rounded-full px-2 py-0.5">
                {b.tier}
              </span>
            </div>
            <p className="text-sm text-[var(--gray)]">{b.category}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
