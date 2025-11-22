// keyword_score.ts
import * as fs from "fs";
import * as path from "path";

export interface TranscriptSegment {
  speaker?: string;
  text: string;
  // falls noch mehr Felder kommen:
  [key: string]: unknown;
}

export type KeywordFile = Record<string, string[]>;

export interface DialogScore {
  count: number;
  ratio: number; 
}

export type ScoreResult = Record<string, DialogScore>;

export function calcKeywordScore(
  keyFile: KeywordFile,
  transFile: TranscriptSegment[]
): ScoreResult {
  const allKeyValues: number[] = [];
  const dialogTypes: string[] = [];

  for (const [dialogType, keylist] of Object.entries(keyFile)) {
    dialogTypes.push(dialogType);
    let dialogTypeCount = 0;

    for (const seg of transFile) {
      const text = (seg.text || "").toLowerCase();

      for (const key of keylist) {
        if (text.includes(key.toLowerCase())) {
          dialogTypeCount += 1;
        }
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

export function runKeywordScoring(
  keywordsPath: string,
  transPath: string
): ScoreResult {
  const keyFileRaw = fs.readFileSync(keywordsPath, "utf8");
  const transRaw = fs.readFileSync(transPath, "utf8");

  const keyFile: KeywordFile = JSON.parse(keyFileRaw);
  const transJson = JSON.parse(transRaw);
  const transFile: TranscriptSegment[] = transJson["segments_with_speaker"];

  return calcKeywordScore(keyFile, transFile);
}
