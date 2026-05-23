// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// ─── ВАЖНО: эта функция не требует JWT (принимает redirect от Google/Meta) ──
// Добавьте в supabase/config.toml:
// [functions.oauth-callback]
// verify_jwt = false

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });

  const url        = new URL(req.url);
  const code       = url.searchParams.get("code");
  const state      = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const errorDesc  = url.searchParams.get("error_description") || "";

  const META_APP_ID     = Deno.env.get("META_APP_ID")     || "";
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
  const CALLBACK_URL    = (Deno.env.get("CALLBACK_URL") || Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");

  let stateData: any = {};
  try { if (state) stateData = JSON.parse(atob(state)); } catch {}
  const { userId, platform = "instagram", redirectUrl = "http://localhost:5173" } = stateData;

  const go = (path: string) =>
    new Response(null, { status: 302, headers: { Location: redirectUrl + path } });

  if (oauthError) return go(`?error=${encodeURIComponent(oauthError)}&error_desc=${encodeURIComponent(errorDesc)}`);
  if (!code || !userId)  return go("?error=Missing+code+or+user");

  const callbackUri = `${CALLBACK_URL}/functions/v1/oauth-callback`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    // ── META (Instagram + Facebook) ──────────────────────────
    if (platform === "instagram" || platform === "facebook") {
      if (!META_APP_ID || !META_APP_SECRET)
        return go("?error=Meta+credentials+not+configured+in+Supabase+Secrets");

      const shortRes = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: META_APP_ID, client_secret: META_APP_SECRET, grant_type: "authorization_code", redirect_uri: callbackUri, code }),
      });
      const shortData = await shortRes.json() as any;
      if (!shortData.access_token)
        return go(`?error=Failed+to+get+access+token&error_desc=${encodeURIComponent(shortData.error?.message || JSON.stringify(shortData))}`);

      const llRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({ grant_type: "fb_exchange_token", client_id: META_APP_ID, client_secret: META_APP_SECRET, fb_exchange_token: shortData.access_token }));
      const llData = await llRes.json() as any;
      const accessToken    = llData.access_token || shortData.access_token;
      const tokenExpiresAt = llData.expires_in
        ? new Date(Date.now() + llData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 60 * 86400000).toISOString();

      if (platform === "facebook") {
        const fbRes  = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
        const fbData = await fbRes.json() as any;
        if (!fbData.id) return go("?error=Failed+to+get+Facebook+user");
        await supabase.from("social_accounts").insert({ user_id: userId, platform: "facebook", account_id: fbData.id, account_name: fbData.name || "Facebook", account_handle: fbData.id, access_token: accessToken, token_expires_at: tokenExpiresAt, is_active: true, followers_count: 0 });
        return go("?success=true&platform=facebook");
      }

      const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
      const pagesData = await pagesRes.json() as any;
      const page      = pagesData.data?.[0];
      if (!page) return go("?error=No+Facebook+Page+found.+Link+an+Instagram+Business+account+to+a+Facebook+Page+first");

      const igRes  = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
      const igData = await igRes.json() as any;
      const igId   = igData.instagram_business_account?.id;
      if (!igId) return go("?error=No+Instagram+Business+Account+linked+to+your+Facebook+Page");

      const igProfileRes = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=id,username,followers_count,profile_picture_url&access_token=${accessToken}`);
      const igProfile    = await igProfileRes.json() as any;
      if (!igProfile.id) return go("?error=Failed+to+get+Instagram+profile");

      const { error: dbErr } = await supabase.from("social_accounts").insert({ user_id: userId, platform: "instagram", account_id: igProfile.id, account_name: igProfile.username || "Instagram", account_handle: `@${igProfile.username || ""}`, access_token: accessToken, token_expires_at: tokenExpiresAt, is_active: true, followers_count: igProfile.followers_count || 0 });
      if (dbErr) return go(`?error=DB+error&error_desc=${encodeURIComponent(dbErr.message)}`);
      return go("?success=true&platform=instagram");
    }

    // ── TWITTER ──────────────────────────────────────────────
    if (platform === "twitter") {
      const TW_ID  = Deno.env.get("TWITTER_CLIENT_ID")     || "";
      const TW_SEC = Deno.env.get("TWITTER_CLIENT_SECRET") || "";
      if (!TW_ID) return go("?error=Twitter+credentials+not+configured");
      const tRes = await fetch("https://api.twitter.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Basic " + btoa(`${TW_ID}:${TW_SEC}`) }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUri, code_verifier: "challenge" }) });
      const tData = await tRes.json() as any;
      if (!tData.access_token) return go(`?error=Twitter+token+error&error_desc=${encodeURIComponent(tData.error || "")}`);
      const uRes  = await fetch("https://api.twitter.com/2/users/me?user.fields=name,username,public_metrics", { headers: { "Authorization": `Bearer ${tData.access_token}` } });
      const uData = (await uRes.json() as any).data || {};
      await supabase.from("social_accounts").insert({ user_id: userId, platform: "twitter", account_id: uData.id || "", account_name: uData.name || "Twitter", account_handle: uData.username ? `@${uData.username}` : "", access_token: tData.access_token, refresh_token: tData.refresh_token || "", is_active: true, followers_count: uData.public_metrics?.followers_count || 0 });
      return go("?success=true&platform=twitter");
    }

    // ── LINKEDIN ─────────────────────────────────────────────
    if (platform === "linkedin") {
      const LI_ID  = Deno.env.get("LINKEDIN_CLIENT_ID")     || "";
      const LI_SEC = Deno.env.get("LINKEDIN_CLIENT_SECRET") || "";
      if (!LI_ID) return go("?error=LinkedIn+credentials+not+configured");
      const tRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUri, client_id: LI_ID, client_secret: LI_SEC }) });
      const tData = await tRes.json() as any;
      if (!tData.access_token) return go("?error=LinkedIn+token+error");
      const pRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { "Authorization": `Bearer ${tData.access_token}` } });
      const p    = await pRes.json() as any;
      await supabase.from("social_accounts").insert({ user_id: userId, platform: "linkedin", account_id: p.sub || "", account_name: p.name || "LinkedIn", account_handle: p.email || "", access_token: tData.access_token, is_active: true, followers_count: 0 });
      return go("?success=true&platform=linkedin");
    }

    // ── YOUTUBE ──────────────────────────────────────────────
    if (platform === "youtube") {
      const YT_ID  = Deno.env.get("YOUTUBE_CLIENT_ID")     || "";
      const YT_SEC = Deno.env.get("YOUTUBE_CLIENT_SECRET") || "";
      if (!YT_ID) return go("?error=YouTube+credentials+not+configured+in+Supabase+Secrets");
      const tRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUri, client_id: YT_ID, client_secret: YT_SEC }) });
      const tData = await tRes.json() as any;
      if (!tData.access_token) return go(`?error=YouTube+token+error&error_desc=${encodeURIComponent(JSON.stringify(tData))}`);
      const cRes  = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", { headers: { "Authorization": `Bearer ${tData.access_token}` } });
      const ch    = ((await cRes.json() as any).items || [])[0];
      await supabase.from("social_accounts").insert({ user_id: userId, platform: "youtube", account_id: ch?.id || "", account_name: ch?.snippet?.title || "YouTube", account_handle: ch?.snippet?.customUrl || "", access_token: tData.access_token, refresh_token: tData.refresh_token || "", is_active: true, followers_count: parseInt(ch?.statistics?.subscriberCount || "0") });
      return go("?success=true&platform=youtube");
    }

    // ── TIKTOK ───────────────────────────────────────────────
    if (platform === "tiktok") {
      const TT_ID  = Deno.env.get("TIKTOK_CLIENT_KEY")    || "";
      const TT_SEC = Deno.env.get("TIKTOK_CLIENT_SECRET") || "";
      if (!TT_ID) return go("?error=TikTok+credentials+not+configured");
      const tRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: TT_ID, client_secret: TT_SEC, code, grant_type: "authorization_code", redirect_uri: callbackUri }) });
      const tData = await tRes.json() as any;
      if (!tData.access_token) return go("?error=TikTok+token+error");
      await supabase.from("social_accounts").insert({ user_id: userId, platform: "tiktok", account_id: tData.open_id || "", account_name: "TikTok Account", account_handle: tData.open_id || "", access_token: tData.access_token, refresh_token: tData.refresh_token || "", is_active: true, followers_count: 0 });
      return go("?success=true&platform=tiktok");
    }

    return go(`?error=Unknown+platform+${platform}`);

  } catch (err: any) {
    console.error("oauth-callback error:", err);
    return go(`?error=Server+error&error_desc=${encodeURIComponent(err.message)}`);
  }
});
