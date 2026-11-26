export type WinnerChoice = 1 | 2;
export type RawLetter = 'A' | 'B';
export type TopicCategory = 'Factual' | 'Writing' | 'Reasoning' | 'Coding' | 'Custom';
export type JudgeModelId = 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';

export interface EvalRow {
  id: string;
  topic: TopicCategory;
  question: string;
  answer_1: string;
  answer_2: string;
  human_winner: WinnerChoice;
}

export type RowRunStatus = 'idle' | 'running' | 'completed' | 'error';

export interface RowJudgeResult {
  rowId: string;
  status: RowRunStatus;
  run1Raw?: RawLetter;
  run1Verdict?: WinnerChoice;
  run2Raw?: RawLetter;
  run2Verdict?: WinnerChoice;
  agreeWithHuman?: boolean;
  flipped?: boolean;
  model?: string;
  error?: string;
  errorCode?: string;
}

export interface ReliabilityMetrics {
  totalRows: number;
  completedRows: number;
  errorRows: number;
  /** Rows where BOTH Run 1 and Run 2 matched human_winner */
  consistentAgreementCount: number;
  consistentAgreementRate: number | null;
  /** Individual judge calls (2 per completed row) that matched human_winner */
  callLevelAgreementCount: number;
  callLevelAgreementTotal: number;
  callLevelAgreementRate: number | null;
  /** Rows where Run 1 verdict !== Run 2 verdict after un-swapping */
  flippedCount: number;
  flipRate: number | null;
  /** Flips where the judge picked Position A in both runs (primacy bias) */
  primacyFlipCount: number;
  /** Flips where the judge picked Position B in both runs (recency bias) */
  recencyFlipCount: number;
  /** Longer-answer preference (evaluated only on rows where answer lengths differ) */
  unequalLengthDatasetRows: number;
  humanLongerCount: number;
  humanLongerRate: number | null;
  unequalLengthCompletedCalls: number;
  judgeLongerCallsCount: number;
  judgeLongerRate: number | null;
  /** Human longer rate restricted strictly to completed rows (for apples-to-apples chart comparison) */
  humanLongerCompletedCount: number;
  humanLongerCompletedTotal: number;
  humanLongerCompletedRate: number | null;
}

export interface JudgeApiResponse {
  run1Raw: RawLetter;
  run1Verdict: WinnerChoice;
  run2Raw: RawLetter;
  run2Verdict: WinnerChoice;
  flipped: boolean;
  model: string;
}
