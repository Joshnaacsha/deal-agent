import { searchSimilar } from "../query/searchSimilar.js";
import { streamAnswerWithContext } from "./ragAgent.js";
import { scrapeWeb } from "./webScraperAgent.js";

export async function ragWorkflow(input: any) {
  console.log("🧠 Initial Input:", input);
  const state = input;
  const onToken = input?.onToken ?? (() => {});

  state.webScrapedDocuments = [];

  // Step 1: Search documents first
  const docResults = await searchSimilar(state.question, 4);
  state.docResults = docResults;

  // Step 2: First pass – stream with document context only
  await streamAnswerWithContext(state, onToken);

  // Step 3: If answer not found in document context, scrape web
  if (!state.answerFound) {
    console.log("🔍 Answer not found in docs – scraping web...");

    const { webScrapedDocuments } = await scrapeWeb(state);

    state.webScrapedDocuments = webScrapedDocuments;

    // Step 4: Second pass – stream again using web + doc context
    await streamAnswerWithContext(state, onToken);
  }

  return state;
}
