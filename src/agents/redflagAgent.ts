import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function cleanJsonString(text: string): string {
  return text.trim().replace(/^```json\s*/, "").replace(/```$/, "");
}

export async function evaluateRedFlags(state: any) {
  const rfpText = state.rawText;

  const systemPrompt = `
You are a Red Flag Filter Agent.

Evaluate the following 5 red flags in the given RFP text. For each one, answer "yes" or "no".

Red Flags:
1. Just added to meet vendor minimum
2. Scope favors another vendor
3. Unrealistic timeline or budget
4. No stakeholder access
5. Vague or missing evaluation criteria

Return a JSON like this:
{
  "redFlags": {
    "vendorMinimumOnly": "yes" | "no",
    "biasedScope": "yes" | "no",
    "unrealisticTimelineOrBudget": "yes" | "no",
    "noStakeholderAccess": "yes" | "no",
    "missingEvaluationCriteria": "yes" | "no"
  },
  "totalFlags": number,
  "action": "proceed" | "do not proceed"
}

Rule: If 2 or more red flags are "yes", set action to "do not proceed". Otherwise, "proceed".
`;

  const input = `
${systemPrompt}

RFP TEXT:
${rfpText}
`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const rawResponse = await result.response.text();
  const jsonStr = cleanJsonString(rawResponse);

  try {
    const parsed = JSON.parse(jsonStr);

    state.redFlags = parsed.redFlags;
    state.totalFlags = parsed.totalFlags;
    state.action = parsed.action;

    console.log("🚨 Red Flag Evaluation Complete:", parsed);
    return state;
  } catch (err) {
    console.error("❌ Failed to parse red flag agent output:", rawResponse);

    state.redFlags = {
      vendorMinimumOnly: "unknown",
      biasedScope: "unknown",
      unrealisticTimelineOrBudget: "unknown",
      noStakeholderAccess: "unknown",
      missingEvaluationCriteria: "unknown",
    };
    state.totalFlags = 0;
    state.action = "proceed";

    return state;
  }
}
