import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";

import { graphStateDef } from "../agents/graphState";
import type { StateType } from "@langchain/langgraph";

import { extractTextFromPDF, splitIntoChunks } from "../utils/pdfUtils";
import { embedAndStore } from "../embedding/embedToSupabase";
import { compiledGraph } from "../agents/graph"; // 👈 LangGraph instance

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

type DealAgentState = StateType<typeof graphStateDef>;

app.get("/", (req: Request, res: Response) => {
  res.send("✅ Deal Agent API is running. Use POST /upload and /stream to interact.");
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

    fs.unlinkSync(filePath); // cleanup

    const result: DealAgentState = await compiledGraph.invoke({ rawText: text });

    res.status(200).json({
      message: "✅ PDF processed and analyzed",
      chunks: chunks.length,
      summary: result.summary,
      strategicScore: result.strategicScore,
      explanation: result.explanation,
      scores: result.scores ?? null,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

app.post("/stream", async (req: Request, res: Response) => {
  const { question, chatHistory, rawText } = req.body;

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

  let fullResponse = "";

  try {
    await compiledGraph.invoke(
      {
        question,
        messages: chatHistory,
        rawText,
      },
      {
        callbacks: [
          {
            handleLLMNewToken: async (token: string) => {
              fullResponse += token;
              res.write(`data: ${token}\n\n`);
            },
          },
        ],
      }
    );

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("❌ Streaming error:", err);
    res.write("data: [ERROR]\n\n");
    res.end();
  }
});

app.listen(port, () => {
  console.log(`🚀 Deal Agent API running at http://localhost:${port}`);
});
