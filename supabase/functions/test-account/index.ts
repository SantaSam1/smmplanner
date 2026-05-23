// @ts-nocheck
// verify_jwt = false — см. supabase/config.toml
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });

  const j = (data: any, s = 200) =>
    new Response(JSON.stringify(data), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  let body: any = {};
  try { body = await req.json(); } catch { return j({ ok: false, error: "Invalid JSON" }, 400); }

  const { accountId } = body;
  if (!accountId) return j({ ok: false, error: "accountId required" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  const { data: acc, error: accErr } = await supabase
    .from("social_accounts").select("*").eq("id", accountId).maybeSingle();

  if (accErr || !acc) return j({ ok: false, error: accErr?.message || "Account not found" }, 404);

  const creds    = acc.credentials || {};
  const platform = acc.platform;

  try {
    // ── Telegram ────────────────────────────────────────────
    if (platform === "telegram") {
      const token = creds.bot_token || acc.access_token || "";
      if (!token) return j({ ok: false, error: "Bot token отсутствует" });

      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`).then(r => r.json()) as any;
      if (r.ok) return j({ ok: true, info: `Бот: @${r.result.username}` });
      return j({ ok: false, error: r.description || "Telegram ошибка" });
    }

    // ── VKontakte ────────────────────────────────────────────
    if (platform === "vk") {
      const token   = creds.token || acc.access_token || "";
      const groupId = creds.group_id || "";
      if (!token)   return j({ ok: false, error: "VK token отсутствует" });
      if (!groupId) return j({ ok: false, error: "VK group_id отсутствует" });

      const r = await fetch(
        `https://api.vk.com/method/groups.getById?access_token=${token}&group_id=${groupId}&v=5.199&fields=members_count`
      ).then(r => r.json()) as any;

      if (r.response) {
        const g = r.response.groups[0];
        return j({ ok: true, info: `${g.name} · ${(g.members_count || 0).toLocaleString()} подписчиков` });
      }
      return j({ ok: false, error: `VK ${r.error?.error_code}: ${r.error?.error_msg}` });
    }

    // ── Odnoklassniki ────────────────────────────────────────
    if (platform === "ok") {
      const token = creds.access_token || acc.access_token || "";
      return j({
        ok: !!token,
        info: token ? "OK.ru: токен активен" : "OK.ru: нет токена — нажмите Авторизовать OK.ru"
      });
    }

    // ── OAuth платформы (Instagram, Facebook, YouTube...) ───
    const hasToken = !!(acc.access_token || creds.access_token);
    return j({
      ok: hasToken,
      info: hasToken
        ? `${platform}: OAuth токен активен`
        : `${platform}: нет токена — войдите через OAuth`
    });

  } catch (err: any) {
    console.error(`test-account [${platform}] error:`, err.message);
    return j({ ok: false, error: err.message }, 500);
  }
});
