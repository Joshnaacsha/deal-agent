import { START, END, StateGraph } from "@langchain/langgraph";
import { graphStateDef } from "./graphState.js";
import { evaluateStrategy } from "../agents/strategyAgent.js";
import { generateSummary } from "../agents/summaryAgent.js";
import { streamAnswerWithContext } from "../agents/ragAgent.js";
import { scrapeWeb } from "../agents/webScraperAgent.js";

// Reusable RAG call
const streamNode = async (state: any, options: any = {}) => {
  const onToken = options?.onToken ?? (() => {});
  return streamAnswerWithContext(state, onToken);
};

// ✅ Router node for branching
const decideNextStep = (state: any) => {
  // If answer is found, end. Otherwise, go to scrapeWeb node.
  return { next: state.answerFound ? END : "scrapeWeb" };
};

const graph = new StateGraph(graphStateDef)
  .addNode("evaluateStrategy", evaluateStrategy)
  .addNode("generateSummary", generateSummary)
  .addNode("streamAnswerWithContext", streamNode)
  .addNode("decideNextStep", decideNextStep)
  .addNode("scrapeWeb", scrapeWeb)
  .addNode("streamWithWeb", streamNode)

  // Connect the graph flow with .addEdge
  .addEdge(START, "evaluateStrategy")
  .addEdge("evaluateStrategy", "generateSummary")
  .addEdge("generateSummary", "streamAnswerWithContext")
  .addEdge("streamAnswerWithContext", "decideNextStep")
  .addEdge("decideNextStep", "scrapeWeb") // Ensuring connection from decision to scrapeWeb
  .addEdge("scrapeWeb", "streamWithWeb") // Connect scrapeWeb to streamWithWeb
  .addEdge("streamWithWeb", END);

const compiledGraph = graph.compile();
export { compiledGraph };
