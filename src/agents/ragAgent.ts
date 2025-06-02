import { searchSimilar } from "../query/searchSimilar";
import { ChatOllama } from "@langchain/ollama";
import { AIMessageChunk } from "@langchain/core/messages";
import dotenv from "dotenv";
dotenv.config();

const llm = new ChatOllama({
  baseUrl: process.env.OLLAMA_BASE_URL!,
  model: process.env.OLLAMA_MODEL!,
   streaming: true,
});

export const answerWithContext = async (question: string): Promise<string> => {
  // Step 1: Get relevant chunks
  const results = await searchSimilar(question, 4);

  if (!results.length) {
    return "❌ No relevant information found in the documents.";
  }

  // Step 2: Concatenate context
  const context = results.map((r: { content: any; }) => r.content).join("\n---\n");

  // Step 3: Build final prompt
  const prompt = `
You are a helpful assistant specialized in analyzing RFP documents.
Answer the following question using only the context provided.

CONTEXT:
${context}

QUESTION:
${question}

If the answer is not found in the context, say "Not found in the provided document."
`;

  // Step 4: Get answer from Ollama
  const response = await llm.invoke(prompt);
  return typeof response.content === "string"
  ? response.content
  : response.content.map(c => ("text" in c ? c.text : "")).join(" ");
}

type Message = {
  role: "user" | "ai";
  content: string;
};

export async function streamAnswerWithContext(
  question: string,
  chatHistory: Message[],
  onToken: (token: string) => void
): Promise<void> {
  const results = await searchSimilar(question, 4);
  const context = results.map((r: { content: any; }) => r.content).join("\n---\n");

  const historyText = chatHistory
    .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n");

  const prompt = `
You are a helpful AI assistant for reading RFP documents.

CONTEXT:
${context}

CHAT HISTORY:
${historyText}

USER QUESTION:
${question}

Answer only using the CONTEXT above. If not found, say "Not found in the provided document."
`;

  const stream = await llm.stream(prompt);

  let buffer = "";

  for await (const chunk of stream) {
    let token = (chunk as AIMessageChunk).content;

    if (Array.isArray(token)) {
      token = token.map(c => ("text" in c ? c.text : "")).join("");
    }

    if (typeof token === "string") {
      // Append and emit properly spaced text
      buffer += token;

      // Emit only if there's a sentence or paragraph boundary
      const emitRegex = /[.!?]\s|\n{1,2}/g;
      let emitPoint = -1;
      let match: RegExpExecArray | null;
      while ((match = emitRegex.exec(buffer)) !== null) {
        emitPoint = match.index + match[0].length - 1;
      }

      if (emitPoint !== -1) {
        onToken(buffer.slice(0, emitPoint + 1));
        buffer = buffer.slice(emitPoint + 1);
      }
    }
  }

  // Flush any remaining buffer
  if (buffer.trim()) {
    onToken(buffer.trim());
  }

  onToken("[DONE]");
}
