import { START, END, StateGraph } from "@langchain/langgraph";
import { graphStateDef } from "./graphState.js";
import { evaluateStrategy } from "../agents/strategyAgent.js";
import { generateSummary } from "../agents/summaryAgent.js";
import { streamAnswerWithContext } from "../agents/ragAgent.js";
import { scrapeWeb } from "../agents/webScraperAgent.js";
import { evaluateRedFlags } from "../agents/redflagAgent.js";

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
  .addNode("evaluateStrategy", evaluateStrategy)
  .addNode("generateSummary", generateSummary)
  .addNode("streamAnswerWithContext", streamInitialAnswer)
  .addNode("decideNextStep", decideNextStep)
  .addNode("scrapeWeb", scrapeWeb)
  .addNode("evaluateRedFlags", evaluateRedFlags)

  .addEdge(START, "evaluateRedFlags")

  // 🔄 Always go to strategy or summary after red flag check
  .addConditionalEdges("evaluateRedFlags", (state: any) => {
    const action = (state.action ?? "").toLowerCase();
    if (action === "proceed") return "evaluateStrategy";
    return "generateSummary";
  })

  .addEdge("evaluateStrategy", "generateSummary")
  .addEdge("generateSummary", "streamAnswerWithContext")

  .addEdge("streamAnswerWithContext", "decideNextStep")
  .addConditionalEdges("decideNextStep", (state: any) => {
    if (state.isAnswerInDocument) return END;
    if (!state.hasScraped && !state.isAnswerInDocument) return "scrapeWeb";
    return END;
  })
  .addEdge("scrapeWeb", "streamAnswerWithContext")
  .addEdge("streamAnswerWithContext", END);

const compiledGraph = graph.compile();
export { compiledGraph };
