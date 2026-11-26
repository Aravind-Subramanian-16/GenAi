import { ReliabilityMetrics } from '../types';

interface MetricCardsProps {
  metrics: ReliabilityMetrics;
  isRunning: boolean;
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(1)}%`;
}

export function MetricCards({ metrics, isRunning }: MetricCardsProps) {
  const hasResults = metrics.completedRows > 0;

  const lengthDelta =
    metrics.judgeLongerRate !== null && metrics.humanLongerCompletedRate !== null
      ? Math.round((metrics.judgeLongerRate - metrics.humanLongerCompletedRate) * 10) / 10
      : null;

  const flipTone =
    metrics.flipRate === null
      ? 'text-slate-900'
      : metrics.flipRate === 0
        ? 'text-emerald-700'
        : metrics.flipRate <= 20
          ? 'text-amber-700'
          : 'text-red-700';

  const agreementTone =
    metrics.consistentAgreementRate === null
      ? 'text-slate-900'
      : metrics.consistentAgreementRate >= 80
        ? 'text-emerald-700'
        : metrics.consistentAgreementRate >= 60
          ? 'text-amber-700'
          : 'text-red-700';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Agreement with Humans */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">Agreement with Humans</p>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span
              className={`font-mono text-3xl font-semibold tracking-tight tabular-nums ${agreementTone}`}
            >
              {formatPercent(metrics.consistentAgreementRate)}
            </span>
            {isRunning && !hasResults && (
              <span className="text-xs text-slate-500">Measuring…</span>
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
          {hasResults ? (
            <>
              <span className="font-mono tabular-nums text-slate-700">
                {metrics.consistentAgreementCount}/{metrics.completedRows} rows
              </span>
              <span aria-hidden="true">·</span>
              <span>Both runs match human</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {formatPercent(metrics.callLevelAgreementRate)} per call
              </span>
            </>
          ) : (
            <span>Run experiment to measure dual-pass human agreement</span>
          )}
        </div>
      </div>

      {/* Card 2: Position-Bias Flip Rate */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">Position-Bias Flip Rate</p>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span
              className={`font-mono text-3xl font-semibold tracking-tight tabular-nums ${flipTone}`}
            >
              {formatPercent(metrics.flipRate)}
            </span>
            {hasResults && (
              <span className="text-xs font-medium text-slate-500">
                {metrics.flipRate === 0
                  ? 'Order-invariant'
                  : metrics.flipRate !== null && metrics.flipRate <= 20
                    ? 'Moderate drift'
                    : 'High position bias'}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
          {hasResults ? (
            <>
              <span className="font-mono tabular-nums text-slate-700">
                {metrics.flippedCount}/{metrics.completedRows} flipped
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {metrics.primacyFlipCount} favored A
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {metrics.recencyFlipCount} favored B
              </span>
            </>
          ) : (
            <span>Tracks verdicts that change when Answer A and B are swapped</span>
          )}
        </div>
      </div>

      {/* Card 3: Longer-Answer Preference */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">Picks Longer Answer</p>
          <div className="mt-3 flex items-baseline gap-4">
            <div>
              <span className="block text-xs text-slate-500 mb-0.5">Judge</span>
              <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-blue-700">
                {formatPercent(metrics.judgeLongerRate)}
              </span>
            </div>
            <span className="text-slate-300 text-xl font-light" aria-hidden="true">
              /
            </span>
            <div>
              <span className="block text-xs text-slate-500 mb-0.5">Human</span>
              <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-slate-800">
                {formatPercent(
                  hasResults ? metrics.humanLongerCompletedRate : metrics.humanLongerRate
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
          {hasResults && lengthDelta !== null ? (
            <>
              <span
                className={`font-mono tabular-nums font-medium ${
                  Math.abs(lengthDelta) >= 15 ? 'text-amber-700' : 'text-slate-700'
                }`}
              >
                {lengthDelta > 0 ? `+${lengthDelta.toFixed(1)}` : lengthDelta.toFixed(1)} pp
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {lengthDelta > 5
                  ? 'Judge favors verbosity over humans'
                  : lengthDelta < -5
                    ? 'Judge favors conciseness over humans'
                    : 'Aligned with human length preference'}
              </span>
            </>
          ) : (
            <span>
              Baseline: humans prefer longer text in{' '}
              <span className="font-mono tabular-nums text-slate-700">
                {metrics.humanLongerCount}/{metrics.unequalLengthDatasetRows}
              </span>{' '}
              unequal rows
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
