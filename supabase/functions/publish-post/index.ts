// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });
  const j = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization");
  if (!auth) return j({ ok: false, error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

  let payload: any;
  try { payload = await req.json(); } catch { return j({ ok: false, error: "Invalid JSON" }, 400); }

  const { postId, accountId, platform, content, mediaUrls = [] } = payload;

  const { data: acc } = await supabase.from("social_accounts").select("*").eq("id", accountId).maybeSingle();
  if (!acc) return j({ ok: false, error: "Account not found" }, 404);

  const creds = acc.credentials || {};
  let ok = false, message = "";

  // Helper: convert Google Drive URL to direct image URL
  function toDirectUrl(url: string): string {
    if (!url) return url;
    const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    // Handle drive.google.com/uc?id= format
    const m2 = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
    if (m2) return `https://drive.google.com/uc?export=download&id=${m2[1]}`;
    return url;
  }

  const firstMedia = mediaUrls.length > 0 ? toDirectUrl(mediaUrls[0]) : null;

  try {
    // ── TELEGRAM ──────────────────────────────────────────────
    if (platform === "telegram") {
      const token  = creds.bot_token  || acc.access_token || "";
      const chatId = creds.channel_id || acc.account_handle || "";
      if (!token)  throw new Error("Bot token отсутствует");
      if (!chatId) throw new Error("Channel ID отсутствует");

      if (firstMedia) {
        // Try sendPhoto first, fallback to sendMessage with link
        const photoRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, photo: firstMedia, caption: content }),
        });
        const photoData = await photoRes.json() as any;

        if (!photoData.ok) {
          // Fallback: send as text with link
          console.log("Photo failed, sending as text:", photoData.description);
          const textRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: `${content}\n\n${firstMedia}`, parse_mode: "HTML" }),
          });
          const textData = await textRes.json() as any;
          if (!textData.ok) throw new Error(textData.description || "Telegram error");
          ok = true; message = `Telegram: отправлено (id: ${textData.result?.message_id})`;
        } else {
          ok = true; message = `Telegram: фото отправлено (id: ${photoData.result?.message_id})`;
        }
      } else {
        const res  = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: content, parse_mode: "HTML" }),
        });
        const data = await res.json() as any;
        if (!data.ok) throw new Error(data.description || "Telegram error");
        ok = true; message = `Telegram: отправлено (id: ${data.result?.message_id})`;
      }
    }

    // ── VKONTAKTE ─────────────────────────────────────────────
    else if (platform === "vk") {
      const token   = creds.token    || acc.access_token || "";
      const groupId = creds.group_id || acc.account_handle || "";
      if (!token)   throw new Error("VK token отсутствует");
      if (!groupId) throw new Error("VK group_id отсутствует");

      // Ensure groupId is integer (no minus sign for owner_id we add it)
      const gId = String(groupId).replace(/^-/, "");
      if (isNaN(Number(gId))) throw new Error(`VK group_id должен быть числом, получено: ${groupId}`);

      let attachments = "";

      // Upload photo if needed
      if (firstMedia) {
        try {
          const serverRes = await fetch(`https://api.vk.com/method/photos.getWallUploadServer?group_id=${gId}&access_token=${token}&v=5.199`).then(r => r.json()) as any;
          if (serverRes.response?.upload_url) {
            // Download image first
            const imgRes = await fetch(firstMedia);
            const imgBuf = await imgRes.arrayBuffer();
            const imgBytes = new Uint8Array(imgBuf);
            const contentTypeHeader = imgRes.headers.get("content-type") || "image/jpeg";
            const ext = contentTypeHeader.includes("png") ? "png" : contentTypeHeader.includes("gif") ? "gif" : "jpg";

            const formData = new FormData();
            formData.append("photo", new Blob([imgBytes], { type: contentTypeHeader }), `photo.${ext}`);

            const uploadRes = await fetch(serverRes.response.upload_url, { method: "POST", body: formData }).then(r => r.json()) as any;

            if (uploadRes.photo && uploadRes.server && uploadRes.hash) {
              const saveRes = await fetch(`https://api.vk.com/method/photos.saveWallPhoto?group_id=${gId}&photo=${encodeURIComponent(uploadRes.photo)}&server=${uploadRes.server}&hash=${uploadRes.hash}&access_token=${token}&v=5.199`).then(r => r.json()) as any;
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

      const wallParams = new URLSearchParams({
        owner_id: `-${gId}`,
        from_group: "1",
        message: content,
        access_token: token,
        v: "5.199",
      });
      if (attachments) wallParams.set("attachments", attachments);

      const wallRes = await fetch(`https://api.vk.com/method/wall.post?${wallParams}`).then(r => r.json()) as any;
      if (wallRes.error) throw new Error(`VK ${wallRes.error.error_code}: ${wallRes.error.error_msg}`);
      ok = true; message = `VK: пост опубликован (id: ${wallRes.response?.post_id})`;
    }

    // ── ODNOKLASSNIKI ─────────────────────────────────────────
    else if (platform === "ok") {
      const accessToken = creds.access_token || acc.access_token || "";
      const groupId     = creds.group_id     || acc.account_handle || "";
      const publicKey   = creds.public_key   || Deno.env.get("OK_PUBLIC_KEY") || "";
      const appSecret   = creds.app_secret   || Deno.env.get("OK_APP_SECRET") || "";

      if (!accessToken) throw new Error("OK.ru access_token отсутствует");
      if (!groupId)     throw new Error("OK.ru group_id отсутствует — перепривяжите аккаунт и укажите ID группы");

      const { createHash } = await import("node:crypto");
      const sessionSecret = createHash("md5").update(
        createHash("md5").update(accessToken).digest("hex") + appSecret
      ).digest("hex");

      // Build media with optional photo attachment
      let mediaContent: any[];
      if (firstMedia) {
        mediaContent = [
          { type: "photo", url: firstMedia },
          { type: "text", text: content },
        ];
      } else {
        mediaContent = [{ type: "text", text: content }];
      }

      const mediaJson = JSON.stringify({ media: mediaContent });

      const params: Record<string, string> = {
        application_key: publicKey,
        gid: groupId,
        media: mediaJson,
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

      if (okRes.error_code) throw new Error(`OK ${okRes.error_code}: ${okRes.error_msg || JSON.stringify(okRes)}`);
      ok = true; message = `OK.ru: пост опубликован (id: ${okRes})`;
    }

    // ── INSTAGRAM ─────────────────────────────────────────────
    else if (platform === "instagram") {
      const token = acc.access_token || "";
      const igId  = acc.account_id   || "";
      if (!token || !igId) throw new Error("Instagram token или account_id отсутствует");
      if (!firstMedia) throw new Error("Instagram требует изображение");

      const contRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: "IMAGE", image_url: firstMedia, caption: content, access_token: token }),
      }).then(r => r.json()) as any;
      if (contRes.error) throw new Error(contRes.error.message);

      const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: contRes.id, access_token: token }),
      }).then(r => r.json()) as any;
      if (pubRes.error) throw new Error(pubRes.error.message);

      ok = true; message = `Instagram: опубликовано (id: ${pubRes.id})`;
    }

    // ── FACEBOOK ──────────────────────────────────────────────
    else if (platform === "facebook") {
      const token = acc.access_token || "";
      const fbId  = acc.account_id   || "";
      if (!token) throw new Error("Facebook token отсутствует");

      const body: any = { message: content, access_token: token };
      if (firstMedia) body.link = firstMedia;

      const res  = await fetch(`https://graph.facebook.com/v19.0/${fbId || "me"}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()) as any;
      if (res.error) throw new Error(res.error.message);
      ok = true; message = `Facebook: опубликовано (id: ${res.id})`;
    }

    // ── TWITTER ───────────────────────────────────────────────
    else if (platform === "twitter") {
      const token = acc.access_token || "";
      if (!token) throw new Error("Twitter token отсутствует");
      const res  = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      }).then(r => r.json()) as any;
      if (res.errors) throw new Error(res.errors[0]?.message || "Twitter error");
      ok = true; message = `Twitter: опубликовано (id: ${res.data?.id})`;
    }

    // ── YOUTUBE ───────────────────────────────────────────────
    else if (platform === "youtube") {
      ok = false;
      message = "YouTube video upload requires a file upload flow — not supported for URL-only posts";
    }

    else {
      throw new Error(`Платформа "${platform}" не поддерживается`);
    }

  } catch (err: any) {
    ok = false; message = err.message;
    console.error(`[${platform}] error:`, err.message);
  }

  if (postId) {
    await supabase.from("posts").update({
      status: ok ? "published" : "failed",
      published_at: ok ? new Date().toISOString() : null,
    }).eq("id", postId);
  }

  return j({ ok, message });
});
