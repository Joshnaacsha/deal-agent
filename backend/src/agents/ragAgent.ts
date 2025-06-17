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

  const docResults = state.docResults ?? (await searchSimilar(question, 4));
  const docContext = docResults.map((r: { content: string }) => r.content).join("\n---\n");

  const webContext = (state.webScrapedDocuments || [])
    .map((doc: { pageContent: string }) => doc.pageContent)
    .join("\n---\n");

  const historyText = chatHistory
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");
  
  const rfpText = state.rawText; 


  const prompt = `
You are a helpful AI assistant answering questions about an RFP evaluation.

You have access to:
1. 📄 DOCUMENT CONTEXT (from internal documents)
2. 🌐 WEB CONTEXT (from recent internet results)
3. 🧠 AGENT CONTEXT (from internal evaluation agents like Red Flag, Strategy, and Readiness)

📄 DOCUMENT CONTEXT:
${docContext || "None"}

🌐 WEB CONTEXT:
${webContext || "None"}

🧠 AGENT CONTEXT:
Red Flag Verdict: ${state.action}
Total Flags: ${state.totalFlags}
Red Flags:
- Vendor Minimum Only: ${state.redFlags?.vendorMinimumOnly}
- Biased Scope: ${state.redFlags?.biasedScope}
- Unrealistic Timeline or Budget: ${state.redFlags?.unrealisticTimelineOrBudget}
- No Stakeholder Access: ${state.redFlags?.noStakeholderAccess}
- Missing Evaluation Criteria: ${state.redFlags?.missingEvaluationCriteria}

Strategic Score: ${state.strategicScore} / 1.75
Readiness Score: ${state.readinessScore} / 1.0

Explanations:
- Market Alignment: ${state.explanation?.marketAlignment}
- Win Probability: ${state.explanation?.winProbability}
- Delivery Capability: ${state.explanation?.deliveryCapability}
- Business Justification: ${state.explanation?.businessJustification}

Readiness Explanation:
- Stakeholder Clarity: ${state.readinessExplanation?.stakeholderClarity}
- Decision-Maker Access: ${state.readinessExplanation?.decisionMakerAccess}
- Project Background: ${state.readinessExplanation?.projectBackground}

---
RFP TEXT:
${rfpText}

CHAT HISTORY:
${historyText}

USER QUESTION:
${question}

Instructions:
Use agent insights and context first to answer questions about red flags, strategic score, or readiness.
Fallback to document and web context only if the question isn’t about agent results.
End with 3 follow-up questions the user could ask next. Only suggest questions that can be answered from the RFP text. Questions must be based on the current context above.
If nothing is relevant, respond exactly with: "Not found in available context."

Format them like:
Follow-up questions:
1. ...
2. ...
3. ...

`;

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

  const lowerOutput = fullOutput.toLowerCase();
  const isGeneric =
    lowerOutput.includes("what is your question") ||
    lowerOutput.includes("i'm ready") ||
    lowerOutput.includes("ok. i'm ready") ||
    lowerOutput.includes("okay, i understand") ||
    lowerOutput.includes("i understand");

  const foundAnswer =
    !lowerOutput.includes("not found in available context") && !isGeneric;

  state.generation = fullOutput;
  state.answerFound = foundAnswer;

  const followupMatch = fullOutput.match(/Follow[- ]?up Questions?:([\s\S]*)/i);
  if (followupMatch) {
    const raw = followupMatch[1];
    const questions = raw
      .split(/\n|\d+[.)]|[-•*] /)
      .map(q => q.trim())
      .filter(q => q && !q.toLowerCase().includes("not found"));
    state.followupSuggestions = questions.slice(0, 3);
  }

  console.log("🧾 Full Answer:", fullOutput);
  console.log("⚠️ Generic Answer:", isGeneric);
  console.log("✅ isAnswerInDocument:", foundAnswer);
  console.log("🤖 Follow-up Suggestions:", state.followupSuggestions);

  return state;
}
