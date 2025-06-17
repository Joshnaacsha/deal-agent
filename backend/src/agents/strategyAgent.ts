import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import metadata from "../config/metadata.json";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function cleanJsonString(text: string): string {
  return text.trim().replace(/^```json\s*/, "").replace(/```$/, "");
}

export async function evaluateStrategy(state: any) {
  const rfpText = state.rawText; 

  const systemPrompt = `
You are a Strategic Qualification Agent.

Your task is to assess the strategic value of an RFP by evaluating 4 criteria using the text of the RFP and the company's metadata.

The 4 weighted criteria are:

1. Market Alignment – 10%
2. Win Probability – 10%
3. Delivery Capability – 10%
4. Business Justification – 5%

Each is rated from 1–5 (1 = Poor, 5 = Excellent), multiplied by its weight, and summed to produce a final score (max 1.75).

Return this structured JSON:
{
  "strategicScore": number,
  "explanation": {
    "marketAlignment": string,
    "winProbability": string,
    "deliveryCapability": string,
    "businessJustification": string
  },
  "scores": {
    "marketAlignment": number,
    "winProbability": number,
    "deliveryCapability": number,
    "businessJustification": number
  }
}
`;

  const input = `
${systemPrompt}

RFP TEXT:
${rfpText}

DOMAIN METADATA:
${JSON.stringify(metadata, null, 2)}
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const rawResponse = await result.response.text();
  const jsonStr = cleanJsonString(rawResponse);

  try {
    const parsed = JSON.parse(jsonStr);

    // Attach results to state
    state.strategicScore = parsed.strategicScore;
    state.scores = parsed.scores;
    state.explanation = parsed.explanation;
    state.isQualified = parsed.strategicScore >= 1.2; // example threshold

    console.log("📊 Strategy Evaluation Complete:", parsed);
    return state;
  } catch (err) {
    console.error("❌ Failed to parse strategy agent output:", rawResponse);

    // Fallback values in state
    state.strategicScore = 0;
    state.scores = {
      marketAlignment: 0,
      winProbability: 0,
      deliveryCapability: 0,
      businessJustification: 0,
    };
    state.explanation = {
      marketAlignment: "Unable to evaluate.",
      winProbability: "Unable to evaluate.",
      deliveryCapability: "Unable to evaluate.",
      businessJustification: "Unable to evaluate.",
    };
    state.isQualified = false;

    return state;
  }
}
