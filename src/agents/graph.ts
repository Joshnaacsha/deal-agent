import { START, END, StateGraph } from "@langchain/langgraph";
import { graphStateDef } from "./graphState.js";
import { evaluateStrategy } from "../agents/strategyAgent.js";
import { generateSummary } from "../agents/summaryAgent.js";
import { streamAnswerWithContext } from "../agents/ragAgent.js";
import { scrapeWeb } from "../agents/webScraperAgent.js";
import { evaluateRedFlags } from "../agents/redflagAgent.js";
import { evaluateCustomerReadiness } from "../agents/evaluateCustomerReadiness.js"; 


// ✅ Initial RAG node
const streamInitialAnswer = async (state: any, options: any = {}) => {
  const onToken = options?.onToken ?? (() => {});
  const updatedState = await streamAnswerWithContext(state, onToken);
  return updatedState;
};

// ✅ Web fallback streaming node
const streamWithWeb = async (state: any, options: any = {}) => {
  const onToken = options?.onToken ?? (() => {});
  const updatedState = await streamAnswerWithContext(state, onToken);
  return updatedState;
};

// ✅ Decision node
const decideNextStep = (state: any) => {
  if (state.answerFound || state.isAnswerInDocument) return { next: END };
  if (!state.hasScraped) return { next: "scrapeWeb" };
  return { next: END };
};
const graph = new StateGraph(graphStateDef)
  .addNode("evaluateRedFlags", evaluateRedFlags)
  .addNode("evaluateStrategy", evaluateStrategy)
  .addNode("evaluateCustomerReadiness", evaluateCustomerReadiness) // 👈 NEW
  .addNode("generateSummary", generateSummary)
  .addNode("streamAnswerWithContext", streamInitialAnswer)
  .addNode("decideNextStep", decideNextStep)
  .addNode("scrapeWeb", scrapeWeb)

  // START → Red Flag Agent
  .addEdge(START, "evaluateRedFlags")
  .addConditionalEdges("evaluateRedFlags", (state: any) => {
    if ((state.action ?? "").toLowerCase() === "do not proceed") return "generateSummary";
    return "evaluateStrategy";
  })

  // Strategy → Customer Readiness → Summary
  .addEdge("evaluateStrategy", "evaluateCustomerReadiness")
  .addEdge("evaluateCustomerReadiness", "generateSummary")

  // Summary → RAG streaming
  .addEdge("generateSummary", "streamAnswerWithContext")

  // RAG logic
  .addEdge("streamAnswerWithContext", "decideNextStep")
  .addConditionalEdges("decideNextStep", (state: any) => {
    if (!state.isAnswerInDocument && !state.hasScraped) return "scrapeWeb";
    return END;
  })
  .addEdge("scrapeWeb", "streamAnswerWithContext")
  .addEdge("streamAnswerWithContext", END);

const compiledGraph = graph.compile();
export { compiledGraph };
