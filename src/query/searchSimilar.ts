import { supabase } from "../supabase/client";
import { getEmbedding } from "../embedding/localEmbed";

/**
 * Query Supabase for the top similar documents to a user query
 */
export async function searchSimilar(query: string, topK = 3) {
  const embedding = await getEmbedding(query); // convert query to vector

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding, // must match vector(768)
    match_threshold: 0.7,       // optional: min cosine similarity
    match_count: topK           // how many results to return
  });

  if (error) {
    console.error("❌ Search error:", error.message, error.details || error);
    return [];
  }

  return data;
}
