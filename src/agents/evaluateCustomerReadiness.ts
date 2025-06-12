import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function evaluateCustomerReadiness(state: any) {
  const rfpText = state.rawText;

  const prompt = `
You are a deal analyst.

Evaluate the following RFP text on the "Customer Readiness & Maturity" criteria.

You must return this JSON format:
{
  "readinessScore": number,  // 0.0 to 1.0
  "explanation": {
    "stakeholderClarity": string,
    "decisionMakerAccess": string,
    "projectBackground": string
  },
  "scores": {
    "stakeholderClarity": number,    // 1–5
    "decisionMakerAccess": number,
    "projectBackground": number
  }
}

RFP TEXT:
${rfpText}
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const raw = await result.response.text();

  try {
    const parsed = JSON.parse(raw.trim().replace(/^```json/, "").replace(/```$/, ""));

    state.readinessScore = parsed.readinessScore;
    state.readinessExplanation = parsed.explanation;
    state.readinessBreakdown = parsed.scores;

    console.log("📋 Customer Readiness Evaluated:", parsed);
    return state;
  } catch (err) {
    console.error("❌ Readiness agent parsing failed:", raw);
    state.readinessScore = 0;
    return state;
  }
}
