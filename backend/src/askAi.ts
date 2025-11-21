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

const MODELS_ENDPOINT = "https://openai.inference.de-txl.ionos.com/v1";
const IONOS_API_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJraWQiOiI3YjY2NTA0NS1mOTk4LTRiZWMtODk5OC05NDNmYTE5OTNkODUiLCJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpb25vc2Nsb3VkIiwiaWF0IjoxNzYzNzQ0ODMzLCJjbGllbnQiOiJVU0VSIiwiaWRlbnRpdHkiOnsicHJpdmlsZWdlcyI6WyJBQ0NFU1NfQU5EX01BTkFHRV9MT0dHSU5HIiwiTUFOQUdFX1JFR0lTVFJZIiwiQUNDRVNTX0FORF9NQU5BR0VfQ0VSVElGSUNBVEVTIiwiQUNDRVNTX0FORF9NQU5BR0VfQVBJX0dBVEVXQVkiLCJCQUNLVVBfVU5JVF9DUkVBVEUiLCJBQ0NFU1NfQU5EX01BTkFHRV9ETlMiLCJNQU5BR0VfREFUQVBMQVRGT1JNIiwiQUNDRVNTX0FORF9NQU5BR0VfQUlfTU9ERUxfSFVCIiwiTUFOQUdFX0RCQUFTIiwiQ1JFQVRFX0lOVEVSTkVUX0FDQ0VTUyIsIlBDQ19DUkVBVEUiLCJBQ0NFU1NfQU5EX01BTkFHRV9ORVRXT1JLX0ZJTEVfU1RPUkFHRSIsIkFDQ0VTU19BTkRfTUFOQUdFX1ZQTiIsIkFDQ0VTU19BTkRfTUFOQUdFX0NETiIsIks4U19DTFVTVEVSX0NSRUFURSIsIlNOQVBTSE9UX0NSRUFURSIsIkZMT1dfTE9HX0NSRUFURSIsIkFDQ0VTU19BTkRfTUFOQUdFX01PTklUT1JJTkciLCJBQ0NFU1NfQU5EX01BTkFHRV9LQUFTIiwiQUNDRVNTX1MzX09CSkVDVF9TVE9SQUdFIiwiQUNDRVNTX0FORF9NQU5BR0VfSUFNX1JFU09VUkNFUyIsIklQX0JMT0NLX1JFU0VSVkUiLCJDUkVBVEVfTkVUV09SS19TRUNVUklUWV9HUk9VUFMiXSwidXVpZCI6IjVjOTZkNTEyLTcwYmMtNDg0NC04NDYyLTdkNmUwYzQ2YTUxYSIsInJlc2VsbGVySWQiOjEsInJlZ0RvbWFpbiI6Imlvbm9zLmRlIiwicm9sZSI6InVzZXIiLCJjb250cmFjdE51bWJlciI6MzY3MzIyMzksImlzUGFyZW50IjpmYWxzZX0sImV4cCI6MTc2NDM0OTYzM30.BK7N-SF8DlD6DFVf6kqcTuRa58Ie-VBqzadyUIpXEunw0lgOq0RyOq7De5RLS2W8EHcs9PeyXW3vZDMzEG9zGae61b_278yrtdWsCvQY8m7kWeN-IT_EGQKOpNGFGfgW3ATqk4vu8OMRVo3OvB55LfCvUhkW_P3LmdthiMHw5CrqemcJQJohLlvU_PL64chFsLjeBtfdDa7T9iU-GLBQqbV6ZRDxPxnyw0G8CVv57NwTx4g3E4b36YRjLKWYIHgmMiao-RHCYxWtzLOeP5n06lf-t8dqJdHubAglnd5jpEm1T7-v_GmfRxcFx-Cfr5ioFlyRmsraHNimhkyfTw9H-A";

const runRequest = async (
  // prompt: string,
  // answerOptions: [string, ...string[]],

  model: OpenAiModelName,
  requestParams: Omit<OpenAI.Responses.ResponseCreateParams, "model">,
  fallbackModels: OpenAiModelName[] = [],
) => {
  // const COMPLETION_ENDPOINT =
  //   "https://openai.inference.de-txl.ionos.com/v1/chat/completions";
  // const MODEL_NAME = "meta-llama/Llama-3.3-70B-Instruct";
  // const promptArr = [
  //   //    { role: "system", content: "You are a helpful assistant." },
  //   {
  //     role: "user",
  //     content: prompt,
  //   },
  // ];
  // const completionResponse = await fetch(COMPLETION_ENDPOINT, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${IONOS_API_TOKEN}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     model: MODEL_NAME,
  //     messages: promptArr,
  //     response_format: {
  //       type: "json_schema",
  //       json_schema: {
  //         name: "enum_output",
  //         schema: {
  //           type: "object",
  //           properties: {
  //             value: {
  //               type: "string",
  //               enum: answerOptions,
  //             },
  //           },
  //           required: ["value"],
  //           additionalProperties: false,
  //         },
  //       },
  //     },
  //   }),
  // });
  // return (
  //   (await completionResponse.json()) as {
  //     choices: {
  //       message?: {
  //         content: {
  //           value: string;
  //         };
  //       };
  //     }[];
  //   }
  // ).choices[0].message?.content.value as string;
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

  //  const response = await runRequest(prompt, answerOptions);
  //  return response;
};

export const getTranscript = async (fileName: string) => {
  const client = new OpenAI({ apiKey: openAiApiKey });
  const res = await client.audio.transcriptions.create({
    file: fs.createReadStream(fileName),
    model: "gpt-4o-transcribe",
  });
  return res.text;
};
