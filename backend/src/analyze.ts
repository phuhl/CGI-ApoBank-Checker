import { askAiToClassify } from "./askAiNew";
import { categorizeText } from "./categorizeText";
import { checkComplianceQuestions } from "./complianceQuestions";

export const analyze = async (text: string) => {
  const consultantId = await askAiToClassify(
    "gpt-4.1",
    `
You will receive the recording of a phone call between a bank consultant and a customer of the bank. The transcript identifies the two people as Speaker00 and Speaker01. Your job is to identify who is the bank consultant. Answer with the correct Person (Speaker00 or Speaker01).

The following is the transcript:

 ${text}
`,
    ["Speaker00", "Speaker01"],
  );

  const textWithReplacedId = text.replaceAll(consultantId, "Consultant");

  const { textType, keywordConfidence } =
    await categorizeText(textWithReplacedId);

  const complianceResults = await checkComplianceQuestions(
    textWithReplacedId,
    textType,
  );

  const fullComplianceResults = complianceResults.map((q) => ({
    ...q,
  }));

  return {
    textType,
    compliant: fullComplianceResults.every((q) => q.exists),
    confident: fullComplianceResults.every((q) => q.confidence >= 0.6),
    keywordConfidence,
    fullComplianceResults,
  };
};
