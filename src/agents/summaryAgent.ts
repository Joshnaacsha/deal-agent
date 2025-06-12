import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function generateSummary(state: any) {
  const {
    strategicScore,
    explanation,
    redFlags,
    totalFlags,
    action,
    readinessScore,
    readinessExplanation,
  } = state;

  const combinedScore = strategicScore + readinessScore; // ✅ Define outside

  let input = "";

  if (action === "do not proceed") {
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
      .join("\n");

    input = `
You are a risk analyst.

Summarize why this RFP should not be pursued.

---
Verdict and Justifications  
Verdict: ❌ Do not proceed – ${totalFlags} red flags detected.

Red Flags Triggered:
${triggeredFlags}

Justification:
These issues introduce unacceptable risk to pursuit or delivery.

Recommendation:
- Escalate: Legal or compliance if needed.
- Mitigate Risks: Suggest only if specific issues are remediable.
- Proceed: ❌ Not advised.
    `.trim();
  } else {
    let verdict = "";
    if (combinedScore >= 2) verdict = "✅ Proceed";
    else if (combinedScore >= 1.5) verdict = "⚠️ Proceed with caution";
    else verdict = "❌ Do not proceed";

    input = `
You are a strategic pre-sales analyst.

Generate a pursuit recommendation using strategic evaluation, customer readiness, and red flags.

---
Verdict and Justifications  
Verdict: ${verdict} – Combined Score: ${combinedScore.toFixed(2)}

🔴 Red Flags:
Total Flags: ${totalFlags}
Flags Triggered: ${
      Object.entries(redFlags)
        .filter(([_, v]) => v === "yes").length > 0
        ? Object.entries(redFlags)
            .filter(([_, v]) => v === "yes")
            .map(([k]) => `• ${k}`).join(", ")
        : "None"
    }

📊 Strategic Evaluation (Score: ${strategicScore.toFixed(2)}):
- Market Alignment: ${explanation.marketAlignment}
- Win Probability: ${explanation.winProbability}
- Delivery Capability: ${explanation.deliveryCapability}
- Business Justification: ${explanation.businessJustification}

📘 Customer Readiness (Score: ${readinessScore.toFixed(2)}):
- Stakeholder Clarity: ${readinessExplanation.stakeholderClarity}
- Decision Maker Access: ${readinessExplanation.decisionMakerAccess}
- Project Background: ${readinessExplanation.projectBackground}

---
Recommendation:
- Escalate: <Add if critical concerns exist>
- Mitigate Risks: <List if any>
- Proceed: <List strengths if any>
    `.trim();
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const raw = await result.response.text();
  state.summary = raw.trim();
  return state;
}
