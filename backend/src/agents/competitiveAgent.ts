import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import metadata from "../config/metadata.json";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function cleanJsonString(text: string): string {
  return text.trim().replace(/^```json\s*/, "").replace(/```$/, "");
}

export async function evaluateCompetitiveEdge(state: any) {
  const rfpText = state.rawText;

  const systemPrompt = `
You are a Competitive Edge Agent.

Your task is to evaluate the company's competitive advantage for this RFP using internal metadata and the RFP document.

Evaluate these 3 criteria (each 10%, total 30%, max score = 1.5):

1. Relevant Experience – Do we have comparable wins, references, or IP?
2. Differentiators – Are our AI, automation, or platform features unique?
3. Client Relationship – Do we have prior engagement, rapport, or insights?

Score each from 1–5, multiply by 0.3, 0.3, and 0.3 respectively, and sum.

Return structured JSON:
{
  "competitiveScore": number,
  "explanation": {
    "relevantExperience": string,
    "differentiators": string,
    "clientRelationship": string
  },
  "scores": {
    "relevantExperience": number,
    "differentiators": number,
    "clientRelationship": number
  }
}
`;

  const input = `
${systemPrompt}

RFP TEXT:
${rfpText}

INTERNAL METADATA:
${JSON.stringify(metadata, null, 2)}
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const rawResponse = await result.response.text();
  const jsonStr = cleanJsonString(rawResponse);

  try {
    const parsed = JSON.parse(jsonStr);

    state.competitiveScore = parsed.competitiveScore;
    state.scores = { ...state.scores, ...parsed.scores };
    state.explanation = { ...state.explanation, ...parsed.explanation };

    console.log("📊 Competitive Edge Evaluation Complete:", parsed);
    return state;
  } catch (err) {
    console.error("❌ Failed to parse competitive agent output:", rawResponse);

    state.competitiveScore = 0;
    state.scores = {
      ...state.scores,
      relevantExperience: 0,
      differentiators: 0,
      clientRelationship: 0,
    };
    state.explanation = {
      ...state.explanation,
      relevantExperience: "Unable to evaluate.",
      differentiators: "Unable to evaluate.",
      clientRelationship: "Unable to evaluate.",
    };
    return state;
  }
}
