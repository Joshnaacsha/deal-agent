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
    reducer: (x, y) => y ?? x ?? {
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
    reducer: (x, y) => y ?? x ?? {
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
  // ✅ ADD THIS:
  hasScraped: Annotation<boolean>({
    reducer: (x, y) => y ?? x ?? false,
    default: () => false,
  }),
};
