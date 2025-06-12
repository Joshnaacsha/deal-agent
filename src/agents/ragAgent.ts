import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { searchSimilar } from "../query/searchSimilar.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function streamAnswerWithContext(
  state: any,
  onToken: (token: string) => void
) {
  const question: string = state.question;
  const chatHistory: Message[] = state.messages ?? [];

  // ✅ Step 1: Retrieve document context
  const docResults = state.docResults ?? (await searchSimilar(question, 4));
  const docContext = docResults.map((r: { content: string }) => r.content).join("\n---\n");

  // ✅ Step 2: Use web context only if already present in state
  const webContext = (state.webScrapedDocuments || [])
    .map((doc: { pageContent: string }) => doc.pageContent)
    .join("\n---\n");

  // ✅ Step 3: Format chat history
  const historyText = chatHistory
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  // ✅ Step 4: Compose prompt
  const prompt = `
You are a helpful AI assistant.

You have access to two types of context:
1. 📄 DOCUMENT CONTEXT (from internal documents)
2. 🌐 WEB CONTEXT (from recent internet results)

📄 DOCUMENT CONTEXT:
${docContext || "None"}

🌐 WEB CONTEXT:
${webContext || "None"}

---

CHAT HISTORY:
${historyText}

USER QUESTION:
${question}

Answer the question using the available context:

- Prefer DOCUMENT CONTEXT first.
- If not available in documents, use WEB CONTEXT and explicitly say: "This information is from a recent web search."
- If not found in either, respond **exactly** with: "Not found in available document or web context."
`;

  // ✅ Step 5: Stream the response
  const streamResp = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  let buffer = "";
  let fullOutput = "";

  for await (const chunk of streamResp.stream) {
    const token = chunk.text();
    if (!token) continue;

    buffer += token;
    fullOutput += token;

    const emitRegex = /[.!?]\s|\n{1,2}/g;
    let emitPoint = -1;
    let match: RegExpExecArray | null;

    while ((match = emitRegex.exec(buffer)) !== null) {
      emitPoint = match.index + match[0].length - 1;
    }

    if (emitPoint !== -1) {
      const toEmit = buffer.slice(0, emitPoint + 1);
      onToken(toEmit);
      buffer = buffer.slice(emitPoint + 1);
    }
  }

  if (buffer.trim()) {
    console.log("🧾 Final buffer to flush:", buffer.trim());
    onToken(buffer.trim());
    fullOutput += buffer.trim();
  }

  onToken("[DONE]");

  // ✅ Step 6: Determine if the answer is useful or just a placeholder
  const lowerOutput = fullOutput.toLowerCase();
  const isGeneric =
    lowerOutput.includes("what is your question") ||
    lowerOutput.includes("i'm ready") ||
    lowerOutput.includes("ok. i'm ready") ||
    lowerOutput.includes("okay, i understand") ||
    lowerOutput.includes("i understand");

  const foundAnswer =
    !lowerOutput.includes("not found in available document or web context.") &&
    !isGeneric;

  state.generation = fullOutput;
  state.answerFound = foundAnswer;

  console.log("🧾 Full Answer:", fullOutput);
  console.log("⚠️ Generic Answer:", isGeneric);
  console.log("✅ isAnswerInDocument:", foundAnswer);

  return state;
}
