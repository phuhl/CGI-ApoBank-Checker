import checklist from "./checklist.json";
import { askAiToClassify } from "./askAi";

const processQuestion = async (
  q: {
    question: string;
    answeredExists: number;
    answeredMissing: number;
  },
  text: string,
) => {
  const result = await askAiToClassify(
    "gpt-4.1",
    `
  Du bist ein Compliance-Analyst, der ein Gespräch zwischen einem Bankberater
  und einem Kunden überprüft. Du musst feststellen, ob eine erforderliche
  Compliance-Frage im Gespräch behandelt wurde.

Antworte mit "Ja", wenn die Frage behandelt wurde, oder mit "Nein", wenn sie
 nicht behandelt wurde.

Die erforderliche Frage ist:
"${q.question}"

Das Gespräch ist wie folgt:
${text}
`,
    ["Ja", "Nein"],
  );
  if (result === "Ja") {
    q.answeredExists += 1;
  } else {
    q.answeredMissing += 1;
  }
};

export const checkComplianceQuestions = async (
  text: string,
  textType: string,
) => {
  const requiredQuestions = (
    checklist[textType] as { description: string }[]
  ).map((q) => ({
    question: q.description,
    answeredExists: 0,
    answeredMissing: 0,
  }));

  await Promise.all(
    requiredQuestions.flatMap((q) =>
      Array.from({ length: 3 }).map(
        async (_) => await processQuestion(q, text),
      ),
    ),
  );
  return requiredQuestions;
};
