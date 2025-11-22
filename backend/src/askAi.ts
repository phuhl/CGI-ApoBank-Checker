import fs from "fs";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const openAiApiKey =
  "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";

type OpenAiModelName =
  | "gpt-4.1-nano"
  | "gpt-4.1-mini"
  | "gpt-4.1"
  | "gpt-5"
  | "gpt-5-mini"
  | "gpt-5-nano";

const getModelId = (name: OpenAiModelName) => {
  switch (name) {
    case "gpt-4.1-nano":
      return { model: "gpt-4.1-nano-2025-04-14" };
    case "gpt-4.1-mini":
      return { model: "gpt-4.1-mini-2025-04-14" };
    case "gpt-4.1":
      return { model: "gpt-4.1-2025-04-14" };
    case "gpt-5":
      return {
        model: "gpt-5-2025-08-07",
        reasoning: {
          effort: "low" as const,
        },
      };
    case "gpt-5-mini":
      return {
        model: "gpt-5-mini-2025-08-07",
        reasoning: {
          effort: "medium" as const,
          //            effort: "low" as const,
        },
      };
    case "gpt-5-nano":
      return { model: "gpt-5-nano-2025-08-07" };
  }
};

const runRequest = async (
  model: OpenAiModelName,
  requestParams: Omit<OpenAI.Responses.ResponseCreateParams, "model">,
  fallbackModels: OpenAiModelName[] = [],
) => {
  const client = new OpenAI({
    apiKey: openAiApiKey,
  });
  try {
    // OpenAI client automatically retries on rate limits
    const response = (await client.responses.create(
      {
        ...requestParams,
        ...getModelId(model),
      },
      {
        maxRetries: 2,
      },
    )) as OpenAI.Responses.Response;
    return response;
  } catch (e: unknown) {
    console.log("Error during OpenAI request:", e);
    if (e instanceof Error) {
      if (e.message.toLowerCase().includes("rate limit")) {
        console.log("OpenAi Rate Limit exceeded");
        if (fallbackModels.length > 0) {
          const newModel = fallbackModels.shift()!;
          return await runRequest(newModel, requestParams, fallbackModels);
        }
      }
    }
    throw e;
  }
};

export const askAiToClassify = async (
  model: OpenAiModelName,
  prompt: string,
  answerOptions: [string, ...string[]],
  fallbackModels: OpenAiModelName[] = [],
) => {
  const zFormat = z.object({
    answer: z.enum(answerOptions),
  });
  const format = zodTextFormat(zFormat, "answer");

  const response = await runRequest(
    model,
    {
      input: prompt,
      text: { format },
    },
    fallbackModels,
  );

  return (JSON.parse(response.output_text) as z.infer<typeof zFormat>).answer;
};

export const askAi = async (model: OpenAiModelName, prompt: string) => {
  const response = await runRequest(model, {
    input: prompt,
  });

  return response.output_text.trim();
};

export const askAiWithSchema = async <Z extends z.ZodType>(
  model: OpenAiModelName,
  prompt: string,
  format: Z,
): Promise<z.infer<Z>> => {
  const fullFormat = z.object({ answer: format });
  const textFormat = zodTextFormat(fullFormat, "answer");

  const response = await runRequest(model, {
    input: prompt,
    text: { format: textFormat },
  });

  const parsed = JSON.parse(response.output_text) as { answer: z.infer<Z> };
  return parsed.answer;
};

export const getTranscript = async (fileName: string) => {
  const client = new OpenAI({ apiKey: openAiApiKey });
  const res = await client.audio.transcriptions.create({
    file: fs.createReadStream(fileName),
    model: "gpt-4o-transcribe",
  });
  return res.text;
};
