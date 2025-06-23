import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function generateSummary(state: any) {
  const {
    strategicScore,
    competitiveScore,
    strategicUpsideScore,
    readinessScore,
    explanation,
    redFlags,
    totalFlags,
    action,
    readinessExplanation,
  } = state;

  const maxScore = 5.0;
  const combinedScore = Math.min(
    (strategicScore || 0) +
      (competitiveScore || 0) +
      (strategicUpsideScore || 0) +
      (readinessScore || 0),
    maxScore
  );
  const percentage = ((combinedScore / maxScore) * 100).toFixed(1);

  const flagDescriptions = {
    vendorMinimumOnly:
      "Only minimum vendor requirements provided, which may indicate minimal effort or checkbox compliance.",
    biasedScope:
      "The scope seems written for a specific vendor, possibly signaling a biased selection process.",
    unrealisticTimelineOrBudget:
      "The project timeline or budget appears unrealistic and could compromise delivery quality.",
    noStakeholderAccess:
      "No access to key stakeholders is mentioned, which limits discovery and solutioning.",
    missingEvaluationCriteria:
      "The evaluation criteria are vague or missing, making the selection process unpredictable.",
  };

  let input = "";

  if (action === "do not proceed") {
    const triggeredFlags = Object.entries(redFlags)
      .filter(([_, value]) => value === "yes")
      .map(
        ([key]) =>
          `- ${flagDescriptions[key as keyof typeof flagDescriptions]}`
      )
      .join("\n");

    input = `
You are a risk analyst. Avoid internal framework terms and instead use clear, human-friendly language appropriate for client-facing summaries.

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
📨 Follow-up Questions to Ask the Client:
(Generate 5 clarification questions that could help fill gaps in the RFP or derisk the engagements.)
    `.trim();
  } else {
    let verdict = "";
    const percent = parseFloat(percentage);
    if (percent >= 75) verdict = "✅ Proceed";
    else if (percent >= 65) verdict = "⚠️ Proceed with caution";
    else verdict = "❌ Do not proceed";

    const triggeredFlags = Object.entries(redFlags)
      .filter(([_, value]) => value === "yes")
      .map(
        ([key]) =>
          `• ${flagDescriptions[key as keyof typeof flagDescriptions]}`
      )
      .join("\n");

    input = `
You are a strategic pre-sales analyst. Avoid internal framework terms and instead use clear, human-friendly language appropriate for client-facing summaries.

Generate a pursuit recommendation using all evaluation dimensions and red flag analysis.

---
🏁 Verdict: ${verdict}
📈 Overall Score: ${percentage}% (based on a max of 5.0)

🔴 Red Flags:
Total Flags: ${totalFlags}
Flags Triggered:
${triggeredFlags || "None"}

📊 Strategic Evaluation:
- Market Alignment: ${explanation.marketAlignment}
- Win Probability: ${explanation.winProbability}
- Delivery Capability: ${explanation.deliveryCapability}
- Business Justification: ${explanation.businessJustification}

🧩 Competitive Edge:
- Relevant Experience: ${explanation.relevantExperience}
- Differentiators: ${explanation.differentiators}
- Client Relationship: ${explanation.clientRelationship}

📘 Strategic Upside:
- Long-Term Potential: ${explanation.longTermPotential}
- Brand Value: ${explanation.brandValue}

📘 Customer Readiness:
- Stakeholder Clarity: ${readinessExplanation.stakeholderClarity}
- Decision Maker Access: ${readinessExplanation.decisionMakerAccess}
- Project Background: ${readinessExplanation.projectBackground}

---
✅ Recommendation:
- Escalate: <Specify if critical concerns exist>
- Mitigate: <List any risks and solutions>
- Proceed: <Highlight strengths or alignment>

---
📨 Follow-up Questions to Ask the Client:
(Generate 5 clarification questions that could help fill gaps in the RFP or derisk the engagement.)
    `.trim();
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: input }] }],
  });

  const raw = await result.response.text();
  state.summary = raw.trim();
  return state;
}
