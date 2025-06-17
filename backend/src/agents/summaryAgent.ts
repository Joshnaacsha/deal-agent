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

  const combinedScore = strategicScore + readinessScore;
  const maxScore = 2.75;
  const percentage = ((combinedScore / maxScore) * 100).toFixed(1);

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
❌ Verdict: Do not proceed – ${totalFlags} red flags detected.

🔴 Red Flags Triggered:
${triggeredFlags}

Justification:
These issues introduce unacceptable risk to pursuit or delivery.

Recommendation:
- Escalate to legal or compliance if needed.
- Mitigate risks only if remediable.
- Proceed: ❌ Not advised.

---
At the end of your response, suggest 3 follow-up questions the user could ask next.

    `.trim();
  } else {
    let verdict = "";
    const percent = parseFloat(percentage);
    if (percent >= 75) verdict = "✅ Proceed";
    else if (percent >= 55) verdict = "⚠️ Proceed with caution";
    else verdict = "❌ Do not proceed";

    input = `
You are a strategic pre-sales analyst.

Generate a pursuit recommendation using strategic evaluation, customer readiness, and red flags.

---
🏁 Verdict: ${verdict}
📈 Overall Score: ${percentage}% (out of 100%)

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

📊 Strategic Evaluation:
- Market Alignment: ${explanation.marketAlignment}
- Win Probability: ${explanation.winProbability}
- Delivery Capability: ${explanation.deliveryCapability}
- Business Justification: ${explanation.businessJustification}

📘 Customer Readiness:
- Stakeholder Clarity: ${readinessExplanation.stakeholderClarity}
- Decision Maker Access: ${readinessExplanation.decisionMakerAccess}
- Project Background: ${readinessExplanation.projectBackground}

---
✅ Recommendation:
- Escalate: <Specify if critical concerns exist>
- Mitigate: <List any risks and solutions>
- Proceed: <Highlight strengths or alignment>

At the end of your response, suggest 3 follow-up questions the user could ask next.

    `.trim();
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const raw = await result.response.text();
  state.summary = raw.trim();
  return state;
}
