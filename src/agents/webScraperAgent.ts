import axios from "axios";
import * as cheerio from "cheerio";
import { GraphState } from "./graphState";
import { RunnableConfig } from "@langchain/core/runnables";
import { DocumentInterface } from "@langchain/core/documents";


export async function scrapeWeb(
  state: typeof GraphState.State,
  config?: RunnableConfig
): Promise<Partial<typeof GraphState.State>> {
  console.log("---RETRIEVE---");{
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(state.question)}`;

  try {
    const { data } = await axios.get(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);
    const snippets: DocumentInterface[] = [];

$(".result__snippet").each((_, el) => {
  const text = $(el).text();
  if (text) {
    snippets.push({
      pageContent: text,
      metadata: {
        source: "duckduckgo",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

return { webScrapedDocuments: snippets };

  } catch (err) {
    console.error("❌ Web scraping failed:", err);
    return { webScrapedDocuments: [] };
  }
  }
}
