import { useEffect, useState } from 'react';
import {
  Trash2, ToggleLeft, ToggleRight, Users, LogIn,
  CheckCircle, XCircle, Loader2, X, Send, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Platform, SocialAccount } from '../types';

// ─── Конфигурация всех платформ ──────────────────────────────
const ALL_PLATFORMS: {
  id: Platform;
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  type: 'oauth' | 'manual';
  envKey?: string;
}[] = [
  { id: 'telegram', label: 'Telegram',      icon: '✈️', color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200',   type: 'manual' },
  { id: 'vk',       label: 'ВКонтакте',     icon: '🔵', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  type: 'manual' },
  { id: 'ok',       label: 'Одноклассники', icon: '🟠', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',type: 'manual' },
  { id: 'instagram',label: 'Instagram',     icon: '📸', color: 'text-pink-700',   bg: 'bg-pink-50',   border: 'border-pink-200',  type: 'oauth', envKey: 'VITE_INSTAGRAM_APP_ID' },
  { id: 'facebook', label: 'Facebook',      icon: '📘', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  type: 'oauth', envKey: 'VITE_FACEBOOK_APP_ID' },
  { id: 'youtube',  label: 'YouTube',       icon: '▶️', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   type: 'oauth', envKey: 'VITE_YOUTUBE_CLIENT_ID' },
  { id: 'twitter',  label: 'Twitter / X',   icon: '𝕏',  color: 'text-gray-800',   bg: 'bg-gray-100',  border: 'border-gray-200',  type: 'oauth', envKey: 'VITE_TWITTER_API_KEY' },
  { id: 'linkedin', label: 'LinkedIn',      icon: '💼', color: 'text-blue-800',   bg: 'bg-blue-50',   border: 'border-blue-200',  type: 'oauth', envKey: 'VITE_LINKEDIN_APP_ID' },
  { id: 'tiktok',   label: 'TikTok',        icon: '🎵', color: 'text-gray-900',   bg: 'bg-gray-100',  border: 'border-gray-200',  type: 'oauth', envKey: 'VITE_TIKTOK_CLIENT_KEY' },
];

const OAUTH_URLS: Record<string, { authUrl: string; scopes: string[]; sep: string }> = {
  instagram: { authUrl: 'https://www.facebook.com/v19.0/dialog/oauth', scopes: ['email','public_profile','pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish'], sep: ',' },
  facebook:  { authUrl: 'https://www.facebook.com/v19.0/dialog/oauth', scopes: ['email','public_profile','pages_show_list'], sep: ',' },
  twitter:   { authUrl: 'https://twitter.com/i/oauth2/authorize', scopes: ['tweet.write','tweet.read','users.read'], sep: ' ' },
  linkedin:  { authUrl: 'https://www.linkedin.com/oauth/v2/authorization', scopes: ['w_member_social','r_liteprofile'], sep: ',' },
  tiktok:    { authUrl: 'https://www.tiktok.com/oauth/authorize', scopes: ['video.publish','video.list'], sep: ',' },
  youtube:   { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: ['https://www.googleapis.com/auth/youtube.upload'], sep: ' ' },
};

const MANUAL_FIELDS: Record<string, { key: string; labelRu: string; labelEn: string; hintRu?: string; hintEn?: string; mono?: boolean }[]> = {
  telegram: [
    { key: 'bot_token',  labelRu: 'Bot Token',  labelEn: 'Bot Token',  hintRu: 'Получить у @BotFather в Telegram', hintEn: 'Get from @BotFather in Telegram', mono: true },
    { key: 'channel_id', labelRu: 'ID канала',  labelEn: 'Channel ID', hintRu: '@username или -100xxxxxxxxxx', hintEn: '@username or -100xxxxxxxxxx', mono: true },
  ],
  vk: [
    { key: 'token',    labelRu: 'Access Token', labelEn: 'Access Token', hintRu: 'Группа → Управление → Работа с API → создать ключ (доступ: Стена)', hintEn: 'Group → Manage → API → create key (Wall access)', mono: true },
    { key: 'group_id', labelRu: 'ID группы',   labelEn: 'Group ID',    hintRu: 'Числовой ID из URL группы (без минуса)', hintEn: 'Numeric ID from group URL (without minus)', mono: true },
  ],
  ok: [
    { key: 'group_id', labelRu: 'ID группы', labelEn: 'Group ID', hintRu: 'Из URL: ok.ru/group/XXXXXXXXX', hintEn: 'From URL: ok.ru/group/XXXXXXXXX', mono: true },
  ],
};

const OK_APP_KEY = import.meta.env.VITE_OK_APP_KEY || '';

type TestStatus = 'idle' | 'loading' | 'ok' | 'error';
type ActiveModal = { platform: Platform; type: 'manual' } | null;

export default function Accounts() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ru = language === 'ru';

  const [accounts, setAccounts]       = useState<SocialAccount[]>([]);
  const [loading, setLoading]         = useState(true);
  const [connecting, setConnecting]   = useState<Platform | null>(null);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Modal form state
  const [manualName, setManualName]     = useState('');
  const [manualFields, setManualFields] = useState<Record<string, string>>({});
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError]   = useState('');
  const [okToken, setOkToken]           = useState('');
  const [okOAuthLoading, setOkOAuthLoading] = useState(false);

  // Test per-account
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
  const [testMessages, setTestMessages] = useState<Record<string, string>>({});

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const callbackUrl = `${supabaseUrl}/functions/v1/oauth-callback`;

  useEffect(() => {
    if (!user) return;
    fetchAccounts();
    handleOAuthReturn();
  }, [user]);

  async function fetchAccounts() {
    const { data } = await supabase.from('social_accounts').select('*').eq('user_id', user!.id);
    setAccounts(data ?? []);
    setLoading(false);
  }

  function handleOAuthReturn() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('success') === 'true') {
      const pl = p.get('platform') || '';
      setSuccessMsg(ru ? `✅ ${pl} аккаунт подключён!` : `✅ ${pl} account connected!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setTimeout(fetchAccounts, 500);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (p.get('error')) {
      const msg = decodeURIComponent(p.get('error') || '').replace(/\+/g, ' ');
      let friendly = msg;
      if (msg.includes('No linked Facebook') || msg.includes('No Facebook Page')) {
        friendly = ru
          ? 'Instagram требует бизнес-аккаунт и привязанную Facebook Страницу. Перейдите в Instagram → Настройки → Аккаунт → Профессиональный → привяжите Facebook Страницу.'
          : 'Instagram requires a Business account linked to a Facebook Page. Go to Instagram → Settings → Account → Professional → link your Facebook Page.';
      } else if (msg.includes('Failed to get access token')) {
        friendly = ru
          ? 'Не удалось получить токен. Убедитесь что redirect URI в настройках приложения точно совпадает с URL Supabase.'
          : 'Failed to get access token. Check that redirect URI in app settings exactly matches the Supabase URL.';
      } else if (msg.includes('credentials not configured') || msg.includes('not configured')) {
        friendly = ru
          ? 'Ключи приложения не настроены. Добавьте их в Supabase → Edge Functions → Secrets.'
          : 'App credentials not configured. Add them in Supabase → Edge Functions → Secrets.';
      }
      setError(friendly);
      setTimeout(() => setError(''), 12000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // ─── OAuth ───────────────────────────────────────────────────
  function initiateOAuth(platform: Platform) {
    if (!user) return;
    const cfg = ALL_PLATFORMS.find(p => p.id === platform);
    const clientId = cfg?.envKey ? (import.meta.env[cfg.envKey] || '') : '';
    if (!clientId) {
      setError(ru
        ? `${cfg?.label}: ключ не настроен в .env. Добавьте ${cfg?.envKey}.`
        : `${cfg?.label}: key not configured in .env. Add ${cfg?.envKey}.`);
      return;
    }
    setConnecting(platform);
    const oauthCfg = OAUTH_URLS[platform];
    const state = btoa(JSON.stringify({ userId: user.id, platform, redirectUrl: window.location.origin }));
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: callbackUrl, response_type: 'code', state, scope: oauthCfg.scopes.join(oauthCfg.sep) });
    window.location.href = `${oauthCfg.authUrl}?${params}`;
  }

  // ─── OK OAuth popup ──────────────────────────────────────────
  async function handleOkOAuth() {
    if (!OK_APP_KEY) { setManualError(ru ? 'VITE_OK_APP_KEY не задан в .env' : 'VITE_OK_APP_KEY not set in .env'); return; }
    setOkOAuthLoading(true);
    // OK.ru OAuth — используем Supabase Edge Function как callback
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback`;
    const state = btoa(JSON.stringify({ userId: user!.id, platform: 'ok', redirectUrl: window.location.origin }));
    const params = new URLSearchParams({ client_id: OK_APP_KEY, scope: 'VALUABLE_ACCESS;GROUP_CONTENT;LONG_ACCESS_TOKEN', response_type: 'code', redirect_uri: redirectUri, layout: 'w', state });
    const popup = window.open(`https://connect.ok.ru/oauth/authorize?${params}`, 'ok_oauth', 'width=600,height=700');
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ok_oauth_success') {
        window.removeEventListener('message', handler); popup?.close(); setOkOAuthLoading(false);
        setOkToken(e.data.token);
        setManualFields(prev => ({ ...prev, access_token: e.data.token }));
      } else if (e.data?.type === 'ok_oauth_error') {
        window.removeEventListener('message', handler); popup?.close(); setOkOAuthLoading(false);
        setManualError(e.data.error || 'OAuth error');
      }
    };
    window.addEventListener('message', handler);
    setTimeout(() => { setOkOAuthLoading(false); window.removeEventListener('message', handler); }, 120000);
  }

  // ─── Save manual account ─────────────────────────────────────
  async function saveManualAccount() {
    if (!activeModal) return;
    const platform = activeModal.platform;
    if (!manualName.trim()) { setManualError(ru ? 'Введите название' : 'Enter account name'); return; }
    const fields = MANUAL_FIELDS[platform] || [];
    for (const f of fields) {
      if (!manualFields[f.key]?.trim() && platform !== 'ok') {
        setManualError(ru ? `Заполните поле «${f.labelRu}»` : `Fill in "${f.labelEn}"`); return;
      }
    }
    setManualSaving(true); setManualError('');
    const creds: Record<string, string> = { ...manualFields };
    if (platform === 'ok' && okToken) creds.access_token = okToken;

    const { data, error: dbErr } = await supabase.from('social_accounts').insert({
      user_id:         user!.id,
      platform,
      account_name:    manualName.trim(),
      account_handle:  manualFields.channel_id || manualFields.group_id || '',
      followers_count: 0,
      is_active:       true,
      credentials:     creds,
    }).select().maybeSingle();
    setManualSaving(false);
    if (dbErr) { setManualError(dbErr.message); return; }
    if (data) setAccounts(prev => [...prev, data]);
    closeModal();
    setSuccessMsg(ru ? `✅ Аккаунт добавлен!` : `✅ Account added!`);
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  // ─── Test connection ─────────────────────────────────────────
  async function testConnection(acc: SocialAccount) {
    setTestStatuses(s => ({ ...s, [acc.id]: 'loading' }));
    setTestMessages(m => ({ ...m, [acc.id]: '' }));
    try {
      // verify_jwt=false — отправляем без Bearer токена
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/test-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ accountId: acc.id }),
      });
      const data = await res.json();
      setTestStatuses(s => ({ ...s, [acc.id]: data.ok ? 'ok' : 'error' }));
      setTestMessages(m => ({ ...m, [acc.id]: data.info || data.error || '' }));
    } catch (e: any) {
      setTestStatuses(s => ({ ...s, [acc.id]: 'error' }));
      setTestMessages(m => ({ ...m, [acc.id]: e.message }));
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('social_accounts').update({ is_active: !current }).eq('id', id);
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
  }
  async function deleteAccount(id: string) {
    if (!confirm(ru ? 'Удалить этот аккаунт?' : 'Delete this account?')) return;
    await supabase.from('social_accounts').delete().eq('id', id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  function openModal(platform: Platform) {
    setActiveModal({ platform, type: 'manual' });
    setManualName(''); setManualFields({}); setManualError(''); setOkToken('');
  }
  function closeModal() {
    setActiveModal(null); setManualName(''); setManualFields({}); setManualError(''); setOkToken('');
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const connectedIds = new Set(accounts.map(a => a.platform));

  return (
    <div className="p-6 max-w-6xl">
      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-3 items-start">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="flex-shrink-0 text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{successMsg}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{ru ? 'Социальные сети' : 'Social Networks'}</h2>
          <p className="text-sm text-gray-500">{accounts.length} {ru ? 'аккаунтов подключено' : 'accounts connected'}</p>
        </div>
      </div>

      {/* ── ALL PLATFORMS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {ALL_PLATFORMS.map(platform => {
          const connected = accounts.find(a => a.platform === platform.id);
          const isConnected = !!connected;
          const ts = connected ? testStatuses[connected.id] || 'idle' : 'idle';
          const tm = connected ? testMessages[connected.id] || '' : '';
          const clientId = platform.envKey ? (import.meta.env[platform.envKey] || '') : null;
          const isOAuthConfigured = platform.type === 'oauth' && !!clientId;

          return (
            <div key={platform.id}
              className={`bg-white rounded-2xl border-2 p-5 flex flex-col transition-all ${isConnected ? `${platform.border} shadow-sm` : 'border-gray-100 hover:border-gray-200'}`}>

              {/* Platform header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${platform.bg} flex items-center justify-center text-2xl leading-none flex-shrink-0`}>
                    {platform.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{platform.label}</p>
                    {isConnected ? (
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${connected!.is_active ? 'bg-green-400' : 'bg-gray-300'}`}/>
                        <span className={`text-xs font-medium ${connected!.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {connected!.is_active ? (ru ? 'Активен' : 'Active') : (ru ? 'Выкл.' : 'Inactive')}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">{ru ? 'Не подключён' : 'Not connected'}</p>
                    )}
                  </div>
                </div>
                {/* Connected: toggle + delete */}
                {isConnected && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleActive(connected!.id, connected!.is_active)} className="text-gray-400 hover:text-blue-600 transition-colors p-1">
                      {connected!.is_active ? <ToggleRight className="w-5 h-5 text-blue-600"/> : <ToggleLeft className="w-5 h-5"/>}
                    </button>
                    <button onClick={() => deleteAccount(connected!.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                )}
              </div>

              {/* Connected account info */}
              {isConnected && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-900 truncate">{connected!.account_name}</p>
                  {connected!.account_handle && <p className="text-xs text-gray-400 truncate">{connected!.account_handle}</p>}
                  {connected!.followers_count > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">{connected!.followers_count.toLocaleString()} {ru ? 'подписчиков' : 'followers'}</p>
                  )}
                </div>
              )}

              {/* Test result */}
              {tm && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${ts==='ok'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
                  {ts==='ok' ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/> : <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>}
                  <span>{tm}</span>
                </div>
              )}

              {/* Action button */}
              <div className="mt-auto">
                {isConnected ? (
                  <button onClick={() => testConnection(connected!)} disabled={ts==='loading'}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                    {ts==='loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                      : ts==='ok'   ? <CheckCircle className="w-3.5 h-3.5 text-green-500"/>
                      : ts==='error' ? <XCircle className="w-3.5 h-3.5 text-red-500"/>
                      : null}
                    {ru ? 'Проверить соединение' : 'Test connection'}
                  </button>
                ) : platform.type === 'manual' ? (
                  <button onClick={() => openModal(platform.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${platform.bg} ${platform.color} hover:opacity-80 border ${platform.border}`}>
                    <span>+</span>
                    {ru ? 'Подключить' : 'Connect'}
                  </button>
                ) : isOAuthConfigured ? (
                  <button onClick={() => initiateOAuth(platform.id)} disabled={connecting === platform.id}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${platform.bg} ${platform.color} hover:opacity-80 border ${platform.border} disabled:opacity-50`}>
                    {connecting === platform.id
                      ? <><Loader2 className="w-4 h-4 animate-spin"/>{ru ? 'Подключаю...' : 'Connecting...'}</>
                      : <><LogIn className="w-4 h-4"/>{ru ? 'Войти' : 'Sign in'}</>}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-center text-xs text-gray-400 bg-gray-50 border border-gray-200 font-medium">
                    {ru ? 'Не настроено в .env' : 'Not configured in .env'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {accounts.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-12 flex flex-col items-center text-center">
          <Users className="w-10 h-10 text-gray-300 mb-3"/>
          <p className="text-gray-500 font-medium">{ru ? 'Нажмите «Подключить» на любой карточке выше' : 'Click "Connect" on any card above'}</p>
        </div>
      )}

      {/* ── MODAL: Manual form ── */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            {(() => {
              const pl = ALL_PLATFORMS.find(p => p.id === activeModal.platform)!;
              const fields = MANUAL_FIELDS[activeModal.platform] || [];
              return (
                <>
                  <div className={`${pl.bg} rounded-t-2xl px-6 py-4 flex items-center justify-between border-b ${pl.border}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pl.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-900">{ru ? `Подключить ${pl.label}` : `Connect ${pl.label}`}</h3>
                        <p className="text-xs text-gray-500">{ru ? 'Введите данные аккаунта' : 'Enter account details'}</p>
                      </div>
                    </div>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/50">
                      <X className="w-5 h-5"/>
                    </button>
                  </div>

                  <div className="p-6">
                    {/* OK OAuth */}
                    {activeModal.platform === 'ok' && (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                        <p className="text-sm text-orange-800 font-medium mb-1">
                          {ru ? 'Шаг 1: Авторизуйтесь через OK.ru' : 'Step 1: Authorize via OK.ru'}
                        </p>
                        <p className="text-xs text-orange-700 mb-3">
                          {ru ? 'Откроется всплывающее окно для входа в Одноклассники' : 'A popup will open for OK.ru login'}
                        </p>
                        <button onClick={handleOkOAuth} disabled={okOAuthLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg transition-colors">
                          {okOAuthLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : '🔑'}
                          {ru ? 'Авторизоваться в OK.ru' : 'Authorize OK.ru'}
                        </button>
                        {okToken && (
                          <div className="flex items-center gap-2 mt-2 text-green-700 text-xs font-medium">
                            <Check className="w-4 h-4"/> {ru ? 'Авторизация прошла успешно' : 'Authorization successful'}
                          </div>
                        )}
                        <hr className="my-4 border-orange-200"/>
                        <p className="text-sm text-orange-800 font-medium">
                          {ru ? 'Шаг 2: Введите данные группы' : 'Step 2: Enter group details'}
                        </p>
                      </div>
                    )}

                    {/* Account name */}
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        {ru ? 'Название аккаунта' : 'Account name'} <span className="text-gray-400 normal-case font-normal">({ru?'для удобства':'for reference'})</span>
                      </label>
                      <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} autoFocus
                        placeholder={activeModal.platform==='telegram'?'Мой Telegram канал':activeModal.platform==='vk'?'Моя VK группа':'Группа в ОК'}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"/>
                    </div>

                    {/* Platform fields */}
                    <div className="space-y-4">
                      {fields.map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {ru ? f.labelRu : f.labelEn}
                          </label>
                          <input type="text" value={manualFields[f.key] || ''} onChange={e => setManualFields(p => ({ ...p, [f.key]: e.target.value }))}
                            className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${f.mono ? 'font-mono' : ''}`}/>
                          {(ru ? f.hintRu : f.hintEn) && (
                            <p className="text-xs text-gray-400 mt-1.5">{ru ? f.hintRu : f.hintEn}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {manualError && (
                      <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{manualError}</div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 mt-6">
                      <button onClick={closeModal} className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                        {ru ? 'Отмена' : 'Cancel'}
                      </button>
                      <button onClick={saveManualAccount} disabled={manualSaving}
                        className={`flex-1 py-3 text-sm font-semibold text-white rounded-xl transition-colors flex items-center justify-center gap-2 ${pl.bg.replace('50','600')||'bg-blue-600'} hover:opacity-90 disabled:opacity-50`}
                        style={{backgroundColor: activeModal.platform==='telegram'?'#0284c7':activeModal.platform==='vk'?'#1d4ed8':activeModal.platform==='ok'?'#ea580c':'#2563eb'}}>
                        {manualSaving && <Loader2 className="w-4 h-4 animate-spin"/>}
                        <Send className="w-4 h-4"/>
                        {ru ? 'Подключить' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Setup info */}
      <div className="mt-4 bg-blue-50 rounded-xl border border-blue-100 p-5">
        <h3 className="font-semibold text-blue-900 mb-2 text-sm">
          {ru ? '⚙️ Настройка OAuth (Instagram, Facebook, YouTube...)' : '⚙️ OAuth Setup (Instagram, Facebook, YouTube...)'}
        </h3>
        <p className="text-xs text-blue-700 mb-2">
          {ru ? 'Redirect URI для настройки в консоли разработчика:' : 'Redirect URI to set in developer console:'}
        </p>
        <code className="block bg-white px-3 py-2 rounded-lg text-xs font-mono text-blue-800 border border-blue-200 break-all">{callbackUrl}</code>
      </div>
    </div>
  );
}
