import { START, END, StateGraph } from "@langchain/langgraph";
import { graphStateDef } from "./graphState.js";
import { evaluateStrategy } from "../agents/strategyAgent.js";
import { generateSummary } from "../agents/summaryAgent.js";
import { streamAnswerWithContext } from "../agents/ragAgent.js";
import { scrapeWeb } from "../agents/webScraperAgent.js";
import { isAnswerInDocument } from "../utils/isAnswerInDocument.js";

// ✅ Initial RAG node
const streamInitialAnswer = async (state: any, options: any = {}) => {
  const onToken = options?.onToken ?? (() => {});
  const updatedState = await streamAnswerWithContext(state, onToken); // ✅ Capture updated state
  return updatedState;
};

// ✅ Web fallback streaming node
const streamWithWeb = async (state: any, options: any = {}) => {
  const onToken = options?.onToken ?? (() => {});
  const updatedState = await streamAnswerWithContext(state, onToken); // ✅ Capture updated state
  return updatedState;
};

// ✅ Decision node
const decideNextStep = (state: any) => {
  if (state.answerFound || state.isAnswerInDocument) return { next: END };
  if (!state.hasScraped) return { next: "scrapeWeb" };
  return { next: END }; // break if already scraped once
};


const graph = new StateGraph(graphStateDef)
  .addNode("evaluateStrategy", evaluateStrategy)
  .addNode("generateSummary", generateSummary)
  .addNode("streamAnswerWithContext", streamInitialAnswer)
  .addNode("decideNextStep", decideNextStep)
  .addNode("scrapeWeb", scrapeWeb)

  // Start → Strategy → Summary → Initial Answer
  .addEdge(START, "evaluateStrategy")
  .addEdge("evaluateStrategy", "generateSummary")
  .addEdge("generateSummary", "streamAnswerWithContext")

  // streamAnswer → decide → scrapeWeb or END
  .addEdge("streamAnswerWithContext", "decideNextStep")

  // Conditional branching
  .addConditionalEdges("decideNextStep", (state: any) => {
  if (state.isAnswerInDocument) return END;
  if (!state.hasScraped && !state.isAnswerInDocument) return "scrapeWeb";
  return END; // ✅ fallback if scraped but still no answer
})
.addEdge("scrapeWeb", "streamAnswerWithContext")

  // Final termination
  .addEdge("streamAnswerWithContext", END);

const compiledGraph = graph.compile();
export { compiledGraph };
