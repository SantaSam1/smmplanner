import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { postId, accountId, platform, content, mediaUrls = [] } = payload;

  // Load account
  const { data: acc } = await supabase
    .from("social_accounts").select("*").eq("id", accountId).maybeSingle();
  if (!acc) return json({ error: "Account not found" }, 404);

  const creds = acc.credentials || {};
  let ok = false;
  let message = "";

  try {
    // ── TELEGRAM ──────────────────────────────────────────────
    if (platform === "telegram") {
      const token = creds.bot_token || acc.access_token || "";
      const chatId = creds.channel_id || acc.account_handle || "";

      if (!token || !chatId) throw new Error("Bot token or channel ID missing");

      // Send photo if media exists, otherwise text
      if (mediaUrls.length > 0) {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, photo: mediaUrls[0], caption: content }),
        });
        const data = await res.json() as any;
        if (!data.ok) throw new Error(data.description || "Telegram error");
        ok = true;
        message = `Telegram: message sent (id: ${data.result?.message_id})`;
      } else {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: content, parse_mode: "HTML" }),
        });
        const data = await res.json() as any;
        if (!data.ok) throw new Error(data.description || "Telegram error");
        ok = true;
        message = `Telegram: message sent (id: ${data.result?.message_id})`;
      }
    }

    // ── VK ────────────────────────────────────────────────────
    else if (platform === "vk") {
      const token   = creds.token || acc.access_token || "";
      const groupId = creds.group_id || acc.account_handle || "";

      if (!token || !groupId) throw new Error("VK token or group_id missing");

      let attachments = "";

      // Upload photo first if needed
      if (mediaUrls.length > 0) {
        try {
          // 1. Get upload server
          const serverRes = await fetch(
            `https://api.vk.com/method/photos.getWallUploadServer?group_id=${groupId}&access_token=${token}&v=5.199`
          ).then(r => r.json()) as any;

          if (serverRes.response?.upload_url) {
            // 2. Upload photo via URL
            const uploadRes = await fetch(serverRes.response.upload_url, {
              method: "POST",
              body: JSON.stringify({ url: mediaUrls[0] }),
              headers: { "Content-Type": "application/json" },
            }).then(r => r.json()) as any;

            // 3. Save photo
            if (uploadRes.photo && uploadRes.server && uploadRes.hash) {
              const saveRes = await fetch(
                `https://api.vk.com/method/photos.saveWallPhoto?group_id=${groupId}&photo=${uploadRes.photo}&server=${uploadRes.server}&hash=${uploadRes.hash}&access_token=${token}&v=5.199`
              ).then(r => r.json()) as any;
              if (saveRes.response?.[0]) {
                const p = saveRes.response[0];
                attachments = `photo${p.owner_id}_${p.id}`;
              }
            }
          }
        } catch (photoErr) {
          console.log("VK photo upload failed, posting text only:", photoErr);
        }
      }

      // Post to wall
      const wallParams = new URLSearchParams({
        owner_id: `-${groupId}`,
        from_group: "1",
        message: content,
        access_token: token,
        v: "5.199",
      });
      if (attachments) wallParams.set("attachments", attachments);

      const wallRes = await fetch(`https://api.vk.com/method/wall.post?${wallParams}`).then(r => r.json()) as any;
      if (wallRes.error) throw new Error(`VK ${wallRes.error.error_code}: ${wallRes.error.error_msg}`);

      ok = true;
      message = `VK: post published (id: ${wallRes.response?.post_id})`;
    }

    // ── ODNOKLASSNIKI ─────────────────────────────────────────
    else if (platform === "ok") {
      const accessToken = creds.access_token || acc.access_token || "";
      const groupId     = creds.group_id || acc.account_handle || "";
      const publicKey   = Deno.env.get("OK_PUBLIC_KEY") || "";
      const appSecret   = Deno.env.get("OK_APP_SECRET") || "";

      if (!accessToken) throw new Error("OK.ru access_token missing. Please re-authorize OK.ru.");
      if (!groupId)     throw new Error("OK.ru group_id missing");

      const { createHash } = await import("node:crypto");

      const sessionSecret = createHash("md5")
        .update(createHash("md5").update(accessToken).digest("hex") + appSecret)
        .digest("hex");

      const media = JSON.stringify({
        media: [{ type: "text", text: content }]
      });

      const params: Record<string, string> = {
        application_key: publicKey,
        gid: groupId,
        media,
        method: "mediatopic.post",
        type: "GROUP_THEME",
      };
      const sigStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("") + sessionSecret;
      params.sig = createHash("md5").update(sigStr).digest("hex");
      params.access_token = accessToken;
      params.format = "json";

      const okRes = await fetch("https://api.ok.ru/fb.do", {
        method: "POST",
        body: new URLSearchParams(params),
      }).then(r => r.json()) as any;

      if (okRes.error_code) throw new Error(`OK ${okRes.error_code}: ${okRes.error_msg}`);

      ok = true;
      message = `OK.ru: post published (id: ${okRes})`;
    }

    // ── INSTAGRAM ────────────────────────────────────────────
    else if (platform === "instagram") {
      const token = acc.access_token || "";
      const igId  = acc.account_id   || "";
      if (!token || !igId) throw new Error("Instagram token or account_id missing");

      let creationId = "";
      if (mediaUrls.length > 0) {
        const contRes = await fetch(
          `https://graph.facebook.com/v19.0/${igId}/media`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ media_type: "IMAGE", image_url: mediaUrls[0], caption: content, access_token: token }),
          }
        ).then(r => r.json()) as any;
        if (contRes.error) throw new Error(contRes.error.message);
        creationId = contRes.id;
      } else {
        throw new Error("Instagram requires at least one image");
      }

      const pubRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: creationId, access_token: token }),
        }
      ).then(r => r.json()) as any;
      if (pubRes.error) throw new Error(pubRes.error.message);

      ok = true;
      message = `Instagram: published (id: ${pubRes.id})`;
    }

    // ── FACEBOOK ─────────────────────────────────────────────
    else if (platform === "facebook") {
      const token = acc.access_token || "";
      const fbId  = acc.account_id   || "";
      if (!token) throw new Error("Facebook token missing");

      const body: any = { message: content, access_token: token };
      if (mediaUrls.length > 0) body.link = mediaUrls[0];

      const res = await fetch(`https://graph.facebook.com/v19.0/${fbId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()) as any;
      if (res.error) throw new Error(res.error.message);

      ok = true;
      message = `Facebook: published (id: ${res.id})`;
    }

    // ── TWITTER ──────────────────────────────────────────────
    else if (platform === "twitter") {
      const token = acc.access_token || "";
      if (!token) throw new Error("Twitter token missing");

      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      }).then(r => r.json()) as any;
      if (res.errors) throw new Error(res.errors[0]?.message || "Twitter error");

      ok = true;
      message = `Twitter: tweeted (id: ${res.data?.id})`;
    }

    // ── YOUTUBE ──────────────────────────────────────────────
    else if (platform === "youtube") {
      ok = false;
      message = "YouTube video upload requires a file upload flow — not supported for URL-only posts";
    }

    else {
      throw new Error(`Platform "${platform}" not supported yet`);
    }

  } catch (err: any) {
    ok = false;
    message = err.message;
    console.error(`[${platform}] error:`, err.message);
  }

  // Update post status in DB
  if (postId) {
    await supabase.from("posts").update({
      status: ok ? "published" : "failed",
      published_at: ok ? new Date().toISOString() : null,
    }).eq("id", postId);
  }

  return json({ ok, message });
});
