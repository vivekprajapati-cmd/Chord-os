'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface DataPoint {
  label: string;
  value: number | null;
}

interface PortalLineChartProps {
  data: DataPoint[];
  color?: string;
  unit?: string;
  showGrid?: boolean;
}

function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--ink)', color: 'var(--cream)', borderRadius: '8px',
      padding: '8px 12px', fontFamily: 'var(--f-mono)', fontSize: '11px',
    }}>
      <p style={{ opacity: 0.6, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '9px' }}>{label}</p>
      <p>{payload[0].value !== null ? `${payload[0].value}${unit ?? ''}` : '—'}</p>
    </div>
  );
}

export default function PortalLineChart({ data, color = 'var(--cobalt)', unit = '', showGrid = false }: PortalLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,13,11,0.08)" vertical={false} />}
        <XAxis
          dataKey="label"
          tick={{ fontFamily: 'var(--f-mono)', fontSize: 9, fill: 'var(--gray)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontFamily: 'var(--f-mono)', fontSize: 9, fill: 'var(--gray)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}${unit}`}
          domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip unit={unit} />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
