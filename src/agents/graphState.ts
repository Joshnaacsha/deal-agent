import { Annotation } from "@langchain/langgraph";
import { type DocumentInterface } from "@langchain/core/documents";
import { BaseMessage } from "@langchain/core/messages";

export const GraphState = Annotation.Root({
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
});
