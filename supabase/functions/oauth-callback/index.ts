// @ts-nocheck
// verify_jwt = false
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });

  const url        = new URL(req.url);
  const code       = url.searchParams.get("code");
  const state      = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const errorDesc  = url.searchParams.get("error_description") || "";

  const META_APP_ID     = Deno.env.get("META_APP_ID")     || "";
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET") || "";
  const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")    || "";
  const CALLBACK_URL    = (Deno.env.get("CALLBACK_URL") || SUPABASE_URL).replace(/\/$/, "");

  let stateData: any = {};
  try { if (state) stateData = JSON.parse(atob(state)); } catch {}
  const { userId, platform = "instagram", redirectUrl = "http://localhost:5173" } = stateData;

  const go = (path: string) =>
    new Response(null, { status: 302, headers: { Location: redirectUrl + path } });

  if (oauthError) return go(`?error=${encodeURIComponent(oauthError)}&error_desc=${encodeURIComponent(errorDesc)}`);
  if (!code)   return go("?error=Missing+code");
  if (!userId) return go("?error=Missing+user+ID");

  const callbackUri = `${CALLBACK_URL}/functions/v1/oauth-callback`;
  const supabase    = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");

  try {
    // ── OK.RU ─────────────────────────────────────────────────
    if (platform === "ok") {
      const OK_APP_KEY    = Deno.env.get("OK_APP_KEY")    || "";
      const OK_APP_SECRET = Deno.env.get("OK_APP_SECRET") || "";
      const OK_PUBLIC_KEY = Deno.env.get("OK_PUBLIC_KEY") || "";

      if (!OK_APP_KEY || !OK_APP_SECRET)
        return go("?error=OK.ru+credentials+not+configured+(OK_APP_KEY,+OK_APP_SECRET)");

      const tokenRes = await fetch("https://api.ok.ru/oauth/token.do", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: OK_APP_KEY, client_secret: OK_APP_SECRET, redirect_uri: callbackUri, grant_type: "authorization_code" }),
      });
      const tokenData = await tokenRes.json() as any;

      if (!tokenData.access_token) {
        const err = tokenData.error_description || tokenData.error || JSON.stringify(tokenData);
        return go(`?error=OK.ru+token+error&error_desc=${encodeURIComponent(err)}`);
      }

      const accessToken  = tokenData.access_token;
      const refreshToken = tokenData.refresh_token || "";

      // Get user info
      const { createHash } = await import("node:crypto");
      const sessionSecret = createHash("md5").update(
        createHash("md5").update(accessToken).digest("hex") + OK_APP_SECRET
      ).digest("hex");

      const params: Record<string, string> = {
        application_key: OK_PUBLIC_KEY,
        method: "users.getCurrentUser",
        fields: "uid,name",
      };
      const sigStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("") + sessionSecret;
      params.sig = createHash("md5").update(sigStr).digest("hex");
      params.access_token = accessToken;
      params.format = "json";

      const userRes  = await fetch("https://api.ok.ru/fb.do", { method: "POST", body: new URLSearchParams(params) });
      const userData = await userRes.json() as any;
      const userName = userData.name || "OK.ru";
      const userId2  = userData.uid  || "";

      // Сохраняем аккаунт БЕЗ group_id — пользователь укажет его сам
      // Токен сохраняем в credentials, group_id добавится после
      const { error: dbErr } = await supabase.from("social_accounts").insert({
        user_id:         userId,
        platform:        "ok",
        account_id:      userId2,
        account_name:    userName,
        account_handle:  userId2,
        access_token:    accessToken,
        refresh_token:   refreshToken,
        credentials: {
          access_token: accessToken,
          public_key:   OK_PUBLIC_KEY,
          app_secret:   OK_APP_SECRET,
          group_id:     "", // пользователь укажет позже
        },
        is_active:       false, // неактивен пока нет group_id
        followers_count: 0,
      });

      if (dbErr) return go(`?error=DB+error&error_desc=${encodeURIComponent(dbErr.message)}`);
      // Перенаправляем с флагом что нужно указать группу
      return go("?success=true&platform=ok&need_group=true");
    }

    // ── META (Instagram + Facebook) ──────────────────────────
    if (platform === "instagram" || platform === "facebook") {
      if (!META_APP_ID || !META_APP_SECRET)
        return go("?error=Meta+credentials+not+configured");

      const shortRes = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: META_APP_ID, client_secret: META_APP_SECRET, grant_type: "authorization_code", redirect_uri: callbackUri, code }),
      });
      const shortData = await shortRes.json() as any;
      if (!shortData.access_token)
        return go(`?error=Meta+token+failed&error_desc=${encodeURIComponent(shortData.error?.message || JSON.stringify(shortData))}`);

      const llRes  = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: META_APP_ID, client_secret: META_APP_SECRET, fb_exchange_token: shortData.access_token })}`);
      const llData = await llRes.json() as any;
      const accessToken    = llData.access_token    || shortData.access_token;
      const tokenExpiresAt = llData.expires_in
        ? new Date(Date.now() + llData.expires_in * 1000).toISOString()
        : new Date(Date.now() + 60 * 86400000).toISOString();

      if (platform === "facebook") {
        // Get Facebook Pages (not personal profile)
        const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
        const pagesData = await pagesRes.json() as any;
        const page      = pagesData.data?.[0];

        if (page) {
          // Use page token for posting
          await supabase.from("social_accounts").insert({
            user_id: userId, platform: "facebook",
            account_id: page.id, account_name: page.name || "Facebook Page",
            account_handle: page.id, access_token: page.access_token || accessToken,
            token_expires_at: tokenExpiresAt, is_active: true, followers_count: 0,
          });
        } else {
          // Fallback to user profile
          const fbRes  = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
          const fbData = await fbRes.json() as any;
          await supabase.from("social_accounts").insert({
            user_id: userId, platform: "facebook",
            account_id: fbData.id, account_name: fbData.name || "Facebook",
            account_handle: fbData.id, access_token: accessToken,
            token_expires_at: tokenExpiresAt, is_active: true, followers_count: 0,
          });
        }
        return go("?success=true&platform=facebook");
      }

      // Instagram
      const pagesRes  = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
      const pagesData = await pagesRes.json() as any;
      const page      = pagesData.data?.[0];
      if (!page) return go("?error=No+Facebook+Page+found.+Create+a+Facebook+Page+and+link+your+Instagram+Business+account");

      const igRes  = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
      const igData = await igRes.json() as any;
      const igId   = igData.instagram_business_account?.id;
      if (!igId) return go("?error=No+Instagram+Business+Account+linked+to+your+Facebook+Page");

      const igProfileRes = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=id,username,followers_count&access_token=${accessToken}`);
      const igProfile    = await igProfileRes.json() as any;

      const { error: dbErr } = await supabase.from("social_accounts").insert({
        user_id: userId, platform: "instagram",
        account_id: igProfile.id, account_name: igProfile.username || "Instagram",
        account_handle: `@${igProfile.username || ""}`, access_token: accessToken,
        token_expires_at: tokenExpiresAt, is_active: true, followers_count: igProfile.followers_count || 0,
      });
      if (dbErr) return go(`?error=DB+error&error_desc=${encodeURIComponent(dbErr.message)}`);
      return go("?success=true&platform=instagram");
    }

    // ── YOUTUBE ───────────────────────────────────────────────
    if (platform === "youtube") {
      const YT_ID  = Deno.env.get("YOUTUBE_CLIENT_ID")     || "";
      const YT_SEC = Deno.env.get("YOUTUBE_CLIENT_SECRET") || "";
      if (!YT_ID) return go("?error=YouTube+credentials+not+configured");

      const tRes  = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUri, client_id: YT_ID, client_secret: YT_SEC }),
      });
      const tData = await tRes.json() as any;
      if (!tData.access_token) return go(`?error=YouTube+token+error&error_desc=${encodeURIComponent(JSON.stringify(tData))}`);

      const cRes  = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
        headers: { "Authorization": `Bearer ${tData.access_token}` },
      });
      const ch = ((await cRes.json() as any).items || [])[0];
      await supabase.from("social_accounts").insert({
        user_id: userId, platform: "youtube",
        account_id: ch?.id || "", account_name: ch?.snippet?.title || "YouTube",
        account_handle: ch?.snippet?.customUrl || "",
        access_token: tData.access_token, refresh_token: tData.refresh_token || "",
        is_active: true, followers_count: parseInt(ch?.statistics?.subscriberCount || "0"),
      });
      return go("?success=true&platform=youtube");
    }

    // ── TWITTER ───────────────────────────────────────────────
    if (platform === "twitter") {
      const TW_ID  = Deno.env.get("TWITTER_CLIENT_ID")     || "";
      const TW_SEC = Deno.env.get("TWITTER_CLIENT_SECRET") || "";
      if (!TW_ID) return go("?error=Twitter+credentials+not+configured");
      const tRes  = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Basic " + btoa(`${TW_ID}:${TW_SEC}`) },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUri, code_verifier: "challenge" }),
      });
      const tData = await tRes.json() as any;
      if (!tData.access_token) return go(`?error=Twitter+token+error`);
      const uRes  = await fetch("https://api.twitter.com/2/users/me?user.fields=name,username,public_metrics", { headers: { "Authorization": `Bearer ${tData.access_token}` } });
      const uData = (await uRes.json() as any).data || {};
      await supabase.from("social_accounts").insert({
        user_id: userId, platform: "twitter",
        account_id: uData.id || "", account_name: uData.name || "Twitter",
        account_handle: uData.username ? `@${uData.username}` : "",
        access_token: tData.access_token, refresh_token: tData.refresh_token || "",
        is_active: true, followers_count: uData.public_metrics?.followers_count || 0,
      });
      return go("?success=true&platform=twitter");
    }

    // ── LINKEDIN ──────────────────────────────────────────────
    if (platform === "linkedin") {
      const LI_ID  = Deno.env.get("LINKEDIN_CLIENT_ID")     || "";
      const LI_SEC = Deno.env.get("LINKEDIN_CLIENT_SECRET") || "";
      if (!LI_ID) return go("?error=LinkedIn+credentials+not+configured");
      const tRes  = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUri, client_id: LI_ID, client_secret: LI_SEC }),
      });
      const tData = await tRes.json() as any;
      if (!tData.access_token) return go("?error=LinkedIn+token+error");
      const pRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { "Authorization": `Bearer ${tData.access_token}` } });
      const p    = await pRes.json() as any;
      await supabase.from("social_accounts").insert({
        user_id: userId, platform: "linkedin",
        account_id: p.sub || "", account_name: p.name || "LinkedIn",
        account_handle: p.email || "", access_token: tData.access_token,
        is_active: true, followers_count: 0,
      });
      return go("?success=true&platform=linkedin");
    }

    return go(`?error=Unknown+platform:+${platform}`);

  } catch (err: any) {
    console.error("oauth-callback error:", err);
    return go(`?error=Server+error&error_desc=${encodeURIComponent(err.message)}`);
  }
});
