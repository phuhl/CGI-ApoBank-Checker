// keyword_score.ts
import * as fs from "fs";

export type KeywordFile = Record<string, string[]>;

export interface DialogScore {
  count: number;
  ratio: number; 
}

export type ScoreResult = Record<string, DialogScore>;

/**
 * Berechnet Keyword-Scores für einen gesamten Text.
 * keyFile: { dialog_type: [keyword1, keyword2, ...] }
 * text: kompletter Gesprächstext
 */
export function calcKeywordScore(
  keyFile: KeywordFile,
  text: string
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
  text: string
): ScoreResult {
  return calcKeywordScore(keyFile, text);
}
