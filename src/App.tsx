import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  RotateCw,
  Square,
} from 'lucide-react';
import { CsvPasteModal } from './components/CsvPasteModal';
import { DatasetTable } from './components/DatasetTable';
import { MetricCards } from './components/MetricCards';
import { MetricsBarChart } from './components/MetricsBarChart';
import { ResultsTable } from './components/ResultsTable';
import { JUDGE_PROMPT_TEXT, SAMPLE_ROWS } from './data/sampleRows';
import { EvalRow, JudgeApiResponse, JudgeModelId, RowJudgeResult } from './types';
import { buildResultsCsv, downloadCsvFile } from './utils/csv';
import { computeReliabilityMetrics } from './utils/metrics';

export default function App() {
  const [rows, setRows] = useState<EvalRow[]>(() => SAMPLE_ROWS);
  const [resultsById, setResultsById] = useState<Record<string, RowJudgeResult>>({});
  const [model, setModel] = useState<JudgeModelId>('gemini-3.1-flash-lite');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const metrics = useMemo(
    () => computeReliabilityMetrics(rows, resultsById),
    [rows, resultsById]
  );

  const failedRows = useMemo(
    () => rows.filter((r) => resultsById[r.id]?.status === 'error'),
    [rows, resultsById]
  );

  const evaluateSingleRow = useCallback(
    async (row: EvalRow, signal: AbortSignal): Promise<RowJudgeResult> => {
      setResultsById((prev) => ({
        ...prev,
        [row.id]: { rowId: row.id, status: 'running' },
      }));

      try {
        const response = await fetch('/api/judge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: row.question,
            answer_1: row.answer_1,
            answer_2: row.answer_2,
            model,
          }),
          signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | (JudgeApiResponse & { error?: string; code?: string })
          | null;

        if (!response.ok || !payload) {
          const message =
            payload?.error || `Request failed with HTTP status ${response.status}.`;
          const errorResult: RowJudgeResult = {
            rowId: row.id,
            status: 'error',
            error: message,
            errorCode: payload?.code || `HTTP_${response.status}`,
          };
          setResultsById((prev) => ({ ...prev, [row.id]: errorResult }));
          return errorResult;
        }

        const agreeWithHuman =
          payload.run1Verdict === row.human_winner &&
          payload.run2Verdict === row.human_winner;

        const successResult: RowJudgeResult = {
          rowId: row.id,
          status: 'completed',
          run1Raw: payload.run1Raw,
          run1Verdict: payload.run1Verdict,
          run2Raw: payload.run2Raw,
          run2Verdict: payload.run2Verdict,
          agreeWithHuman,
          flipped: payload.flipped,
          model: payload.model,
        };

        setResultsById((prev) => ({ ...prev, [row.id]: successResult }));
        return successResult;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          setResultsById((prev) => {
            const next = { ...prev };
            if (next[row.id]?.status === 'running') {
              delete next[row.id];
            }
            return next;
          });
          throw err;
        }

        const message =
          err instanceof Error
            ? err.message
            : 'Network error while communicating with the judge API.';
        const errorResult: RowJudgeResult = {
          rowId: row.id,
          status: 'error',
          error: message,
          errorCode: 'NETWORK_ERROR',
        };
        setResultsById((prev) => ({ ...prev, [row.id]: errorResult }));
        return errorResult;
      }
    },
    [model]
  );

  const runBatch = useCallback(
    async (targetRows: EvalRow[], resetExisting: boolean) => {
      if (targetRows.length === 0) {
        setGlobalError('Add at least one evaluation row before running an experiment.');
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setGlobalError(null);
      setIsRunning(true);
      setProgress({ done: 0, total: targetRows.length });

      if (resetExisting) {
        setResultsById({});
      }

      let doneCount = 0;
      let firstErrorMessage: string | null = null;
      let errorCount = 0;

      // Controlled concurrency (2 rows = 4 concurrent Gemini calls) to stay responsive & rate-limit friendly
      const concurrency = 2;
      let cursor = 0;

      const worker = async () => {
        while (cursor < targetRows.length) {
          if (controller.signal.aborted) return;
          const row = targetRows[cursor++];
          try {
            const res = await evaluateSingleRow(row, controller.signal);
            if (res.status === 'error') {
              errorCount += 1;
              if (!firstErrorMessage && res.error) {
                firstErrorMessage = res.error;
              }
              // Stop immediately on missing/invalid API key to avoid redundant failing calls
              if (res.errorCode === 'MISSING_API_KEY' || res.errorCode === 'API_KEY_INVALID') {
                controller.abort();
              }
            }
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') return;
          } finally {
            doneCount += 1;
            setProgress({ done: doneCount, total: targetRows.length });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, targetRows.length) }, () => worker())
      );

      if (errorCount > 0 && firstErrorMessage) {
        setGlobalError(
          errorCount === 1
            ? `1 row failed during evaluation: ${firstErrorMessage}`
            : `${errorCount} rows failed during evaluation. First error: ${firstErrorMessage}`
        );
      }

      setIsRunning(false);
      abortControllerRef.current = null;
    },
    [evaluateSingleRow]
  );

  const handleRunExperiment = () => {
    void runBatch(rows, true);
  };

  const handleStopExperiment = () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
  };

  const handleRetryFailed = () => {
    if (failedRows.length > 0) {
      void runBatch(failedRows, false);
    }
  };

  const handleRetrySingleRow = (row: EvalRow) => {
    void runBatch([row], false);
  };

  const handleAddRow = (newRow: Omit<EvalRow, 'id'>) => {
    const id = `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setRows((prev) => [...prev, { ...newRow, id }]);
  };

  const handleUpdateRow = (id: string, patch: Partial<Omit<EvalRow, 'id'>>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
    // Keep existing results synced if only human_winner changed; invalidate if text changed
    setResultsById((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      if (patch.question !== undefined || patch.answer_1 !== undefined || patch.answer_2 !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      if (
        patch.human_winner !== undefined &&
        existing.status === 'completed' &&
        existing.run1Verdict !== undefined &&
        existing.run2Verdict !== undefined
      ) {
        return {
          ...prev,
          [id]: {
            ...existing,
            agreeWithHuman:
              existing.run1Verdict === patch.human_winner &&
              existing.run2Verdict === patch.human_winner,
          },
        };
      }
      return prev;
    });
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setResultsById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleResetSamples = () => {
    setRows(SAMPLE_ROWS);
    setResultsById({});
    setGlobalError(null);
  };

  const handleClearAll = () => {
    setRows([]);
    setResultsById({});
    setGlobalError(null);
  };

  const handleImportCsv = (importedRows: EvalRow[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setRows(importedRows);
      setResultsById({});
    } else {
      setRows((prev) => [...prev, ...importedRows]);
    }
    setGlobalError(null);
  };

  const handleDownloadCsv = () => {
    const csv = buildResultsCsv(rows, resultsById);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadCsvFile(csv, `llm-judge-reliability-${stamp}.csv`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#overview"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
          >
            LLM-as-a-Judge Reliability Tester
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#overview"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </a>
            <a
              href="#dataset"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Dataset
            </a>
            <a
              href="#results"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Results
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            {isRunning ? (
              <button
                type="button"
                onClick={handleStopExperiment}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-md hover:bg-red-800 transition-colors whitespace-nowrap shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Run</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRunExperiment}
                disabled={rows.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Experiment</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-8 space-y-8">
        {/* Experiment Header & Protocol Controls */}
        <section id="overview" className="scroll-mt-24 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-6 border-b border-slate-200">
            <div className="max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                Measure judge consistency, position bias, and length preference
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Each row is evaluated twice by Gemini: once as Answer A / Answer B, and once in
                swapped order. Verdicts are mapped back to the original answers to expose
                order-sensitivity and verbosity bias.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="judge-model-select"
                  className="text-xs font-medium text-slate-600 whitespace-nowrap"
                >
                  Judge Model
                </label>
                <select
                  id="judge-model-select"
                  value={model}
                  disabled={isRunning}
                  onChange={(e) => setModel(e.target.value as JudgeModelId)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:border-blue-600 focus:outline-none disabled:opacity-50"
                >
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (temp 0)</option>
                  <option value="gemini-4-hydrogen">gemini-4-hydrogen (seed 0)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowPromptDetails((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                aria-expanded={showPromptDetails}
              >
                <span>Judge Prompt</span>
                {showPromptDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable Judge Prompt Disclosure */}
          {showPromptDetails && (
            <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500">
                <span className="font-semibold text-slate-800">System Instruction</span>
                <span className="font-mono tabular-nums">
                  {model === 'gemini-3.1-flash-lite'
                    ? 'temperature = 0 · 2 calls/row (original + swapped)'
                    : 'seed = 0 · thinkingLevel = LOW · 2 calls/row (original + swapped)'}
                </span>
              </div>
              <p className="font-mono text-slate-700 bg-slate-50 border border-slate-200/80 rounded-md px-3.5 py-2.5">
                {JUDGE_PROMPT_TEXT}
              </p>
            </div>
          )}

          {/* Live Running Progress Bar */}
          {isRunning && (
            <div
              className="bg-white border border-blue-200 rounded-lg px-5 py-4 space-y-2.5"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-2.5 text-slate-900 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" />
                  <span>
                    Evaluating row{' '}
                    <span className="font-mono tabular-nums">
                      {Math.min(progress.done + 1, progress.total)}
                    </span>{' '}
                    of <span className="font-mono tabular-nums">{progress.total}</span> (dual-pass
                    swapped calls)…
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-600 tabular-nums">
                  {progress.total > 0
                    ? `${Math.round((progress.done / progress.total) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-700 transition-transform duration-200 origin-left"
                  style={{
                    transform: `scaleX(${
                      progress.total > 0 ? progress.done / progress.total : 0
                    })`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {globalError && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              role="alert"
            >
              <div className="flex items-start gap-2.5 text-sm text-red-900">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Experiment encountered an API error</p>
                  <p className="text-xs text-red-800 mt-0.5">{globalError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {failedRows.length > 0 && !isRunning && (
                  <button
                    type="button"
                    onClick={handleRetryFailed}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-900 bg-white border border-red-300 rounded-md hover:bg-red-100/60 transition-colors whitespace-nowrap"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry Failed ({failedRows.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setGlobalError(null)}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-700 hover:underline whitespace-nowrap"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Top Metric Cards */}
          <MetricCards metrics={metrics} isRunning={isRunning} />

          {/* Metrics Comparison Bar Chart */}
          <MetricsBarChart metrics={metrics} />
        </section>

        {/* Results Table */}
        <ResultsTable
          rows={rows}
          resultsById={resultsById}
          isRunning={isRunning}
          onDownloadCsv={handleDownloadCsv}
          onRetryRow={handleRetrySingleRow}
        />

        {/* Input Dataset Table */}
        <DatasetTable
          rows={rows}
          isRunning={isRunning}
          onAddRow={handleAddRow}
          onUpdateRow={handleUpdateRow}
          onDeleteRow={handleDeleteRow}
          onResetSamples={handleResetSamples}
          onClearAll={handleClearAll}
          onOpenCsvModal={() => setIsCsvModalOpen(true)}
        />
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1360px] mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <span>LLM-as-a-Judge Reliability Tester</span>
          <span className="font-mono tabular-nums">
            Dual-pass swap protocol · Original (A=1, B=2) & Swapped (A=2, B=1)
          </span>
        </div>
      </footer>

      {/* CSV Paste Modal */}
      <CsvPasteModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={handleImportCsv}
      />
    </div>
  );
}
