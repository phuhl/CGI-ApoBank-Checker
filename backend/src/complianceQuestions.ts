import checklist from "./checklist.json";
import { askAiToClassify, askAiWithSchema } from "./askAi";
import { z } from "zod";

const processQuestion = async (
  q: {
    question: string;
    answeredExists: number;
    answeredMissing: number;
  },
  text: string,
) => {
  const result = await askAiToClassify(
    "gpt-5",
    `
  Du bist ein Compliance-Analyst, der ein Gespräch zwischen einem Bankberater
  und einem Kunden überprüft. Du musst feststellen, ob eine erforderliche
  Compliance-Frage im Gespräch behandelt wurde.

Die Frage kann, aber muss nicht, wörtlich gestellt werden, das Thema der Frage
muss jedoch behandelt werden.

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

const postProcessQuestion = async (
  q: {
    question: string;
    answeredExists: number;
    answeredMissing: number;
  },
  text: string,
  tries: number,
) => {
  const exists = q.answeredExists > q.answeredMissing;
  const confidence = (exists ? q.answeredExists : q.answeredMissing) / tries;
  let textExtract = "";

  if (exists) {
    textExtract = (
      await askAiWithSchema(
        "gpt-4.1",
        `Finde in dem folgenden Textabschnitt die Stellen, die die folgende
Compliance-Frage beantworten, und gib sie exakt wieder. Antworte nur mit dem
extract in folgendem JSON-Format: {"extract": "<text extract>"}

Die Compliance-Frage ist:
${q.question}

Der Textabschnitt ist:
${text}
`,
        z.object({
          extract: z.string(),
        }),
      )
    ).extract;
  }

  return {
    ...q,
    exists,
    confidence,
    textExtract,
  };
};

export const checkComplianceQuestions = async (
  text: string,
  textType: string,
) => {
  const tries = 4;
  const requiredQuestions = (
    checklist[textType] as { description: string }[]
  ).map((q) => ({
    question: q.description,
    answeredExists: 0,
    answeredMissing: 0,
  }));

  await Promise.all(
    requiredQuestions.flatMap((q) =>
      Array.from({ length: tries }).map(
        async (_, i) => await processQuestion(q, text),
      ),
    ),
  );

  return Promise.all(
    requiredQuestions.map((q) => postProcessQuestion(q, text, tries)),
  );
};
