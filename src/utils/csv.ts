import { EvalRow, RowJudgeResult, TopicCategory, WinnerChoice } from '../types';

/**
 * RFC 4180 compliant CSV parser supporting quoted fields, embedded commas,
 * escaped double quotes (""), and multiline quoted cells.
 */
export function parseRawCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, ''); // strip BOM

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Drop completely empty trailing lines
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

export interface CsvImportResult {
  rows: EvalRow[];
  errors: string[];
}

function normalizeWinner(raw: string): WinnerChoice | null {
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === '1' || cleaned === 'answer 1' || cleaned === 'answer_1' || cleaned === 'a') {
    return 1;
  }
  if (cleaned === '2' || cleaned === 'answer 2' || cleaned === 'answer_2' || cleaned === 'b') {
    return 2;
  }
  return null;
}

function normalizeTopic(raw?: string): TopicCategory {
  if (!raw) return 'Custom';
  const c = raw.trim().toLowerCase();
  if (c === 'factual') return 'Factual';
  if (c === 'writing') return 'Writing';
  if (c === 'reasoning') return 'Reasoning';
  if (c === 'coding' || c === 'code') return 'Coding';
  return 'Custom';
}

export function parseEvalCsv(csvText: string): CsvImportResult {
  const rawRows = parseRawCsv(csvText);
  if (rawRows.length === 0) {
    return { rows: [], errors: ['CSV input is empty.'] };
  }

  const errors: string[] = [];
  const parsed: EvalRow[] = [];

  // Detect header row
  const firstLower = rawRows[0].map((c) => c.trim().toLowerCase().replace(/\s+/g, '_'));
  let startIndex = 0;
  let qIdx = 0;
  let a1Idx = 1;
  let a2Idx = 2;
  let hwIdx = 3;
  let topicIdx = -1;

  const hasHeader =
    firstLower.includes('question') ||
    firstLower.includes('answer_1') ||
    firstLower.includes('human_winner');

  if (hasHeader) {
    startIndex = 1;
    const findCol = (aliases: string[], fallback: number) => {
      const idx = firstLower.findIndex((h) => aliases.includes(h));
      return idx >= 0 ? idx : fallback;
    };
    qIdx = findCol(['question', 'prompt', 'query'], 0);
    a1Idx = findCol(['answer_1', 'answer1', 'response_1', 'a'], 1);
    a2Idx = findCol(['answer_2', 'answer2', 'response_2', 'b'], 2);
    hwIdx = findCol(['human_winner', 'winner', 'human', 'label'], 3);
    topicIdx = firstLower.findIndex((h) => ['topic', 'category', 'domain'].includes(h));
  }

  for (let i = startIndex; i < rawRows.length; i++) {
    const lineNum = i + 1;
    const cols = rawRows[i];
    const maxRequired = Math.max(qIdx, a1Idx, a2Idx, hwIdx);
    if (cols.length <= maxRequired) {
      errors.push(`Row ${lineNum}: expected at least ${maxRequired + 1} columns, found ${cols.length}.`);
      continue;
    }

    const question = cols[qIdx]?.trim() ?? '';
    const answer_1 = cols[a1Idx]?.trim() ?? '';
    const answer_2 = cols[a2Idx]?.trim() ?? '';
    const winner = normalizeWinner(cols[hwIdx] ?? '');
    const topic = topicIdx >= 0 ? normalizeTopic(cols[topicIdx]) : 'Custom';

    if (!question || !answer_1 || !answer_2) {
      errors.push(`Row ${lineNum}: question, answer_1, and answer_2 must all be non-empty.`);
      continue;
    }
    if (!winner) {
      errors.push(
        `Row ${lineNum}: invalid human_winner "${cols[hwIdx]?.trim() ?? ''}" (expected 1 or 2).`
      );
      continue;
    }

    parsed.push({
      id: `csv-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      topic,
      question,
      answer_1,
      answer_2,
      human_winner: winner,
    });
  }

  return { rows: parsed, errors };
}

function escapeCsvCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildResultsCsv(
  rows: EvalRow[],
  resultsById: Record<string, RowJudgeResult>
): string {
  const headers = [
    'row_number',
    'topic',
    'question',
    'answer_1',
    'answer_2',
    'answer_1_chars',
    'answer_2_chars',
    'human_winner',
    'judge_verdict_run_1',
    'judge_raw_run_1',
    'judge_verdict_run_2',
    'judge_raw_run_2',
    'agree_with_human',
    'flipped',
    'model',
    'error',
  ];

  const lines = [headers.join(',')];

  rows.forEach((row, index) => {
    const res = resultsById[row.id];
    const agreeLabel =
      res?.status === 'completed' ? (res.agreeWithHuman ? 'Yes' : 'No') : '';
    const flippedLabel =
      res?.status === 'completed' ? (res.flipped ? 'Yes' : 'No') : '';

    const cells = [
      index + 1,
      row.topic,
      row.question,
      row.answer_1,
      row.answer_2,
      row.answer_1.trim().length,
      row.answer_2.trim().length,
      row.human_winner,
      res?.run1Verdict ?? '',
      res?.run1Raw ?? '',
      res?.run2Verdict ?? '',
      res?.run2Raw ?? '',
      agreeLabel,
      flippedLabel,
      res?.model ?? '',
      res?.error ?? '',
    ];

    lines.push(cells.map(escapeCsvCell).join(','));
  });

  return lines.join('\r\n');
}

export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
