import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function generateSummary(state: any) {
  const { strategicScore, explanation, redFlags, totalFlags, action } = state;

  const flagDescriptions = {
    vendorMinimumOnly: "Only minimum vendor requirements provided",
    biasedScope: "Scope appears biased toward a specific vendor",
    unrealisticTimelineOrBudget: "Timeline or budget seems unrealistic",
    noStakeholderAccess: "No access to key stakeholders provided",
    missingEvaluationCriteria: "Missing or vague evaluation criteria",
  };

  const triggeredFlags = Object.entries(redFlags)
    .filter(([_, value]) => value === "yes")
    .map(([key]) => `- ${flagDescriptions[key as keyof typeof flagDescriptions]}`)
    .join("\n") || "- None";

  let input = "";

  if (action === "do not proceed") {
    input = `
You are a risk analyst.

Based on red flag checks, summarize why this RFP should not be pursued.

Use this format:

---
Verdict and Justifications  
Verdict: ❌ Do not proceed – ${totalFlags} red flags detected.

Red Flags Triggered:
${triggeredFlags}

Justification:
Explain that due to these issues, the opportunity carries high strategic or execution risk.

Recommendation:
- Escalate: Legal or compliance review if needed.
- Mitigate Risks: Suggest steps only if any seem remediable.
- Proceed: ❌ Not recommended.
`;
  } else {
    input = `
You are a strategic analyst assistant.

Using the following evaluation and red flag results, generate a professional summary for executive leadership.

Use this format:

---
Verdict and Justifications  
Verdict: <✅ Proceed, ⚠️ Caution, or ❌ Do not proceed>, followed by a short one-line judgment.
Then a paragraph of justification using both strategic explanations and red flag insights.

Recommendation:
- Escalate: <if needed>
- Mitigate Risks: <based on red flags or weak strategy areas>
- Proceed: <what to emphasize or do next>

---
Strategic Score: ${strategicScore}

Explanations:
Market Alignment: ${explanation.marketAlignment}
Win Probability: ${explanation.winProbability}
Delivery Capability: ${explanation.deliveryCapability}
Business Justification: ${explanation.businessJustification}

Red Flags Triggered (${totalFlags}):
${triggeredFlags}
`;
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const raw = await result.response.text();
  state.summary = raw.trim();
  return state;
}
