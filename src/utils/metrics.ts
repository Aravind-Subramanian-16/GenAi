import { EvalRow, ReliabilityMetrics, RowJudgeResult } from '../types';

export function getLongerAnswer(row: EvalRow): 1 | 2 | null {
  const len1 = row.answer_1.trim().length;
  const len2 = row.answer_2.trim().length;
  if (len1 === len2) return null;
  return len1 > len2 ? 1 : 2;
}

export function computeReliabilityMetrics(
  rows: EvalRow[],
  resultsById: Record<string, RowJudgeResult>
): ReliabilityMetrics {
  let completedRows = 0;
  let errorRows = 0;
  let consistentAgreementCount = 0;
  let callLevelAgreementCount = 0;
  let callLevelAgreementTotal = 0;
  let flippedCount = 0;
  let primacyFlipCount = 0;
  let recencyFlipCount = 0;

  let unequalLengthDatasetRows = 0;
  let humanLongerCount = 0;

  let unequalLengthCompletedCalls = 0;
  let judgeLongerCallsCount = 0;
  let humanLongerCompletedCount = 0;
  let humanLongerCompletedTotal = 0;

  for (const row of rows) {
    const longer = getLongerAnswer(row);
    if (longer !== null) {
      unequalLengthDatasetRows += 1;
      if (row.human_winner === longer) {
        humanLongerCount += 1;
      }
    }

    const res = resultsById[row.id];
    if (!res) continue;

    if (res.status === 'error') {
      errorRows += 1;
      continue;
    }

    if (
      res.status === 'completed' &&
      res.run1Verdict !== undefined &&
      res.run2Verdict !== undefined
    ) {
      completedRows += 1;

      const r1Match = res.run1Verdict === row.human_winner;
      const r2Match = res.run2Verdict === row.human_winner;
      callLevelAgreementTotal += 2;
      callLevelAgreementCount += (r1Match ? 1 : 0) + (r2Match ? 1 : 0);

      if (r1Match && r2Match) {
        consistentAgreementCount += 1;
      }

      if (res.run1Verdict !== res.run2Verdict) {
        flippedCount += 1;
        // If raw letter was A in both runs, judge always favored the first slot (primacy)
        if (res.run1Raw === 'A' && res.run2Raw === 'A') {
          primacyFlipCount += 1;
        } else if (res.run1Raw === 'B' && res.run2Raw === 'B') {
          recencyFlipCount += 1;
        }
      }

      if (longer !== null) {
        humanLongerCompletedTotal += 1;
        if (row.human_winner === longer) {
          humanLongerCompletedCount += 1;
        }

        unequalLengthCompletedCalls += 2;
        if (res.run1Verdict === longer) judgeLongerCallsCount += 1;
        if (res.run2Verdict === longer) judgeLongerCallsCount += 1;
      }
    }
  }

  const pct = (num: number, den: number): number | null =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : null;

  return {
    totalRows: rows.length,
    completedRows,
    errorRows,
    consistentAgreementCount,
    consistentAgreementRate: pct(consistentAgreementCount, completedRows),
    callLevelAgreementCount,
    callLevelAgreementTotal,
    callLevelAgreementRate: pct(callLevelAgreementCount, callLevelAgreementTotal),
    flippedCount,
    flipRate: pct(flippedCount, completedRows),
    primacyFlipCount,
    recencyFlipCount,
    unequalLengthDatasetRows,
    humanLongerCount,
    humanLongerRate: pct(humanLongerCount, unequalLengthDatasetRows),
    unequalLengthCompletedCalls,
    judgeLongerCallsCount,
    judgeLongerRate: pct(judgeLongerCallsCount, unequalLengthCompletedCalls),
    humanLongerCompletedCount,
    humanLongerCompletedTotal,
    humanLongerCompletedRate: pct(humanLongerCompletedCount, humanLongerCompletedTotal),
  };
}
