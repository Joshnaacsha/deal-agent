import axios from "axios";
import * as cheerio from "cheerio";
import { graphStateDef } from "./graphState";
import { RunnableConfig } from "@langchain/core/runnables";
import { DocumentInterface } from "@langchain/core/documents";
import { StateType } from "@langchain/langgraph";

export async function scrapeWeb(
  state: StateType<typeof graphStateDef>,
  config?: RunnableConfig
): Promise<Partial<StateType<typeof graphStateDef>>> {
  console.log("🌐 ---SCRAPE WEB---");

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

    console.log(`✅ Retrieved ${snippets.length} snippets from web.`);

    return {
      webScrapedDocuments: snippets,
      hasScraped: true,
    };
  } catch (err) {
    console.error("❌ Web scraping failed:", err);
    return {
      webScrapedDocuments: [],
      hasScraped: true,
    };
  }
}
