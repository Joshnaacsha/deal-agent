import { Annotation } from "@langchain/langgraph";
import { type DocumentInterface } from "@langchain/core/documents";
import { BaseMessage } from "@langchain/core/messages";

export const graphStateDef = {
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => (x ? x.concat(y) : y ?? []),
    default: () => [],
  }),
  documents: Annotation<DocumentInterface[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  question: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  generation: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  webScrapedDocuments: Annotation<DocumentInterface[]>({
    reducer: (x, y) => (x ? x.concat(y) : y ?? []),
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  rawText: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  strategicScore: Annotation<number>({
    reducer: (x, y) => y ?? x ?? 0,
    default: () => 0,
  }),
  scores: Annotation<{
    marketAlignment: number;
    winProbability: number;
    deliveryCapability: number;
    businessJustification: number;
  }>({
    reducer: (x, y) =>
      y ??
      x ?? {
        marketAlignment: 0,
        winProbability: 0,
        deliveryCapability: 0,
        businessJustification: 0,
      },
    default: () => ({
      marketAlignment: 0,
      winProbability: 0,
      deliveryCapability: 0,
      businessJustification: 0,
    }),
  }),
  explanation: Annotation<{
    marketAlignment: string;
    winProbability: string;
    deliveryCapability: string;
    businessJustification: string;
  }>({
    reducer: (x, y) =>
      y ??
      x ?? {
        marketAlignment: "",
        winProbability: "",
        deliveryCapability: "",
        businessJustification: "",
      },
    default: () => ({
      marketAlignment: "",
      winProbability: "",
      deliveryCapability: "",
      businessJustification: "",
    }),
  }),
  isQualified: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),
  hasScraped: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),

  // Red Flag Agent
  redFlags: Annotation<{
    vendorMinimumOnly: "yes" | "no" | "unknown";
    biasedScope: "yes" | "no" | "unknown";
    unrealisticTimelineOrBudget: "yes" | "no" | "unknown";
    noStakeholderAccess: "yes" | "no" | "unknown";
    missingEvaluationCriteria: "yes" | "no" | "unknown";
  }>({
    reducer: (x, y) => y ?? x ?? {
      vendorMinimumOnly: "unknown",
      biasedScope: "unknown",
      unrealisticTimelineOrBudget: "unknown",
      noStakeholderAccess: "unknown",
      missingEvaluationCriteria: "unknown",
    },
    default: () => ({
      vendorMinimumOnly: "unknown",
      biasedScope: "unknown",
      unrealisticTimelineOrBudget: "unknown",
      noStakeholderAccess: "unknown",
      missingEvaluationCriteria: "unknown",
    }),
  }),

  totalFlags: Annotation<number>({
    reducer: (x, y) => y ?? x ?? 0,
    default: () => 0,
  }),

  action: Annotation<"proceed" | "do not proceed">({
    reducer: (x, y) => y ?? x ?? "proceed",
    default: () => "proceed",
  }),

  readinessScore: Annotation<number>({
  reducer: (x, y) => y ?? x ?? 0,
  default: () => 0,
}),
readinessExplanation: Annotation<{
  stakeholderClarity: string;
  decisionMakerAccess: string;
  projectBackground: string;
}>({
  reducer: (x, y) => y ?? x ?? {
    stakeholderClarity: "",
    decisionMakerAccess: "",
    projectBackground: "",
  },
  default: () => ({
    stakeholderClarity: "",
    decisionMakerAccess: "",
    projectBackground: "",
  }),
}),
readinessBreakdown: Annotation<{
  stakeholderClarity: number;
  decisionMakerAccess: number;
  projectBackground: number;
}>({
  reducer: (x, y) => y ?? x ?? {
    stakeholderClarity: 0,
    decisionMakerAccess: 0,
    projectBackground: 0,
  },
  default: () => ({
    stakeholderClarity: 0,
    decisionMakerAccess: 0,
    projectBackground: 0,
  }),
}),
followupSuggestions: Annotation<string[]>({
  reducer: (x, y) => y ?? x ?? [],
  default: () => [],
}),

};


