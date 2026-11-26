import { useMemo, useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EvalRow } from '../types';
import { parseEvalCsv } from '../utils/csv';

interface CsvPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: EvalRow[], mode: 'replace' | 'append') => void;
}

const EXAMPLE_CSV = `question,answer_1,answer_2,human_winner
"What is the capital of Australia?","Sydney is the capital of Australia and its largest financial hub.","Canberra is the capital of Australia, chosen in 1908 as a compromise between Sydney and Melbourne.",2
"Explain Big-O of binary search.","Binary search runs in O(log n) time because it halves the sorted search space on every comparison.","Binary search checks elements linearly until the midpoint is reached, taking O(n) time in the average case.",1`;

export function CsvPasteModal({ isOpen, onClose, onImport }: CsvPasteModalProps) {
  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');

  const preview = useMemo(() => {
    if (!csvText.trim()) return null;
    return parseEvalCsv(csvText);
  }, [csvText]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (!preview || preview.rows.length === 0) return;
    onImport(preview.rows, mode);
    setCsvText('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="csv-modal-title" className="text-base font-semibold text-slate-900">
              Import CSV Dataset
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Expected columns: <span className="font-mono text-slate-700">question, answer_1, answer_2, human_winner</span> (1 or 2). Optional header row.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              <button
                type="button"
                onClick={() => setMode('replace')}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'replace'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Replace existing rows
              </button>
              <button
                type="button"
                onClick={() => setMode('append')}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'append'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Append to table
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCsvText(EXAMPLE_CSV)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Insert Example CSV
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .csv</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={10}
            placeholder={`question,answer_1,answer_2,human_winner\n"Your question here","First candidate answer","Second candidate answer",1`}
            className="w-full rounded-md border border-slate-300 bg-slate-50/50 px-3.5 py-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
          />

          {/* Parse Preview Feedback */}
          {preview && (
            <div className="space-y-2 text-xs">
              {preview.rows.length > 0 && (
                <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3.5 py-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  <span>
                    Ready to import{' '}
                    <strong className="font-mono tabular-nums">{preview.rows.length}</strong> valid
                    row{preview.rows.length === 1 ? '' : 's'}.
                  </span>
                </div>
              )}
              {preview.errors.length > 0 && (
                <div className="text-red-800 bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5 space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                    <span>
                      Skipped {preview.errors.length} row{preview.errors.length === 1 ? '' : 's'} due
                      to formatting issues:
                    </span>
                  </div>
                  <ul className="list-disc pl-6 space-y-0.5 text-red-700">
                    {preview.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                    {preview.errors.length > 5 && (
                      <li>…and {preview.errors.length - 5} more warning(s)</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/60 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!preview || preview.rows.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            Import {preview && preview.rows.length > 0 ? `(${preview.rows.length} Rows)` : 'CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}
