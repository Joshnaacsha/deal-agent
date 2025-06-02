import fs from "fs";
const pdf = require("pdf-parse");

/**
 * Read a PDF and return its full text
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdf(buffer);
  return data.text;
}

/**
 * Split text into 1000-character chunks with 200 overlap
 */
export function splitIntoChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }

  return chunks;
}
