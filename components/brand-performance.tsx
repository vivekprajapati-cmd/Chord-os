'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type Brand = { id: string; name: string; slug: string };

type OpsDoc = {
  id: string;
  brand_id: string;
  doc_type: string;
  month: string;
  week: number;
  link: string | null;
  file_path: string | null;
  brands: { id: string; name: string; slug: string } | null;
};

type FeedMetrics = {
  totalReach: number;
  totalViews: number;
  totalEngagement: number;
  postCount: number;
  avgER: number;
};

type StoryMetrics = {
  totalReach: number;
  totalViews: number;
  totalEngaged: number;
  storyCount: number;
};

type BrandMetrics = {
  brand: Brand;
  feed: FeedMetrics;
  story: StoryMetrics;
  postsPerWeek: number;
  ormDoc: OpsDoc | null;
  reviewDoc: OpsDoc | null;
  updatedAt: string | null;
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

function monthLabel(m: string) {
  const [year, month] = m.split('-');
  return `${MONTHS[parseInt(month) - 1]} ${year}`;
}

function getBrandInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function parseNum(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
}

function parsePercent(s: string): number {
  if (!s) return 0;
  return parseFloat(s.replace('%', '').trim()) || 0;
}

// Derive ISO week number from a date
function getWeekOfMonth(dateStr: string): number {
  // dateStr format: D/M/YY or D/M/YYYY
  const parts = dateStr.split('/');
  if (parts.length < 3) return 0;
  const day = parseInt(parts[0]);
  return Math.ceil(day / 7);
}

function parseCSV(text: string, weekFilter: number): { feed: FeedMetrics; story: StoryMetrics } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Find header row — it contains 'Date' and 'Post Link'
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Date') && lines[i].includes('Post Link')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { feed: emptyFeed(), story: emptyStory() };

  const headers = splitCSVLine(lines[headerIdx]);

  // Column indices — feed
  const iDate       = headers.findIndex(h => h.trim() === 'Date');
  const iReach      = headers.findIndex(h => h.trim() === 'Total Reach');
  const iViews      = headers.findIndex(h => h.trim() === 'Impression / Plays/views');
  const iEngagement = headers.findIndex(h => h.trim() === 'Total Engagement');
  const iER         = headers.findIndex(h => h.trim() === 'ER% total');

  // Story columns start after 'STORY' marker — find by label
  const iStoryDate    = headers.findIndex(h => h.trim() === 'Story Live Date');
  const iStoryReach   = headers.findIndex((h, i) => h.trim() === 'Reach' && i > 30);
  const iStoryViews   = headers.findIndex((h, i) => (h.trim() === 'Impressions/Views' || h.trim() === 'Impressions/Views') && i > 30);
  const iStoryEngaged = headers.findIndex((h, i) => h.trim() === 'Accounts Engaged' && i > 30);

  const feed: FeedMetrics = emptyFeed();
  const story: StoryMetrics = emptyStory();

  const seenStoryDates = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (!cols || cols.length < 5) continue;

    const dateStr = iDate >= 0 ? (cols[iDate] ?? '').trim() : '';
    const week = dateStr ? getWeekOfMonth(dateStr) : 0;

    // Feed row — must have a date and reach
    if (dateStr && (weekFilter === 0 || week === weekFilter)) {
      const reach = parseNum(cols[iReach] ?? '');
      const views = parseNum(cols[iViews] ?? '');
      const eng   = parseNum(cols[iEngagement] ?? '');
      const er    = parsePercent(cols[iER] ?? '');

      // Skip outlier rows (ER > 50% — likely data errors)
      if (reach > 0 && er < 50) {
        feed.totalReach      += reach;
        feed.totalViews      += views;
        feed.totalEngagement += eng;
        feed.avgER           += er;
        feed.postCount++;
      }
    }

    // Story row — independent column block
    if (iStoryDate >= 0) {
      const storyDateStr = (cols[iStoryDate] ?? '').trim();
      const storyWeek = storyDateStr ? getWeekOfMonth(storyDateStr) : 0;
      if (storyDateStr && (weekFilter === 0 || storyWeek === weekFilter) && !seenStoryDates.has(storyDateStr + (cols[iStoryDate + 1] ?? ''))) {
        seenStoryDates.add(storyDateStr + (cols[iStoryDate + 1] ?? ''));
        const sReach   = parseNum(cols[iStoryReach] ?? '');
        const sViews   = parseNum(cols[iStoryViews] ?? '');
        const sEngaged = parseNum(cols[iStoryEngaged] ?? '');
        if (sReach > 0) {
          story.totalReach   += sReach;
          story.totalViews   += sViews;
          story.totalEngaged += sEngaged;
          story.storyCount++;
        }
      }
    }
  }

  if (feed.postCount > 0) feed.avgER = feed.avgER / feed.postCount;
  return { feed, story };
}

function emptyFeed(): FeedMetrics {
  return { totalReach: 0, totalViews: 0, totalEngagement: 0, postCount: 0, avgER: 0 };
}

