import { ChatOllama } from "@langchain/ollama";
import { AIMessage } from "@langchain/core/messages"; // helps with typing
import dotenv from "dotenv";

dotenv.config();

const chat = new ChatOllama({
  baseUrl: process.env.OLLAMA_BASE_URL!,
  model: process.env.OLLAMA_MODEL!,
});

export async function askOllama(question: string): Promise<string> {
  const res = await chat.invoke(question) as AIMessage;

  // Log the structure in case debugging is needed
  console.log("Raw response content:", res.content);

  // Safely handle different content formats
  if (typeof res.content === "string") {
    return res.content;
  }

  // If content is an array or complex type
  if (Array.isArray(res.content)) {
    return res.content.map((c: any) => c?.text || "").join(" ");
  }

  // Fallback for unknown structure
  return JSON.stringify(res.content);
}
