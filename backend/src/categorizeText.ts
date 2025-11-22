import { askAiToClassify } from "./askAi";
import { runKeywordScoring, ScoreResult } from "./get_keyword_score_type";
import keywords  from "./keywords.json";
//import * as path from "path";

export const categorizeText = async (text: string) => {

  const keywordScores = runKeywordScoring(keywords, text);

  const aioutput = await askAiToClassify(
    "gpt-4.1",
    `
  Analysiere einen gegebenen Gesprächstext und ordne ihn genau einem der folgenden sieben Gesprächstypen zu. Die Zuordnung erfolgt ausschließlich anhand des inhaltlichen Charakters des Gesprächs, der genannten Produktarten und der regulatorisch relevanten Elemente.

  Gesprächstypen & Entscheidungsregeln:

  1. Mit Beratung – Zertifikate
  Erkennen an: Beratung zu strukturierten Produkten (z. B. Zertifikate, Derivate, Bonus-/Discountzertifikate, Optionsscheine, Knock-outs). Komplexe Risikoprofile. Muss enthalten: Hinweise auf Emittentenrisiko, Erklärung der Produktfunktion, Darstellung möglicher Verluste, Eignungsprüfung oder Kundenbestätigung.

  2. Mit Beratung – Fonds
  Erkennen an: Beratung zu Investmentfonds (Aktienfonds, Rentenfonds, Mischfonds). Muss enthalten: Erklärung der Fondsart (aktiv/passiv), Risikoklasse, Kostenhinweis, Beratungsbestätigung.

  3. Mit Beratung – Renten
  Erkennen an: Beratung zu Anleihen/Rentenpapieren. Muss enthalten: Hinweise zu Laufzeit, Zins, Bonität, Kursrisiko und Liquidität.

  4. Mit Beratung – Aktien
  Erkennen an: Beratung zu Einzelaktien. Muss enthalten: Hinweise auf Kursschwankungen, Unternehmensrisiken, fehlende Gewinngarantien, Ordergröße, Beratungsbestätigung.

  5. Mit Beratung – ISP / ETF
  Erkennen an: Beratung zu ETFs, Indexfonds (passive Produkte), Index- oder ETF-Sparplänen. Muss enthalten: Erklärung der Funktionsweise, Diversifikation, Tracking Error, langfristige Anlageziele, Risikohinweis.

  6. Ohne Beratung – gekürzt
  Erkennen an: Kurze Standardorder oder Wiederanlage ohne Beratungsleistung. Muss enthalten: "Ohne Beratung", eigenverantwortliches Handeln, kurze Orderzusammenfassung, kurzer Risikohinweis.

  7. Ohne Beratung – ausführlich
  Erkennen an: Komplexe oder volumenstarke Order ohne Beratung. Muss enthalten: "Ohne Beratung", ausführlichere Pflichttexte, Hinweis auf Verlustrisiken, eigenverantwortliches Handeln, ausführliche Orderbestätigung.

  Ausgabeformat:
  Antwort exakt wie folgt:
  "<Gesprächstyp>"

Der zu analysierende Text lautet:
${text}
`,
    [
      "Mit Beratung – Zertifikate",
      "Mit Beratung – Fonds",
      "Mit Beratung – Renten",
      "Mit Beratung – Aktien",
      "Mit Beratung – ISP / ETF",
      "Ohne Beratung – gekürzt",
      "Ohne Beratung – ausführlich",
    ],
  );

  const score = keywordScores[aioutput]?.ratio ?? 0;
  const keywordConfidence = score * 100;

  return aioutput;
};
