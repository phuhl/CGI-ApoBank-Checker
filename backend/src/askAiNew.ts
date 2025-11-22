import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { spawn } from "child_process";
import path from "path";

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

/**
 * Types for the Python STT result
 */
type SpeakerSegment = {
  start: number;
  end: number;
  text: string;
  speaker_id: string;
};

type PythonResult = {
  segments_with_speaker?: SpeakerSegment[];
};

/**
 * Run the Python stt_with_diarization_new.py script in the project root
 * using the virtualenv: .venv/bin/python3
 */
const runPythonStt = (audioPath: string): Promise<PythonResult> => {
  // Resolve project root: /.../CGI-ApoBank-Checker
  const projectRoot = path.resolve(__dirname, "..", "..");
  const pythonBin = path.join(projectRoot, ".venv", "bin", "python3");
  const scriptPath = path.join(projectRoot, "transcription", "stt_with_diarization_new.py");

  // Make sure Python gets an absolute path to the audio file
  const audioAbsPath = path.isAbsolute(audioPath)
    ? audioPath
    : path.resolve(audioPath);

  console.log("runPythonStt:", {
    projectRoot,
    pythonBin,
    scriptPath,
    audioAbsPath,
  });

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [scriptPath, audioAbsPath], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ORT_LOG_SEVERITY_LEVEL: "3", // silence ONNX warnings
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString("utf8");
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });

    child.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      reject(err);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        console.error("Python exited with code:", code);
        console.error("Python stderr:\n", stderr);
        return reject(
          new Error(
            `Python exited with code ${code}\n\nstderr:\n${stderr}`,
          ),
        );
      }
      try {
        const parsed = JSON.parse(stdout) as PythonResult;
        resolve(parsed);
      } catch (err) {
        console.error(
          "Failed to parse Python JSON output:",
          err,
          "\nstdout:\n",
          stdout,
          "\nstderr:\n",
          stderr,
        );
        reject(
          new Error(
            `Failed to parse Python JSON output: ${
              (err as Error).message
            }\n\nstdout:\n${stdout}\n\nstderr:\n${stderr}`,
          ),
        );
      }
    });
  });
};

/**
 * New getTranscript implementation:
 * - calls Python STT/diarization
 * - flattens segments_with_speaker into a plain transcript string
 */
export const getTranscript = async (fileName: string): Promise<string> => {
  const result = await runPythonStt(fileName);
  const segments = result.segments_with_speaker ?? [];

  const transcript = segments.map((s) => s.text).join(" ");
  console.log("Transcript", transcript);
  return transcript;
};

// Optional helper if you ever want speaker info in the backend:
export const getTranscriptWithSpeakers = async (
  fileName: string,
): Promise<SpeakerSegment[]> => {
  const result = await runPythonStt(fileName);
  return result.segments_with_speaker ?? [];
};
