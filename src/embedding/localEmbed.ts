import axios from "axios";

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await axios.post("http://localhost:11434/api/embeddings", {
    model: "nomic-embed-text",
    prompt: text
  });


    return res.data.embedding;

}
