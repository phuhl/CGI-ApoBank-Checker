import { askAiToClassify } from "./askAi";
import { categorizeText } from "./categorizeText";
import { checkComplianceQuestions } from "./complianceQuestions";
import checklist from "./checklist.json";

/**
 * Analyze the transcript and return:
 * - The detected category
 * - A list of matched checklist items for the UI
 */
export const analyze = async (text: string) => {
  // Identify which speaker is the bank consultant
  const consultantId = await askAiToClassify(
    "gpt-4.1",
    `
You will receive a transcript of a phone call between a bank consultant and a client.
Your job is to identify which speaker is the consultant (Speaker00 or Speaker01).

Transcript:
${text}
`,
    ["Speaker00", "Speaker01"]
  );

  // Replace the consultant ID with a generic label for easier parsing
  const normalizedText = text.replaceAll(consultantId, "Consultant");

  // Determine the conversation category using AI classification
  const category = await categorizeText(normalizedText);

  // Evaluate which checklist items exist in the transcript
  const complianceResults = await checkComplianceQuestions(
    normalizedText,
    category
  );

  // Load the checklist items for the detected category
  const checklistItems = checklist[category];

  // If category is unknown, return fallback structure
  if (!checklistItems) {
    return {
      category,
      matchedItems: []
    };
  }

  // Convert compliance output into matchedItems format expected by the frontend
  const matchedItems = checklistItems.map((item) => {
    const result = complianceResults.find((r) => r.id === item.id);
    return {
      id: item.id,
      matched: result ? result.exists : false
    };
  });

  // Final standardized return structure
  return {
    category,
    matchedItems
  };
};
