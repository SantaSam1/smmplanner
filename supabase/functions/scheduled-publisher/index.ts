// @ts-nocheck
// verify_jwt = false — вызывается cron-задачей без токена
// Запускать каждые 5 минут: curl -X POST URL -H "apikey: ANON_KEY"
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Client-Info",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });
  const j = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  // Найти все посты которые нужно опубликовать прямо сейчас
  const now = new Date().toISOString();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .limit(20);

  if (error) return j({ ok: false, error: error.message }, 500);
  if (!posts || posts.length === 0) return j({ ok: true, published: 0, message: "No posts to publish" });

  console.log(`Found ${posts.length} posts to publish`);
  let published = 0;
  let failed = 0;
  const results: any[] = [];

  for (const post of posts) {
    const accountIds: string[] = post.account_ids || [];
    if (accountIds.length === 0) {
      // Нет аккаунтов — просто помечаем как failed
      await supabase.from("posts").update({ status: "failed" }).eq("id", post.id);
      failed++;
      continue;
    }

    let postSuccess = false;

    for (const accountId of accountIds) {
      const { data: acc } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("id", accountId)
        .maybeSingle();

      if (!acc || !acc.is_active) continue;

      try {
        // Вызываем publish-post функцию
        const publishUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/publish-post`;
        const resp = await fetch(publishUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            postId: post.id,
            accountId,
            platform: acc.platform,
            content: post.content,
            mediaUrls: post.media_urls || [],
          }),
        });

        const result = await resp.json() as any;
        if (result.ok) {
          postSuccess = true;
          console.log(`✓ Published to ${acc.platform}: ${acc.account_name}`);
        } else {
          console.log(`✗ Failed ${acc.platform}: ${result.error}`);
        }
        results.push({ postId: post.id, accountId, platform: acc.platform, ...result });

      } catch (e: any) {
        console.error(`Error publishing post ${post.id}:`, e.message);
        results.push({ postId: post.id, accountId, ok: false, error: e.message });
      }
    }

    // Обновляем статус поста
    await supabase.from("posts").update({
      status: postSuccess ? "published" : "failed",
      published_at: postSuccess ? new Date().toISOString() : null,
    }).eq("id", post.id);

    if (postSuccess) published++; else failed++;
  }

  console.log(`Done: ${published} published, ${failed} failed`);
  return j({ ok: true, published, failed, total: posts.length, results });
});
