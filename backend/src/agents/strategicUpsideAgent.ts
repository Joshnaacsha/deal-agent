import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import metadata from "../config/metadata.json";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function cleanJsonString(text: string): string {
  return text.trim().replace(/^```json\s*/, "").replace(/```$/, "");
}

export async function evaluateStrategicUpside(state: any) {
  const rfpText = state.rawText;

  const systemPrompt = `
You are a Strategic Upside Agent.

Evaluate the long-term and brand-building value of this RFP opportunity based on company metadata and RFP text.

Use the following criteria:

1. Long-Term Potential (10%) – Can this lead to expansion, upsell, or land-and-expand?
2. Brand or Market Value (5%) – Does this win enhance the brand or break into a new segment?

Score each from 1–5, then calculate:
- Long-Term Potential × 0.1
- Brand Value × 0.05
Max total score = 0.75

Return JSON:
{
  "strategicUpsideScore": number,
  "explanation": {
    "longTermPotential": string,
    "brandValue": string
  },
  "scores": {
    "longTermPotential": number,
    "brandValue": number
  }
}
`;

  const input = `
${systemPrompt}

RFP TEXT:
${rfpText}

COMPANY METADATA:
${JSON.stringify(metadata, null, 2)}
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const rawResponse = await result.response.text();
  const jsonStr = cleanJsonString(rawResponse);

  try {
    const parsed = JSON.parse(jsonStr);

    state.strategicUpsideScore = parsed.strategicUpsideScore;
    state.scores = { ...state.scores, ...parsed.scores };
    state.explanation = { ...state.explanation, ...parsed.explanation };

    console.log("📈 Strategic Upside Evaluation Complete:", parsed);
    return state;
  } catch (err) {
    console.error("❌ Failed to parse strategic upside agent output:", rawResponse);

    state.strategicUpsideScore = 0;
    state.scores = {
      ...state.scores,
      longTermPotential: 0,
      brandValue: 0,
    };
    state.explanation = {
      ...state.explanation,
      longTermPotential: "Unable to evaluate.",
      brandValue: "Unable to evaluate.",
    };
    return state;
  }
}