function emptyStory(): StoryMetrics {
  return { totalReach: 0, totalViews: 0, totalEngaged: 0, storyCount: 0 };
}

// Handles quoted CSV fields with commas inside
function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuote = !inQuote; continue; }
    if (c === ',' && !inQuote) { result.push(cur); cur = ''; continue; }
    cur += c;
  }
  result.push(cur);
  return result;
}

function MonthYearPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, mon] = value ? value.split('-') : ['', ''];
  const sel: React.CSSProperties = {
    fontFamily: 'var(--f-mono)', fontSize: '11px',
    background: 'var(--paper)', border: '1px solid var(--line)',
    borderRadius: '8px', padding: '6px 10px',
    color: 'var(--ink)', cursor: 'pointer', outline: 'none',
  };
  return (
    <div style={{ display: 'flex', gap: '4px' }}>
      <select
        value={mon}
        onChange={e => {
          if (!e.target.value) { onChange(''); return; }
          onChange(`${year || new Date().getFullYear()}-${e.target.value}`);
        }}
        style={sel}
      >
        <option value=''>All Months</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
        ))}
      </select>
      {mon && (
        <select value={year} onChange={e => onChange(`${e.target.value}-${mon}`)} style={sel}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      )}
    </div>
  );
}

export default function BrandPerformance({
  brands,
  allDocs,
}: {
  brands: Brand[];
  allDocs: OpsDoc[];
}) {
  const supabase = createClient();
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const currentMonth = `${nowIST.getUTCFullYear()}-${String(nowIST.getUTCMonth() + 1).padStart(2, '0')}`;

  const [filterBrand, setFilterBrand] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterWeek, setFilterWeek] = useState(0);
  const [metrics, setMetrics] = useState<BrandMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sel: React.CSSProperties = {
    fontFamily: 'var(--f-mono)', fontSize: '11px',
    background: 'var(--paper)', border: '1px solid var(--line)',
    borderRadius: '8px', padding: '6px 10px',
    color: 'var(--ink)', cursor: 'pointer', outline: 'none',
  };

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError('');

    const targetBrands = filterBrand
      ? brands.filter(b => b.id === filterBrand)
      : brands;

    const results: BrandMetrics[] = [];

    for (const brand of targetBrands) {
      // Find weekly tracker doc for this brand + month
      const trackerDoc = allDocs.find(d =>
        d.brand_id === brand.id &&
        d.doc_type === 'weekly_tracker' &&
        (!filterMonth || d.month === filterMonth)
      );

      const ormDoc = allDocs.find(d =>
        d.brand_id === brand.id &&
        d.doc_type === 'orm_report' &&
        (!filterMonth || d.month === filterMonth)
      ) ?? null;

      const reviewDoc = allDocs.find(d =>
        d.brand_id === brand.id &&
        d.doc_type === 'review_deck' &&
        (!filterMonth || d.month === filterMonth)
      ) ?? null;

      if (!trackerDoc?.file_path) {
        results.push({ brand, feed: emptyFeed(), story: emptyStory(), postsPerWeek: 0, ormDoc, reviewDoc, updatedAt: null });
        continue;
      }

      try {
        const { data: urlData } = await supabase.storage
          .from('briefings')
          .createSignedUrl(trackerDoc.file_path, 300);

        if (!urlData?.signedUrl) {
          results.push({ brand, feed: emptyFeed(), story: emptyStory(), postsPerWeek: 0, ormDoc, reviewDoc, updatedAt: null });
          continue;
        }

        const res = await fetch(urlData.signedUrl);
        const text = await res.text();
        const { feed, story } = parseCSV(text, filterWeek);

        results.push({
          brand,
          feed,
          story,
          postsPerWeek: feed.postCount,
          ormDoc,
          reviewDoc,
          updatedAt: trackerDoc ? new Date().toISOString() : null,
        });
      } catch {
        results.push({ brand, feed: emptyFeed(), story: emptyStory(), postsPerWeek: 0, ormDoc, reviewDoc, updatedAt: null });
      }
    }

    setMetrics(results);
    setLoading(false);
  }, [filterBrand, filterMonth, filterWeek, brands, allDocs, supabase]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  async function openDoc(doc: OpsDoc) {
    if (doc.link) { window.open(doc.link, '_blank'); return; }
    if (doc.file_path) {
      const { data } = await supabase.storage.from('briefings').createSignedUrl(doc.file_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    }
  }

  // Aggregate totals across all brands
  const totals = metrics.reduce(
    (acc, m) => ({
      reach: acc.reach + m.feed.totalReach,
      views: acc.views + m.feed.totalViews,
      engagement: acc.engagement + m.feed.totalEngagement,
      posts: acc.posts + m.feed.postCount,
      erSum: acc.erSum + m.feed.avgER,
      erCount: acc.erCount + (m.feed.postCount > 0 ? 1 : 0),
    }),
    { reach: 0, views: 0, engagement: 0, posts: 0, erSum: 0, erCount: 0 }
  );
  const avgER = totals.erCount > 0 ? totals.erSum / totals.erCount : 0;

  const hasData = metrics.some(m => m.feed.postCount > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)' }}>
            Brand Performance
          </p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', marginTop: '2px' }}>
            Performance metrics from Weekly Tracker CSV data
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} style={sel}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <MonthYearPicker value={filterMonth} onChange={setFilterMonth} />
        <select value={filterWeek} onChange={e => setFilterWeek(parseInt(e.target.value))} style={sel}>
          <option value={0}>All Weeks</option>
          {[1,2,3,4,5].map(w => <option key={w} value={w}>Week {w}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>Loading metrics…</p>
        </div>
      ) : !hasData ? (
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '16px', padding: '60px 40px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--f-display)', fontSize: '24px', textTransform: 'uppercase', color: 'var(--gray)', marginBottom: '6px' }}>
            No data
          </p>
          <p style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)' }}>
            Upload a Weekly Tracker CSV via Brand Documents{filterMonth ? ` for ${monthLabel(filterMonth)}` : ''}.
          </p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { label: 'TOTAL REACH',       value: fmtNum(totals.reach),          icon: '◎', iconBg: '#D6F5E3', iconColor: '#2E8B57' },
              { label: 'TOTAL VIEWS',       value: fmtNum(totals.views),           icon: '◉', iconBg: '#E8E0F7', iconColor: '#6B46C1' },
              { label: 'ENGAGEMENT RATE',   value: `${avgER.toFixed(2)}%`,         icon: '♡', iconBg: '#FCE4EC', iconColor: '#C2185B' },
              { label: 'POSTS THIS MONTH',  value: String(totals.posts),           icon: '◷', iconBg: '#FFF3E0', iconColor: '#E65100' },
            ].map(({ label, value, icon, iconBg, iconColor }) => (
              <div
                key={label}
                style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '18px', padding: '20px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '18px', color: iconColor, lineHeight: 1 }}>{icon}</span>
                </div>
                <div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--gray)', marginBottom: '4px' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--f-body)', fontSize: '28px', fontWeight: 800, lineHeight: 1, color: 'var(--ink)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Brand cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {metrics.filter(m => m.feed.postCount > 0 || m.story.storyCount > 0).map(m => {
              const feedRows = [
                { label: 'Reach',            value: fmtNum(m.feed.totalReach) },
                { label: 'Views',            value: fmtNum(m.feed.totalViews) },
                { label: 'Engagement Rate',  value: `${m.feed.avgER.toFixed(2)}%` },
                { label: 'Posts / Month',    value: String(m.postsPerWeek) },
              ];
              const storyRows = m.story.storyCount > 0 ? [
                { label: 'Story Reach',    value: fmtNum(m.story.totalReach) },
                { label: 'Story Views',    value: fmtNum(m.story.totalViews) },
                { label: 'Story Engaged',  value: fmtNum(m.story.totalEngaged) },
                { label: 'Stories',        value: String(m.story.storyCount) },
              ] : [];
              const hasDocs = !!(m.ormDoc || m.reviewDoc);
              return (
                <div
                  key={m.brand.id}
                  style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '18px', padding: '20px 22px 16px', display: 'flex', flexDirection: 'column', gap: '0' }}
                >
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--ink)', color: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f-mono)', fontSize: '13px', fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em' }}>
                        {getBrandInitials(m.brand.name)}
                      </div>
                      <p style={{ fontFamily: 'var(--f-body)', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                        {m.brand.name}
                      </p>
                    </div>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: '18px', color: 'var(--gray)', lineHeight: 1, letterSpacing: '0.1em', userSelect: 'none' }}>⋯</span>
                  </div>

                  {/* Feed metric rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: storyRows.length ? '10px' : '0' }}>
                    {feedRows.map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--ink)', display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)' }}>{label}</span>
                        </div>
                        <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Story metric rows */}
                  {storyRows.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingTop: '4px', borderTop: '1px solid var(--line)', marginBottom: '0' }}>
                      {storyRows.map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gray)', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)' }}>{label}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Doc links */}
                  {hasDocs && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                      {m.ormDoc && (
                        <button
                          onClick={() => openDoc(m.ormDoc!)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', textAlign: 'left' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '14px', color: 'var(--gray)' }}>☐</span>
                            <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)' }}>ORM Report</span>
                          </div>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--gray)' }}>↗</span>
                        </button>
                      )}
                      {m.reviewDoc && (
                        <button
                          onClick={() => openDoc(m.reviewDoc!)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', textAlign: 'left' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--f-mono)', fontSize: '14px', color: 'var(--gray)' }}>☐</span>
                            <span style={{ fontFamily: 'var(--f-body)', fontSize: '13px', color: 'var(--ink)' }}>Review Deck</span>
                          </div>
                          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '13px', color: 'var(--gray)' }}>↗</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', color: 'var(--gray)' }}>🕐</span>
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Updated Today</span>
                    </div>
                    <a
                      href={`/brands/${m.brand.slug}`}
                      style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--ink)', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      VIEW DETAILS <span style={{ fontSize: '13px' }}>↗</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
