import { askOllama } from "./agents/chatAgent";
import { embedAndStore } from "./embedding/embedToSupabase";
import { extractTextFromPDF, splitIntoChunks } from "./utils/pdfUtils";
import path from "path";
import { searchSimilar } from "./query/searchSimilar";
import { answerWithContext } from "./agents/ragAgent";


async function main() {
  //const response = await askOllama("Explain the MEDDPICC framework in simple terms.");
  //console.log("🤖 Response:", response);
/*
  const pdfPath = path.join(__dirname, "..", "example.pdf"); // Place your PDF in root folder
  const fullText = await extractTextFromPDF(pdfPath);

  console.log("✅ Extracted Text Length:", fullText.length);

  const chunks = splitIntoChunks(fullText);
  console.log("✅ Total Chunks Created:", chunks.length);

  console.log("First chunk preview:\n", chunks[0].slice(0, 300)); 
  
  await embedAndStore(chunks); 

  const results = await searchSimilar("According to Clause 2.14 of the bidding document, under what conditions can a Bidder modify, substitute, or withdraw its Bid, and what procedural requirements must be followed?");
  console.log("🔎 Top Matches:\n");
  
  for (const result of results) {
    console.log("📄 Content:", result.content.slice(0, 300));
    console.log("📊 Similarity:", result.similarity.toFixed(4));
    console.log("🧾 Metadata:", result.metadata);
    console.log("--------------------------------------------------\n");

}
console.log("🔍 Total matches found:", results.length);
*/

const question = "According to Clause 2.14, when can a Bidder withdraw its Bid?";
const answer = await answerWithContext(question);
console.log("🧠 Answer:\n", answer);

}
if (require.main === module) {
  main().catch(console.error);
}



