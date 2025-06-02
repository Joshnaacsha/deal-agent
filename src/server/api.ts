import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { answerWithContext, streamAnswerWithContext } from "../agents/ragAgent";
import multer from "multer";
import path from "path";
import fs from "fs";
import { extractTextFromPDF, splitIntoChunks } from "../utils/pdfUtils";
import { embedAndStore } from "../embedding/embedToSupabase";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// ✅ This must be outside the POST route
app.get("/", (req, res) => {
  res.send("✅ Deal Agent API is running. Use POST /ask to interact.");
});

app.post("/upload", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }

  const filePath = path.join(__dirname, "../../uploads", req.file.filename);

  try {
    const text = await extractTextFromPDF(filePath);
    const chunks = splitIntoChunks(text);
    await embedAndStore(chunks);

    fs.unlinkSync(filePath); // clean up

    res.status(200).json({ message: "✅ PDF processed and stored successfully", chunks: chunks.length });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

app.post("/ask", async (req: Request, res: Response): Promise<void> => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "Missing or invalid 'question'" });
    return;
  }

  try {
    const answer = await answerWithContext(question);
    res.json({ answer });
  } catch (err) {
  console.error("❌ API error:", err);
  if (err instanceof Error) {
    res.status(500).json({ error: err.message });
  } else {
    res.status(500).json({ error: "Unknown server error" });
  }
}

});

app.post("/stream", (req: Request, res: Response) => {
  const { question, chatHistory } = req.body;

  if (!question || typeof question !== "string") {
    res.status(400).json({ error: "Invalid question" });
    return;
  }

  if (!Array.isArray(chatHistory)) {
    res.status(400).json({ error: "Invalid chat history" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  (async () => {
    try {
      await streamAnswerWithContext(question, chatHistory, (token: string) => {
        res.write(`data: ${token}\n\n`);
      });

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("❌ Streaming error:", err);
      res.write("data: [ERROR]\n\n");
      res.end();
    }
  })();
});

app.listen(port, () => {
  console.log(`🚀 Deal Agent API running at http://localhost:${port}`);
});
