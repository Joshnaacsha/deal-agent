import { supabase } from "../supabase/client";
import { getEmbedding } from "./localEmbed";

export async function embedAndStore(chunks: string[]) {
  const { error: deleteError } = await supabase.from("documents").delete().gt("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.error("❌ Failed to clear old data:", deleteError.message);
    return;
  }

  for (let i = 0; i < chunks.length; i++) {
    const content = chunks[i];
    const embedding = await getEmbedding(content);

    const { error } = await supabase.from("documents").insert({
      content,
      embedding,
      metadata: { chunk: i },
    });

    if (error) console.error("❌ Error inserting:", error.message);
    else console.log(`✅ Inserted chunk ${i}`);
  }

  console.log(`🚀 Done embedding and storing ${chunks.length} chunks`);
}
