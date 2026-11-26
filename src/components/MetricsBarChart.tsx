import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ReliabilityMetrics } from '../types';

interface MetricsBarChartProps {
  metrics: ReliabilityMetrics;
}

interface ChartDatum {
  key: string;
  label: string;
  value: number;
  color: string;
  detail: string;
  description: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-white border border-slate-200 rounded-md px-3.5 py-2.5 shadow-sm max-w-xs">
      <p className="text-xs font-semibold text-slate-900">{item.label}</p>
      <p className="mt-1 font-mono text-base font-semibold tabular-nums text-slate-900">
        {item.value.toFixed(1)}%
      </p>
      <p className="mt-0.5 font-mono text-xs text-slate-600 tabular-nums">{item.detail}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.description}</p>
    </div>
  );
}

export function MetricsBarChart({ metrics }: MetricsBarChartProps) {
  const hasResults = metrics.completedRows > 0;

  const data: ChartDatum[] = [
    {
      key: 'agreement',
      label: 'Human Agreement',
      value: metrics.consistentAgreementRate ?? 0,
      color: '#15803D',
      detail: `${metrics.consistentAgreementCount} / ${metrics.completedRows} rows`,
      description: 'Both original and swapped passes agreed with the human winner.',
    },
    {
      key: 'flip',
      label: 'Position Flip Rate',
      value: metrics.flipRate ?? 0,
      color: '#D97706',
      detail: `${metrics.flippedCount} / ${metrics.completedRows} rows`,
      description: 'Verdict changed when Answer A and Answer B were swapped.',
    },
    {
      key: 'judgeLonger',
      label: 'Judge Picks Longer',
      value: metrics.judgeLongerRate ?? 0,
      color: '#1D4ED8',
      detail: `${metrics.judgeLongerCallsCount} / ${metrics.unequalLengthCompletedCalls} calls`,
      description: 'Share of judge verdicts favoring the longer answer.',
    },
    {
      key: 'humanLonger',
      label: 'Human Picks Longer',
      value: hasResults
        ? (metrics.humanLongerCompletedRate ?? 0)
        : (metrics.humanLongerRate ?? 0),
      color: '#475569',
      detail: hasResults
        ? `${metrics.humanLongerCompletedCount} / ${metrics.humanLongerCompletedTotal} rows`
        : `${metrics.humanLongerCount} / ${metrics.unequalLengthDatasetRows} rows`,
      description: 'Share of human ground-truth labels favoring the longer answer.',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Reliability Metrics Comparison
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {hasResults
              ? `Measured across ${metrics.completedRows} evaluated row${metrics.completedRows === 1 ? '' : 's'} (${metrics.completedRows * 2} Gemini calls)`
              : 'Human baseline shown; run the experiment to populate judge metrics'}
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums">Scale: 0% – 100%</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 24, right: 16, left: 0, bottom: 8 }}
              barCategoryGap="24%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#334155', fontSize: 12, fontWeight: 500 }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fill: '#64748B', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: '#F1F5F9', opacity: 0.7 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={68} isAnimationActive={false}>
                {data.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.color}
                    fillOpacity={!hasResults && entry.key !== 'humanLonger' ? 0.2 : 1}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: unknown) => {
                    const num = typeof v === 'number' ? v : 0;
                    return `${num.toFixed(1)}%`;
                  }}
                  style={{
                    fill: '#0F172A',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Diagnostic breakdown alongside chart */}
        <div className="lg:col-span-4 lg:border-l lg:border-slate-100 lg:pl-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Signal Breakdown</h3>
          <dl className="space-y-3 text-sm">
            {data.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <dt className="text-slate-700 font-medium leading-snug">{item.label}</dt>
                    <dd className="text-xs text-slate-500 font-mono tabular-nums">
                      {!hasResults && item.key !== 'humanLonger' ? 'Pending run' : item.detail}
                    </dd>
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 shrink-0">
                  {!hasResults && item.key !== 'humanLonger'
                    ? '—'
                    : `${item.value.toFixed(1)}%`}
                </span>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
