import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { EvalRow, TopicCategory, WinnerChoice } from '../types';

interface DatasetTableProps {
  rows: EvalRow[];
  isRunning: boolean;
  onAddRow: (row: Omit<EvalRow, 'id'>) => void;
  onUpdateRow: (id: string, patch: Partial<Omit<EvalRow, 'id'>>) => void;
  onDeleteRow: (id: string) => void;
  onResetSamples: () => void;
  onClearAll: () => void;
  onOpenCsvModal: () => void;
}

const TOPICS: TopicCategory[] = ['Factual', 'Writing', 'Reasoning', 'Coding', 'Custom'];

export function DatasetTable({
  rows,
  isRunning,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onResetSamples,
  onClearAll,
  onOpenCsvModal,
}: DatasetTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Add Row form state
  const [newTopic, setNewTopic] = useState<TopicCategory>('Custom');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer1, setNewAnswer1] = useState('');
  const [newAnswer2, setNewAnswer2] = useState('');
  const [newWinner, setNewWinner] = useState<WinnerChoice>(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit Row draft state
  const [editDraft, setEditDraft] = useState<{
    topic: TopicCategory;
    question: string;
    answer_1: string;
    answer_2: string;
    human_winner: WinnerChoice;
  } | null>(null);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows.map((row, idx) => ({ row, originalIndex: idx }));
    return rows
      .map((row, idx) => ({ row, originalIndex: idx }))
      .filter(
        ({ row }) =>
          row.question.toLowerCase().includes(q) ||
          row.answer_1.toLowerCase().includes(q) ||
          row.answer_2.toLowerCase().includes(q) ||
          row.topic.toLowerCase().includes(q)
      );
  }, [rows, searchQuery]);

  const handleCreateRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer1.trim() || !newAnswer2.trim()) {
      setFormError('Question, Answer 1, and Answer 2 are all required.');
      return;
    }
    onAddRow({
      topic: newTopic,
      question: newQuestion.trim(),
      answer_1: newAnswer1.trim(),
      answer_2: newAnswer2.trim(),
      human_winner: newWinner,
    });
    setNewQuestion('');
    setNewAnswer1('');
    setNewAnswer2('');
    setNewWinner(1);
    setNewTopic('Custom');
    setFormError(null);
    setShowAddForm(false);
  };

  const startEdit = (row: EvalRow) => {
    setEditingRowId(row.id);
    setEditDraft({
      topic: row.topic,
      question: row.question,
      answer_1: row.answer_1,
      answer_2: row.answer_2,
      human_winner: row.human_winner,
    });
  };

  const saveEdit = (id: string) => {
    if (!editDraft) return;
    if (!editDraft.question.trim() || !editDraft.answer_1.trim() || !editDraft.answer_2.trim()) {
      return;
    }
    onUpdateRow(id, {
      topic: editDraft.topic,
      question: editDraft.question.trim(),
      answer_1: editDraft.answer_1.trim(),
      answer_2: editDraft.answer_2.trim(),
      human_winner: editDraft.human_winner,
    });
    setEditingRowId(null);
    setEditDraft(null);
  };

  return (
    <section id="dataset" className="scroll-mt-24">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-base font-semibold text-slate-900">Evaluation Dataset</h2>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {rows.length} {rows.length === 1 ? 'row' : 'rows'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Provide candidate answer pairs and the ground-truth human winner (1 or 2).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter rows…"
                aria-label="Filter evaluation rows"
                className="pl-8 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-md w-44 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>

            <button
              type="button"
              onClick={onOpenCsvModal}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Paste CSV</span>
            </button>

            <button
              type="button"
              onClick={onResetSamples}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              title="Restore 10 sample rows"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Samples</span>
            </button>

            {rows.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                disabled={isRunning}
                className="px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Inline Add Row Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateRow}
            className="px-6 py-5 bg-slate-50/80 border-b border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Add Evaluation Row</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7">
                <label className="block text-xs font-medium text-slate-700 mb-1">Question</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Enter the prompt or question being evaluated"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Topic</label>
                <select
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value as TopicCategory)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Human Winner
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/70 rounded-md">
                  <button
                    type="button"
                    onClick={() => setNewWinner(1)}
                    className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
                      newWinner === 1
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Answer 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWinner(2)}
                    className={`py-1.5 text-xs font-medium rounded-sm transition-colors ${
                      newWinner === 2
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Answer 2
                  </button>
                </div>
              </div>

              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Answer 1{' '}
                  <span className="font-mono text-slate-400 tabular-nums">
                    ({newAnswer1.trim().length} chars)
                  </span>
                </label>
                <textarea
                  value={newAnswer1}
                  onChange={(e) => setNewAnswer1(e.target.value)}
                  rows={3}
                  placeholder="First candidate answer…"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
              <div className="md:col-span-6">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Answer 2{' '}
                  <span className="font-mono text-slate-400 tabular-nums">
                    ({newAnswer2.trim().length} chars)
                  </span>
                </label>
                <textarea
                  value={newAnswer2}
                  onChange={(e) => setNewAnswer2(e.target.value)}
                  rows={3}
                  placeholder="Second candidate answer…"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
            </div>

            {formError && <p className="text-xs text-red-700 font-medium">{formError}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                Save Row
              </button>
            </div>
          </form>
        )}

        {/* Table Content */}
        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-900">No evaluation rows yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Add rows manually, paste CSV data, or load the 10 pre-built sample pairs.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={onResetSamples}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors"
              >
                Load 10 Sample Rows
              </button>
              <button
                type="button"
                onClick={onOpenCsvModal}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                Paste CSV
              </button>
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No rows match “{searchQuery}”.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-600">
                  <th className="py-3 pl-6 pr-3 w-12 font-mono">#</th>
                  <th className="py-3 px-3 w-[24%]">Question</th>
                  <th className="py-3 px-3 w-[28%]">Answer 1</th>
                  <th className="py-3 px-3 w-[28%]">Answer 2</th>
                  <th className="py-3 px-3 w-32 text-center whitespace-nowrap">Human Winner</th>
                  <th className="py-3 pl-3 pr-6 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRows.map(({ row, originalIndex }) => {
                  const isEditing = editingRowId === row.id && editDraft !== null;
                  const len1 = row.answer_1.trim().length;
                  const len2 = row.answer_2.trim().length;

                  if (isEditing && editDraft) {
                    return (
                      <tr key={row.id} className="bg-blue-50/30 align-top">
                        <td className="py-3.5 pl-6 pr-3 font-mono text-xs text-slate-500 tabular-nums">
                          {originalIndex + 1}
                        </td>
                        <td className="py-3 px-3 space-y-2">
                          <textarea
                            value={editDraft.question}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, question: e.target.value })
                            }
                            rows={3}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                          <select
                            value={editDraft.topic}
                            onChange={(e) =>
                              setEditDraft({
                                ...editDraft,
                                topic: e.target.value as TopicCategory,
                              })
                            }
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                          >
                            {TOPICS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3">
                          <textarea
                            value={editDraft.answer_1}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, answer_1: e.target.value })
                            }
                            rows={4}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <textarea
                            value={editDraft.answer_2}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, answer_2: e.target.value })
                            }
                            rows={4}
                            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-md">
                            {([1, 2] as WinnerChoice[]).map((choice) => (
                              <button
                                key={choice}
                                type="button"
                                onClick={() =>
                                  setEditDraft({ ...editDraft, human_winner: choice })
                                }
                                className={`px-2.5 py-1 font-mono text-xs font-medium rounded-sm ${
                                  editDraft.human_winner === choice
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600'
                                }`}
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pl-3 pr-6 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => saveEdit(row.id)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md"
                              aria-label="Save changes"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRowId(null);
                                setEditDraft(null);
                              }}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
                              aria-label="Cancel editing"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 transition-colors align-top"
                    >
                      <td className="py-3.5 pl-6 pr-3 font-mono text-xs text-slate-500 tabular-nums">
                        {originalIndex + 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-slate-900 font-medium leading-snug line-clamp-3">
                          {row.question}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{row.topic}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-line">
                          {row.answer_1}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                          {len1} chars{len1 > len2 ? ' · longer' : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 whitespace-pre-line">
                          {row.answer_2}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-slate-400 tabular-nums">
                          {len2} chars{len2 > len1 ? ' · longer' : ''}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div
                          className="inline-flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200/80"
                          role="group"
                          aria-label={`Human winner for row ${originalIndex + 1}`}
                        >
                          {([1, 2] as WinnerChoice[]).map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              disabled={isRunning}
                              onClick={() => onUpdateRow(row.id, { human_winner: choice })}
                              className={`px-2.5 py-1 font-mono text-xs font-medium rounded-sm transition-colors disabled:opacity-60 ${
                                row.human_winner === choice
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {choice}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isRunning}
                            onClick={() => startEdit(row)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md disabled:opacity-40 transition-colors"
                            aria-label={`Edit row ${originalIndex + 1}`}
                            title="Edit row"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isRunning}
                            onClick={() => onDeleteRow(row.id)}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-40 transition-colors"
                            aria-label={`Delete row ${originalIndex + 1}`}
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
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
