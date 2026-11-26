import { Fragment, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  RotateCw,
  X,
} from 'lucide-react';
import { EvalRow, RowJudgeResult } from '../types';

interface ResultsTableProps {
  rows: EvalRow[];
  resultsById: Record<string, RowJudgeResult>;
  isRunning: boolean;
  onDownloadCsv: () => void;
  onRetryRow: (row: EvalRow) => void;
}

type ResultFilter = 'all' | 'agreed' | 'disagreed' | 'flipped' | 'errors';

export function ResultsTable({
  rows,
  resultsById,
  isRunning,
  onDownloadCsv,
  onRetryRow,
}: ResultsTableProps) {
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const counts = useMemo(() => {
    let completed = 0;
    let agreed = 0;
    let disagreed = 0;
    let flipped = 0;
    let errors = 0;

    for (const row of rows) {
      const r = resultsById[row.id];
      if (!r) continue;
      if (r.status === 'completed') {
        completed++;
        if (r.agreeWithHuman) agreed++;
        else disagreed++;
        if (r.flipped) flipped++;
      } else if (r.status === 'error') {
        errors++;
      }
    }

    return { total: rows.length, completed, agreed, disagreed, flipped, errors };
  }, [rows, resultsById]);

  const visibleEntries = useMemo(() => {
    return rows
      .map((row, idx) => ({ row, originalIndex: idx, result: resultsById[row.id] }))
      .filter(({ result }) => {
        if (filter === 'all') return true;
        if (!result) return false;
        if (filter === 'agreed') return result.status === 'completed' && result.agreeWithHuman === true;
        if (filter === 'disagreed')
          return result.status === 'completed' && result.agreeWithHuman === false;
        if (filter === 'flipped') return result.status === 'completed' && result.flipped === true;
        if (filter === 'errors') return result.status === 'error';
        return true;
      });
  }, [rows, resultsById, filter]);

  const hasAnyResult = counts.completed > 0 || counts.errors > 0;

  return (
    <section id="results" className="scroll-mt-24">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-base font-semibold text-slate-900">Experiment Results</h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {counts.completed}/{counts.total} completed
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Run 2 presents answers in swapped order (A = Answer 2, B = Answer 1) and maps verdicts back to original answer numbers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter segmented control */}
            <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-md">
              {(
                [
                  { id: 'all', label: `All (${counts.total})` },
                  { id: 'agreed', label: `Agreed (${counts.agreed})` },
                  { id: 'disagreed', label: `Disagreed (${counts.disagreed})` },
                  { id: 'flipped', label: `Flipped (${counts.flipped})` },
                  ...(counts.errors > 0 ? [{ id: 'errors' as ResultFilter, label: `Errors (${counts.errors})` }] : []),
                ] as Array<{ id: ResultFilter; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    filter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onDownloadCsv}
              disabled={!hasAnyResult}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Results as CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        {!hasAnyResult && !isRunning ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-900">No experiment results yet</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Click <strong className="font-medium text-slate-800">Run Experiment</strong> to evaluate
              each row twice with Gemini (original order and swapped order) and measure agreement,
              position bias, and length preference.
            </p>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No rows match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                  <th className="py-3 pl-6 pr-2 w-10" aria-label="Expand row" />
                  <th className="py-3 px-2 w-10 font-mono">#</th>
                  <th className="py-3 px-3 min-w-[240px]">Question</th>
                  <th className="py-3 px-3 whitespace-nowrap">Human Winner</th>
                  <th className="py-3 px-3 whitespace-nowrap">Judge Verdict (Run 1)</th>
                  <th className="py-3 px-3 whitespace-nowrap">Judge Verdict (Run 2)</th>
                  <th className="py-3 px-3 whitespace-nowrap">Agree w/ Human</th>
                  <th className="py-3 pl-3 pr-6 whitespace-nowrap">Flipped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {visibleEntries.map(({ row, originalIndex, result }) => {
                  const isExpanded = Boolean(expandedIds[row.id]);
                  const len1 = row.answer_1.trim().length;
                  const len2 = row.answer_2.trim().length;

                  return (
                    <Fragment key={row.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 pl-6 pr-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-sm transition-colors"
                            aria-label={isExpanded ? 'Collapse row details' : 'Expand row details'}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-2 font-mono text-xs text-slate-500 tabular-nums">
                          {originalIndex + 1}
                        </td>
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(row.id)}
                            className="text-left group"
                          >
                            <p className="text-slate-900 font-medium leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                              {row.question}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {row.topic}
                              <span className="mx-1.5" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-mono tabular-nums">
                                A1: {len1}c / A2: {len2}c
                              </span>
                            </p>
                          </button>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs text-slate-800 whitespace-nowrap tabular-nums">
                          Answer {row.human_winner}
                        </td>

                        {/* Run 1 */}
                        <td className="py-3.5 px-3 font-mono text-xs whitespace-nowrap tabular-nums">
                          {result?.status === 'running' ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 font-sans">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />
                              Running…
                            </span>
                          ) : result?.status === 'completed' && result.run1Verdict ? (
                            <span className="text-slate-900">
                              Answer {result.run1Verdict}{' '}
                              <span className="text-slate-400">(raw {result.run1Raw})</span>
                            </span>
                          ) : result?.status === 'error' ? (
                            <span className="text-red-700 font-sans">Failed</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Run 2 */}
                        <td className="py-3.5 px-3 font-mono text-xs whitespace-nowrap tabular-nums">
                          {result?.status === 'running' ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 font-sans">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />
                              Swapped…
                            </span>
                          ) : result?.status === 'completed' && result.run2Verdict ? (
                            <span className="text-slate-900">
                              Answer {result.run2Verdict}{' '}
                              <span className="text-slate-400">(raw {result.run2Raw})</span>
                            </span>
                          ) : result?.status === 'error' ? (
                            <button
                              type="button"
                              disabled={isRunning}
                              onClick={() => onRetryRow(row)}
                              className="inline-flex items-center gap-1 text-xs font-sans font-medium text-blue-700 hover:underline disabled:opacity-40"
                            >
                              <RotateCw className="w-3 h-3" />
                              Retry
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Agree with Human */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-xs font-medium">
                          {result?.status === 'completed' ? (
                            result.agreeWithHuman ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-red-700">
                                <X className="w-3.5 h-3.5 shrink-0" />
                                No
                              </span>
                            )
                          ) : result?.status === 'error' ? (
                            <span className="inline-flex items-center gap-1.5 text-red-700">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Error
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Flipped */}
                        <td className="py-3.5 pl-3 pr-6 whitespace-nowrap text-xs font-medium">
                          {result?.status === 'completed' ? (
                            result.flipped ? (
                              <span className="inline-flex items-center gap-1.5 text-amber-700">
                                <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                                Yes
                              </span>
                            ) : (
                              <span className="text-slate-600">No</span>
                            )
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Diagnostic Inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="px-6 py-4 border-t border-slate-100">
                            {result?.status === 'error' && result.error && (
                              <div className="mb-4 flex items-start gap-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
                                <div>
                                  <p className="font-semibold">API Error ({result.errorCode || 'ERROR'})</p>
                                  <p className="mt-0.5 text-red-700">{result.error}</p>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-semibold text-slate-900">
                                    Answer 1
                                    {row.human_winner === 1 ? ' · Human Winner' : ''}
                                  </span>
                                  <span className="font-mono text-slate-500 tabular-nums">
                                    {len1} chars
                                  </span>
                                </div>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-white border border-slate-200 rounded-md p-3">
                                  {row.answer_1}
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-semibold text-slate-900">
                                    Answer 2
                                    {row.human_winner === 2 ? ' · Human Winner' : ''}
                                  </span>
                                  <span className="font-mono text-slate-500 tabular-nums">
                                    {len2} chars
                                  </span>
                                </div>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-white border border-slate-200 rounded-md p-3">
                                  {row.answer_2}
                                </p>
                              </div>
                            </div>

                            {result?.status === 'completed' && (
                              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
                                <span>
                                  Run 1 (A=1, B=2): raw {result.run1Raw} → Answer {result.run1Verdict}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>
                                  Run 2 (A=2, B=1): raw {result.run2Raw} → Answer {result.run2Verdict}
                                </span>
                                {result.model && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>Model: {result.model}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
