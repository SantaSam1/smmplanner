import { useEffect, useState } from 'react';
import { Trash2, ToggleLeft, ToggleRight, LogIn, CheckCircle, XCircle, Loader2, X, Send, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Platform, SocialAccount } from '../types';

// ─── Все платформы ────────────────────────────────────────────
const PLATFORMS = [
  { id: 'telegram' as Platform, label: 'Telegram',       icon: '✈️', color: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200',   type: 'manual' as const },
  { id: 'vk'       as Platform, label: 'ВКонтакте',      icon: '🔵', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  type: 'manual' as const },
  { id: 'ok'       as Platform, label: 'Одноклассники',  icon: '🟠', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',type: 'manual' as const },
  { id: 'instagram'as Platform, label: 'Instagram',      icon: '📸', color: 'text-pink-700',   bg: 'bg-pink-50',   border: 'border-pink-200',  type: 'oauth'  as const, envKey: 'VITE_INSTAGRAM_APP_ID' },
  { id: 'facebook' as Platform, label: 'Facebook',       icon: '📘', color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  type: 'oauth'  as const, envKey: 'VITE_FACEBOOK_APP_ID' },
  { id: 'youtube'  as Platform, label: 'YouTube',        icon: '▶️', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   type: 'oauth'  as const, envKey: 'VITE_YOUTUBE_CLIENT_ID' },
  { id: 'twitter'  as Platform, label: 'Twitter / X',    icon: '𝕏',  color: 'text-gray-800',   bg: 'bg-gray-100',  border: 'border-gray-200',  type: 'oauth'  as const, envKey: 'VITE_TWITTER_API_KEY' },
  { id: 'linkedin' as Platform, label: 'LinkedIn',       icon: '💼', color: 'text-blue-800',   bg: 'bg-blue-50',   border: 'border-blue-200',  type: 'oauth'  as const, envKey: 'VITE_LINKEDIN_APP_ID' },
  { id: 'tiktok'   as Platform, label: 'TikTok',         icon: '🎵', color: 'text-gray-900',   bg: 'bg-gray-100',  border: 'border-gray-200',  type: 'oauth'  as const, envKey: 'VITE_TIKTOK_CLIENT_KEY' },
];

const OAUTH_URLS: Record<string, { authUrl: string; scopes: string[]; sep: string }> = {
  instagram: { authUrl: 'https://www.facebook.com/v19.0/dialog/oauth', scopes: ['email','public_profile','pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish'], sep: ',' },
  facebook:  { authUrl: 'https://www.facebook.com/v19.0/dialog/oauth', scopes: ['email','public_profile','pages_show_list','pages_manage_posts','pages_read_engagement'], sep: ',' },
  twitter:   { authUrl: 'https://twitter.com/i/oauth2/authorize', scopes: ['tweet.write','tweet.read','users.read'], sep: ' ' },
  linkedin:  { authUrl: 'https://www.linkedin.com/oauth/v2/authorization', scopes: ['w_member_social','r_liteprofile'], sep: ',' },
  tiktok:    { authUrl: 'https://www.tiktok.com/oauth/authorize', scopes: ['video.publish','video.list'], sep: ',' },
  youtube:   { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: ['https://www.googleapis.com/auth/youtube.upload','https://www.googleapis.com/auth/youtube.readonly'], sep: ' ' },
};

const MANUAL_FIELDS: Record<string, { key: string; labelRu: string; labelEn: string; hint?: string }[]> = {
  telegram: [
    { key: 'bot_token',  labelRu: 'Bot Token',  labelEn: 'Bot Token',  hint: '@BotFather в Telegram' },
    { key: 'channel_id', labelRu: 'ID канала',  labelEn: 'Channel ID', hint: '@username или -100xxxxxxxxxx' },
  ],
  vk: [
    { key: 'token',    labelRu: 'Access Token', labelEn: 'Access Token', hint: 'Группа → Управление → API' },
    { key: 'group_id', labelRu: 'ID группы',   labelEn: 'Group ID',    hint: 'Числовой ID из URL (без минуса)' },
  ],
  ok: [
    { key: 'group_id', labelRu: 'ID группы', labelEn: 'Group ID', hint: 'ok.ru/group/XXXXXXXXX' },
  ],
};

const OK_APP_KEY = import.meta.env.VITE_OK_APP_KEY || '';
type TestStatus = 'idle'|'loading'|'ok'|'error';

export default function Accounts() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ru = language === 'ru';

  const [accounts, setAccounts]     = useState<SocialAccount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [connecting, setConnecting] = useState<Platform|null>(null);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeModal, setActiveModal] = useState<Platform|null>(null);
  const [manualName, setManualName] = useState('');
  const [manualFields, setManualFields] = useState<Record<string,string>>({});
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');
  const [okOAuthLoading, setOkOAuthLoading] = useState(false);
  const [okToken, setOkToken] = useState('');
  const [testStatuses, setTestStatuses] = useState<Record<string,TestStatus>>({});
  const [testMessages, setTestMessages] = useState<Record<string,string>>({});

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const callbackUrl = `${supabaseUrl}/functions/v1/oauth-callback`;

  useEffect(() => {
    if (!user) return;
    fetchAccounts();
    handleOAuthReturn();
  }, [user]);

  async function fetchAccounts() {
    const { data } = await supabase.from('social_accounts').select('*').eq('user_id', user!.id).order('connected_at', { ascending: false });
    setAccounts(data ?? []);
    setLoading(false);
  }

  function handleOAuthReturn() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('success') === 'true') {
      const pl = p.get('platform') || '';
      setSuccessMsg(ru ? `✅ ${pl} подключён!` : `✅ ${pl} connected!`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setTimeout(fetchAccounts, 800);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (p.get('error')) {
      const msg = decodeURIComponent(p.get('error') || '').replace(/\+/g, ' ');
      let friendly = msg;
      if (msg.includes('No Facebook Page') || msg.includes('No linked Facebook')) {
        friendly = ru ? 'Instagram требует Facebook Страницу с привязанным Instagram Business аккаунтом. Перейдите в настройки Facebook Страницы → Instagram → привяжите аккаунт.' : 'Instagram requires a Facebook Page with linked Instagram Business account.';
      } else if (msg.includes('credentials not configured')) {
        friendly = ru ? 'Ключи не настроены. Добавьте их в Supabase → Edge Functions → Secrets.' : 'Credentials not configured. Add them in Supabase → Edge Functions → Secrets.';
      }
      setError(friendly);
      setTimeout(() => setError(''), 12000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function initiateOAuth(platform: Platform) {
    if (!user) return;
    const pl = PLATFORMS.find(p => p.id === platform);
    const clientId = pl?.envKey ? (import.meta.env[pl.envKey] || '') : '';
    if (!clientId) {
      setError(ru ? `${pl?.label}: ключ не настроен. Добавьте ${pl?.envKey} в переменные Vercel.` : `${pl?.label}: key not configured. Add ${pl?.envKey} to Vercel env vars.`);
      return;
    }
    setConnecting(platform);
    const oauthCfg = OAUTH_URLS[platform];
    const state = btoa(JSON.stringify({ userId: user.id, platform, redirectUrl: window.location.origin }));
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: callbackUrl, response_type: 'code', state, scope: oauthCfg.scopes.join(oauthCfg.sep) });
    if (platform === 'youtube') params.set('access_type', 'offline');
    window.location.href = `${oauthCfg.authUrl}?${params}`;
  }

  async function handleOkOAuth() {
    if (!OK_APP_KEY) { setManualError('VITE_OK_APP_KEY не задан в .env / Vercel'); return; }
    if (!user) return;
    setOkOAuthLoading(true);
    const state = btoa(JSON.stringify({ userId: user.id, platform: 'ok', redirectUrl: window.location.origin }));
    const params = new URLSearchParams({ client_id: OK_APP_KEY, scope: 'VALUABLE_ACCESS;GROUP_CONTENT;LONG_ACCESS_TOKEN', response_type: 'code', redirect_uri: callbackUrl, layout: 'w', state });
    window.location.href = `https://connect.ok.ru/oauth/authorize?${params}`;
  }

  async function saveManualAccount() {
    if (!activeModal) return;
    if (!manualName.trim()) { setManualError(ru?'Введите название':'Enter name'); return; }
    const fields = MANUAL_FIELDS[activeModal] || [];
    for (const f of fields) {
      if (!manualFields[f.key]?.trim() && activeModal !== 'ok') {
        setManualError(ru ? `Заполните «${f.labelRu}»` : `Fill in "${f.labelEn}"`); return;
      }
    }
    setManualSaving(true); setManualError('');
    const creds: Record<string,string> = { ...manualFields };
    if (activeModal === 'ok' && okToken) creds.access_token = okToken;

    const { data, error: dbErr } = await supabase.from('social_accounts').insert({
      user_id: user!.id, platform: activeModal,
      account_name: manualName.trim(),
      account_handle: manualFields.channel_id || manualFields.group_id || '',
      followers_count: 0, is_active: true, credentials: creds,
    }).select().maybeSingle();
    setManualSaving(false);
    if (dbErr) { setManualError(dbErr.message); return; }
    if (data) setAccounts(prev => [data, ...prev]);
    closeModal();
    setSuccessMsg(ru ? '✅ Аккаунт добавлен!' : '✅ Account added!');
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  async function testConnection(acc: SocialAccount) {
    setTestStatuses(s => ({ ...s, [acc.id]: 'loading' }));
    setTestMessages(m => ({ ...m, [acc.id]: '' }));
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/test-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseAnonKey },
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
    if (!confirm(ru?'Удалить этот аккаунт?':'Delete this account?')) return;
    await supabase.from('social_accounts').delete().eq('id', id);
    setAccounts(prev => prev.filter(a => a.id !== id));
  }

  function openModal(platform: Platform) {
    setActiveModal(platform); setManualName(''); setManualFields({}); setManualError(''); setOkToken('');
  }
  function closeModal() {
    setActiveModal(null); setManualName(''); setManualFields({}); setManualError(''); setOkToken('');
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  const connectedMap = new Map(accounts.map(a => [a.platform, a]));

  return (
    <div className="p-6 max-w-6xl">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-3 items-start">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4"/></button>
        </div>
      )}
      {successMsg && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{successMsg}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{ru?'Социальные сети':'Social Networks'}</h2>
          <p className="text-sm text-gray-500">{accounts.length} {ru?'подключено':'connected'}</p>
        </div>
        <button onClick={fetchAccounts} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <RefreshCw className="w-4 h-4"/>
        </button>
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {PLATFORMS.map(platform => {
          const connected = connectedMap.get(platform.id);
          const isConnected = !!connected;
          const ts = connected ? testStatuses[connected.id] || 'idle' : 'idle';
          const tm = connected ? testMessages[connected.id] || '' : '';
          const clientId = platform.type === 'oauth' && platform.envKey ? (import.meta.env[platform.envKey] || '') : null;
          const isOAuthConfigured = platform.type === 'oauth' && !!clientId;

          return (
            <div key={platform.id} className={`bg-white rounded-2xl border-2 p-5 flex flex-col transition-all ${isConnected ? `${platform.border} shadow-sm` : 'border-gray-100 hover:border-gray-200'}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${platform.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                    {platform.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{platform.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-300'}`}/>
                      <span className={`text-xs ${isConnected ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                        {isConnected ? (ru?'Активен':'Active') : (ru?'Не подключён':'Not connected')}
                      </span>
                    </div>
                  </div>
                </div>
                {isConnected && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleActive(connected!.id, connected!.is_active)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                      {connected!.is_active ? <ToggleRight className="w-5 h-5 text-blue-600"/> : <ToggleLeft className="w-5 h-5"/>}
                    </button>
                    <button onClick={() => deleteAccount(connected!.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                )}
              </div>

              {/* Connected info */}
              {isConnected && (
                <div className="mb-3 bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{connected!.account_name}</p>
                  {connected!.account_handle && <p className="text-xs text-gray-400 truncate">{connected!.account_handle}</p>}
                  {connected!.followers_count > 0 && <p className="text-xs text-gray-500">{connected!.followers_count.toLocaleString()} {ru?'подписчиков':'followers'}</p>}
                </div>
              )}

              {/* Test result */}
              {tm && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${ts==='ok'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
                  {ts==='ok'?<CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>:<XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>}
                  <span>{tm}</span>
                </div>
              )}

              {/* Action button */}
              <div className="mt-auto">
                {isConnected ? (
                  <button onClick={() => testConnection(connected!)} disabled={ts==='loading'}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                    {ts==='loading'?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:ts==='ok'?<CheckCircle className="w-3.5 h-3.5 text-green-500"/>:ts==='error'?<XCircle className="w-3.5 h-3.5 text-red-500"/>:null}
                    {ru?'Проверить соединение':'Test connection'}
                  </button>
                ) : platform.type === 'manual' ? (
                  <button onClick={() => openModal(platform.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all border ${platform.bg} ${platform.color} ${platform.border} hover:opacity-80`}>
                    + {ru?'Подключить':'Connect'}
                  </button>
                ) : isOAuthConfigured ? (
                  <button onClick={() => initiateOAuth(platform.id)} disabled={connecting===platform.id}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border ${platform.bg} ${platform.color} ${platform.border} hover:opacity-80 disabled:opacity-50`}>
                    {connecting===platform.id ? <><Loader2 className="w-4 h-4 animate-spin"/>{ru?'Подключаю...':'Connecting...'}</> : <><LogIn className="w-4 h-4"/>{ru?'Войти':'Sign in'}</>}
                  </button>
                ) : (
                  <div className="w-full py-2.5 rounded-xl text-center text-xs text-gray-400 bg-gray-50 border border-gray-200">
                    {ru?'Не настроено в Vercel env':'Not configured in Vercel env'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual modal */}
      {activeModal && (() => {
        const pl = PLATFORMS.find(p => p.id === activeModal)!;
        const fields = MANUAL_FIELDS[activeModal] || [];
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className={`${pl.bg} rounded-t-2xl px-6 py-4 flex items-center justify-between border-b ${pl.border}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pl.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{ru?`Подключить ${pl.label}`:`Connect ${pl.label}`}</h3>
                    <p className="text-xs text-gray-500">{ru?'Введите данные аккаунта':'Enter account details'}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6">
                {activeModal === 'ok' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                    <p className="text-sm font-medium text-orange-800 mb-1">{ru?'Шаг 1: Авторизуйтесь':'Step 1: Authorize'}</p>
                    <button onClick={handleOkOAuth} disabled={okOAuthLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg mt-2">
                      {okOAuthLoading?<Loader2 className="w-4 h-4 animate-spin"/>:'🔑'}
                      {ru?'Авторизоваться в OK.ru':'Authorize OK.ru'}
                    </button>
                    {okToken && <p className="text-xs text-green-700 mt-2 flex items-center gap-1"><Check className="w-3 h-3"/>{ru?'Авторизовано!':'Authorized!'}</p>}
                    <hr className="my-4 border-orange-200"/>
                    <p className="text-sm font-medium text-orange-800">{ru?'Шаг 2: Введите ID группы':'Step 2: Enter group ID'}</p>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{ru?'Название аккаунта':'Account name'}</label>
                  <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} autoFocus
                    placeholder={activeModal==='telegram'?'Мой Telegram канал':activeModal==='vk'?'Моя VK группа':'Группа в ОК'}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <div className="space-y-4">
                  {fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{ru?f.labelRu:f.labelEn}</label>
                      <input type="text" value={manualFields[f.key]||''} onChange={e => setManualFields(p => ({...p,[f.key]:e.target.value}))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
                    </div>
                  ))}
                </div>
                {manualError && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{manualError}</div>}
                <div className="flex gap-3 mt-6">
                  <button onClick={closeModal} className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">{ru?'Отмена':'Cancel'}</button>
                  <button onClick={saveManualAccount} disabled={manualSaving}
                    className="flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-colors"
                    style={{backgroundColor: activeModal==='telegram'?'#0284c7':activeModal==='vk'?'#1d4ed8':'#ea580c'}}>
                    {manualSaving && <Loader2 className="w-4 h-4 animate-spin"/>}
                    <Send className="w-4 h-4"/>
                    {ru?'Подключить':'Connect'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Info */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
        <h3 className="font-semibold text-blue-900 mb-2 text-sm">{ru?'Redirect URI для OAuth':'OAuth Redirect URI'}</h3>
        <code className="block bg-white px-3 py-2 rounded-lg text-xs font-mono text-blue-800 border border-blue-200 break-all">{callbackUrl}</code>
        <p className="text-xs text-blue-600 mt-2">{ru?'Добавьте этот URL в настройки приложения на каждой платформе':'Add this URL to app settings on each platform'}</p>
      </div>
    </div>
  );
}
