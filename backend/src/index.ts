import { z } from "zod";
import express from "express";
import cors from "cors";
import multer, { diskStorage } from "multer";
import path from "path";
import fs from "fs";
import { askAiWithSchema, getTranscript } from "./askAi";
import { analyze } from "./analyze";

const app = express();
const port = 3000;

// Enable CORS for the frontend dev server(s)
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "http://217.154.252.215",
    ],
  }),
);

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, String(Date.now()) + ".mp3");
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "audio/mpeg") {
      return cb(new Error("Only MP3 files are allowed"));
    }
    cb(null, true);
  },
});

app.post("/analyze", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No MP3 file uploaded" });
  }
  const path = req.file.path;
  console.log("Got request");
  const transcriptions = await Promise.all(
    new Array(3).fill(0).map((_) => getTranscript(path)),
  );

  const transcription = (
    await askAiWithSchema(
      "gpt-4.1",
      `
You will receive multiple transcriptions of the same audio file. Your job is to
combine them into a single, most accurate transcription by resolving any
 differences between them.

Here are the transcriptions:
${transcriptions
  .map(
    (t, i) => `Transcription ${String(i + 1)}:
${t}`,
  )
  .join("\n\n")}

`,
      z.object({
        transcription: z.string(),
      }),
    )
  ).transcription;

  // const transcription = await getTranscript(req.file.path);

  const results = await analyze(transcription);

  res.json(results);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${String(port)}`);
});
