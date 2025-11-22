// keyword_score.ts
import * as fs from "fs";

export type KeywordFile = Record<string, string[]>;

export interface DialogScore {
  count: number;
  ratio: number;
}

export type ScoreResult = Record<string, DialogScore>;

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }

  const dp: number[][] = Array.from(
    { length: m + 1 },
    () => new Array(n + 1).fill(0) as number[],
  );

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Berechnet Keyword-Scores für einen gesamten Text.
 * keyFile: { dialog_type: [keyword1, keyword2, ...] }
 * text: kompletter Gesprächstext
 */
export function calcKeywordScore(
  keyFile: KeywordFile,
  text: string,
): ScoreResult {
  const allKeyValues: number[] = [];
  const dialogTypes: string[] = [];
  const lowerText = text.toLowerCase();

  for (const [dialogType, keylist] of Object.entries(keyFile)) {
    dialogTypes.push(dialogType);
    let dialogTypeCount = 0;

    for (const key of keylist) {
      if (lowerText.includes(key.toLowerCase())) {
        dialogTypeCount += 1;
      }
    }

    allKeyValues.push(dialogTypeCount);
  }

  const total = allKeyValues.reduce((a, b) => a + b, 0);
  const result: ScoreResult = {};

  dialogTypes.forEach((dt, i) => {
    const count = allKeyValues[i];
    const ratio = total === 0 ? 0 : count / total;

    result[dt] = {
      count,
      ratio,
    };
  });

  return result;
}

/**
 * Liest die Keywords aus einer JSON-Datei und wendet sie auf einen Text an.
 * keywordsPath: Pfad zu keywords.json
 * text: kompletter Gesprächstext
 */
export function runKeywordScoring(
  keyFile: KeywordFile,
  text: string,
): ScoreResult {
  return calcKeywordScore(keyFile, text);
}
