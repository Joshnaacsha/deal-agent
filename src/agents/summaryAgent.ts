import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Accept full state
export async function generateSummary(state: any) {
  const { strategicScore, explanation } = state;

  const input = `
You are a strategic analyst assistant.

Using the following evaluation result, generate a professional summary for executive leadership.

Use this format:

---
Verdict and Justifications  
Verdict: <use ✅ Proceed, ⚠️ Caution, or ❌ Do not proceed>, followed by a short one-line judgment. Then a paragraph of justification drawing from the four explanations.
Recommendation:
- Escalate: <if needed>
- Mitigate Risks: <if needed>
- Proceed: <what to emphasize>

---
Strategic Score: ${strategicScore}

Explanations:
Market Alignment: ${explanation.marketAlignment}
Win Probability: ${explanation.winProbability}
Delivery Capability: ${explanation.deliveryCapability}
Business Justification: ${explanation.businessJustification}
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const raw = await result.response.text();
  state.summary = raw.trim();

  return state;
}
