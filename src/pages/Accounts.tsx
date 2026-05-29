import { useEffect, useState } from 'react';
import { Trash2, ToggleLeft, ToggleRight, LogIn, CheckCircle, XCircle, Loader2, X, Plus, Send, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Platform, SocialAccount } from '../types';

// ─── Платформы ────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'telegram' as Platform, label: 'Telegram',      icon: '✈️', color:'text-sky-700',    bg:'bg-sky-50',    border:'border-sky-200',   type:'manual' as const },
  { id: 'vk'       as Platform, label: 'ВКонтакте',     icon: '🔵', color:'text-blue-700',   bg:'bg-blue-50',   border:'border-blue-200',  type:'manual' as const },
  { id: 'ok'       as Platform, label: 'Одноклассники', icon: '🟠', color:'text-orange-700', bg:'bg-orange-50', border:'border-orange-200',type:'oauth'  as const, envKey:'VITE_OK_APP_KEY' },
  { id: 'instagram'as Platform, label: 'Instagram',     icon: '📸', color:'text-pink-700',   bg:'bg-pink-50',   border:'border-pink-200',  type:'oauth'  as const, envKey:'VITE_INSTAGRAM_APP_ID' },
  { id: 'facebook' as Platform, label: 'Facebook',      icon: '📘', color:'text-blue-700',   bg:'bg-blue-50',   border:'border-blue-200',  type:'oauth'  as const, envKey:'VITE_FACEBOOK_APP_ID' },
  { id: 'youtube'  as Platform, label: 'YouTube',       icon: '▶️', color:'text-red-700',    bg:'bg-red-50',    border:'border-red-200',   type:'oauth'  as const, envKey:'VITE_YOUTUBE_CLIENT_ID' },
  { id: 'twitter'  as Platform, label: 'Twitter / X',   icon: '𝕏',  color:'text-gray-800',   bg:'bg-gray-100',  border:'border-gray-200',  type:'oauth'  as const, envKey:'VITE_TWITTER_API_KEY' },
  { id: 'linkedin' as Platform, label: 'LinkedIn',      icon: '💼', color:'text-blue-800',   bg:'bg-blue-50',   border:'border-blue-200',  type:'oauth'  as const, envKey:'VITE_LINKEDIN_APP_ID' },
  { id: 'tiktok'   as Platform, label: 'TikTok',        icon: '🎵', color:'text-gray-900',   bg:'bg-gray-100',  border:'border-gray-200',  type:'oauth'  as const, envKey:'VITE_TIKTOK_CLIENT_KEY' },
];

// Платформы которые поддерживают несколько групп/страниц
const MULTI_GROUP_PLATFORMS = ['telegram', 'vk', 'ok'];

const OAUTH_URLS: Record<string, { authUrl: string; scopes: string[]; sep: string }> = {
  ok: { authUrl: 'https://connect.ok.ru/oauth/authorize', scopes: ['VALUABLE_ACCESS','GROUP_CONTENT','LONG_ACCESS_TOKEN','PHOTO_CONTENT'], sep: ';' },
  instagram: { authUrl: 'https://www.facebook.com/v19.0/dialog/oauth', scopes: ['email','public_profile','pages_show_list','pages_read_engagement','instagram_basic','instagram_content_publish'], sep: ',' },
  facebook:  { authUrl: 'https://www.facebook.com/v19.0/dialog/oauth', scopes: ['email','public_profile','pages_show_list','pages_manage_posts','pages_read_engagement'], sep: ',' },
  twitter:   { authUrl: 'https://twitter.com/i/oauth2/authorize', scopes: ['tweet.write','tweet.read','users.read'], sep: ' ' },
  linkedin:  { authUrl: 'https://www.linkedin.com/oauth/v2/authorization', scopes: ['w_member_social','r_liteprofile'], sep: ',' },
  tiktok:    { authUrl: 'https://www.tiktok.com/oauth/authorize', scopes: ['video.publish','video.list'], sep: ',' },
  youtube:   { authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: ['https://www.googleapis.com/auth/youtube.upload','https://www.googleapis.com/auth/youtube.readonly'], sep: ' ' },
};

// Поля для ручного добавления
type FieldDef = { key: string; labelRu: string; labelEn: string; hint?: string; isGroup?: boolean };
const MANUAL_FIELDS: Record<string, FieldDef[]> = {
  telegram: [
    { key: 'bot_token',  labelRu: 'Bot Token',  labelEn: 'Bot Token',  hint: 'Получить у @BotFather' },
    { key: 'channel_id', labelRu: 'ID канала',  labelEn: 'Channel ID', hint: '@username или -100xxxxxxxxxx', isGroup: true },
  ],
  vk: [
    { key: 'token',    labelRu: 'Access Token', labelEn: 'Access Token', hint: 'Группа → Управление → API → создать ключ' },
    { key: 'group_id', labelRu: 'ID группы',   labelEn: 'Group ID',    hint: 'Числовой ID из URL (без минуса)', isGroup: true },
  ],
};

// Поля для добавления группы к OK-аккаунту
const OK_GROUP_FIELD: FieldDef = { key: 'group_id', labelRu: 'ID группы в OK.ru', labelEn: 'OK.ru Group ID', hint: 'ok.ru/group/XXXXXXXXX', isGroup: true };

type TestStatus = 'idle'|'loading'|'ok'|'error';

// Тип расширенного аккаунта с группами
interface AccountWithGroups extends SocialAccount {
  groups?: SocialAccount[]; // дочерние группы
  parentId?: string; // если это группа — id родительского аккаунта
}

export default function Accounts() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ru = language === 'ru';

  const [accounts, setAccounts]       = useState<SocialAccount[]>([]);
  const [loading, setLoading]         = useState(true);
  const [connecting, setConnecting]   = useState<Platform|null>(null);
  const [error, setError]             = useState('');
  const [successMsg, setSuccessMsg]   = useState('');

  // Форма добавления нового аккаунта
  const [showAddModal, setShowAddModal] = useState<Platform|null>(null);
  const [addName, setAddName]           = useState('');
  const [addFields, setAddFields]       = useState<Record<string,string>>({});
  const [addSaving, setAddSaving]       = useState(false);
  const [addError, setAddError]         = useState('');

  // Форма добавления группы к существующему аккаунту
  const [showGroupModal, setShowGroupModal] = useState<SocialAccount|null>(null);
  const [groupName, setGroupName]           = useState('');
  const [groupId, setGroupId]               = useState('');
  const [groupSaving, setGroupSaving]       = useState(false);
  const [groupError, setGroupError]         = useState('');

  // Развёрнутые аккаунты (показывают группы)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Тест соединения
  const [testStatuses, setTestStatuses] = useState<Record<string,TestStatus>>({});
  const [testMessages, setTestMessages] = useState<Record<string,string>>({});

  const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const callbackUrl    = `${supabaseUrl}/functions/v1/oauth-callback`;

  useEffect(() => { if (user) { fetchAccounts(); handleOAuthReturn(); } }, [user]);

  async function fetchAccounts() {
    const { data } = await supabase.from('social_accounts').select('*').eq('user_id', user!.id).order('connected_at', { ascending: true });
    setAccounts(data ?? []);
    setLoading(false);
  }

  function handleOAuthReturn() {
    const p = new URLSearchParams(window.location.search);
    if (p.get('success') === 'true') {
      const pl = p.get('platform') || '';
      const needGroup = p.get('need_group') === 'true';
      if (needGroup) {
        setSuccessMsg(ru ? `✅ ${pl} авторизован! Теперь добавьте группу.` : `✅ ${pl} authorized! Now add a group.`);
        setTimeout(fetchAccounts, 800);
      } else {
        setSuccessMsg(ru ? `✅ ${pl} подключён!` : `✅ ${pl} connected!`);
        setTimeout(fetchAccounts, 800);
      }
      setTimeout(() => setSuccessMsg(''), 6000);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (p.get('error')) {
      const msg = decodeURIComponent(p.get('error') || '').replace(/\+/g, ' ');
      setError(msg); setTimeout(() => setError(''), 10000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // OAuth redirect
  function initiateOAuth(platform: Platform) {
    if (!user) return;
    const pl = PLATFORMS.find(p => p.id === platform);
    const clientId = pl?.envKey ? (import.meta.env[pl.envKey] || '') : '';
    if (!clientId) { setError(ru ? `${pl?.label}: ключ не настроен в Vercel env (${pl?.envKey})` : `${pl?.label}: key not set in Vercel env (${pl?.envKey})`); return; }
    setConnecting(platform);
    const oauthCfg = OAUTH_URLS[platform];
    const state = btoa(JSON.stringify({ userId: user.id, platform, redirectUrl: window.location.origin }));
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: callbackUrl, response_type: 'code', state, scope: oauthCfg.scopes.join(oauthCfg.sep) });
    if (platform === 'youtube') params.set('access_type', 'offline');
    window.location.href = `${oauthCfg.authUrl}?${params}`;
  }

  // Сохранить ручной аккаунт (TG/VK)
  async function saveManualAccount() {
    const platform = showAddModal!;
    if (!addName.trim()) { setAddError(ru?'Введите название':'Enter name'); return; }
    const fields = MANUAL_FIELDS[platform] || [];
    for (const f of fields) {
      if (!addFields[f.key]?.trim()) { setAddError(ru?`Заполните «${f.labelRu}»`:`Fill "${f.labelEn}"`); return; }
    }
    setAddSaving(true); setAddError('');
    const creds: Record<string,string> = { ...addFields };
    const { data, error: dbErr } = await supabase.from('social_accounts').insert({
      user_id: user!.id, platform,
      account_name:   addName.trim(),
      account_handle: addFields.channel_id || addFields.group_id || '',
      followers_count: 0, is_active: true, credentials: creds,
    }).select().maybeSingle();
    setAddSaving(false);
    if (dbErr) { setAddError(dbErr.message); return; }
    if (data) setAccounts(prev => [...prev, data]);
    setShowAddModal(null); setAddName(''); setAddFields('');
    setSuccessMsg(ru?'✅ Аккаунт добавлен!':'✅ Account added!');
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  // Добавить группу к аккаунту OK (после OAuth)
  async function addGroupToAccount() {
    const acc = showGroupModal!;
    if (!groupName.trim()) { setGroupError(ru?'Введите название группы':'Enter group name'); return; }
    if (!groupId.trim())   { setGroupError(ru?'Введите ID группы':'Enter group ID'); return; }
    if (isNaN(Number(groupId.replace(/^-/,'')))) { setGroupError(ru?'ID должен быть числом':'ID must be a number'); return; }

    setGroupSaving(true); setGroupError('');

    // Копируем аккаунт но с другим group_id — создаём "дочерний" аккаунт
    const parentCreds = (acc as any).credentials || {};
    const { data, error: dbErr } = await supabase.from('social_accounts').insert({
      user_id: user!.id,
      platform: acc.platform,
      account_name:   groupName.trim(),
      account_handle: groupId.trim(),
      followers_count: 0,
      is_active: true,
      access_token: acc.access_token || (acc as any).access_token || '',
      credentials: {
        ...parentCreds,
        group_id:     groupId.trim().replace(/^-/,''),
        access_token: acc.access_token || parentCreds.access_token || '',
        parent_account_id: acc.id, // ссылка на родительский аккаунт
      },
    }).select().maybeSingle();

    setGroupSaving(false);
    if (dbErr) { setGroupError(dbErr.message); return; }
    if (data) setAccounts(prev => [...prev, data]);
    setShowGroupModal(null); setGroupName(''); setGroupId('');
    setSuccessMsg(ru?'✅ Группа добавлена!':'✅ Group added!');
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

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  // Группируем: главные аккаунты + их дочерние группы
  const childIds = new Set(
    accounts.filter(a => (a as any).credentials?.parent_account_id).map(a => (a as any).credentials.parent_account_id)
  );
  // Основные аккаунты — те у кого нет parent_account_id в credentials
  const mainAccounts = accounts.filter(a => !(a as any).credentials?.parent_account_id);
  // Получить дочерние группы для аккаунта
  const getChildren = (parentId: string) => accounts.filter(a => (a as any).credentials?.parent_account_id === parentId);

  const connectedPlatforms = new Set(mainAccounts.map(a => a.platform));

  return (
    <div className="p-6 max-w-6xl">
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-3">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="w-4 h-4"/></button>
        </div>
      )}
      {successMsg && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{successMsg}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{ru?'Социальные сети':'Social Networks'}</h2>
          <p className="text-sm text-gray-500">{mainAccounts.length} {ru?'подключено':'connected'} · {accounts.length} {ru?'аккаунтов всего':'accounts total'}</p>
        </div>
        <button onClick={fetchAccounts} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-4 h-4"/>
        </button>
      </div>

      {/* ── Подключённые аккаунты ── */}
      {mainAccounts.length > 0 && (
        <div className="mb-8 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{ru?'Подключённые аккаунты':'Connected accounts'}</h3>
          {mainAccounts.map(acc => {
            const pl       = PLATFORMS.find(p => p.id === acc.platform);
            const children = getChildren(acc.id);
            const isExp    = expanded.has(acc.id);
            const ts       = testStatuses[acc.id] || 'idle';
            const tm       = testMessages[acc.id] || '';
            const canAddGroup = MULTI_GROUP_PLATFORMS.includes(acc.platform);

            return (
              <div key={acc.id} className={`bg-white rounded-2xl border-2 ${pl?.border || 'border-gray-200'} overflow-hidden`}>
                {/* Main account row */}
                <div className="flex items-center gap-4 p-4">
                  <div className={`w-10 h-10 rounded-xl ${pl?.bg} flex items-center justify-center text-xl flex-shrink-0`}>
                    {pl?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{acc.account_name}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pl?.bg} ${pl?.color}`}>{pl?.label}</span>
                      <div className={`flex items-center gap-1 text-xs ${acc.is_active?'text-green-600':'text-gray-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${acc.is_active?'bg-green-400':'bg-gray-300'}`}/>
                        {acc.is_active?(ru?'Активен':'Active'):(ru?'Выкл':'Off')}
                      </div>
                    </div>
                    {acc.account_handle && <p className="text-xs text-gray-400 truncate">{acc.account_handle}</p>}
                    {acc.followers_count > 0 && <p className="text-xs text-gray-400">{acc.followers_count.toLocaleString()} {ru?'подписчиков':'followers'}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canAddGroup && (
                      <button onClick={() => { setShowGroupModal(acc); setGroupName(''); setGroupId(''); setGroupError(''); }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border ${pl?.bg} ${pl?.color} ${pl?.border} hover:opacity-80 transition-opacity`}
                        title={ru?'Добавить группу/канал':'Add group/channel'}>
                        <Plus className="w-3 h-3"/>
                        {ru?'Группа':'Group'}
                      </button>
                    )}
                    {children.length > 0 && (
                      <button onClick={() => toggleExpand(acc.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                        {isExp ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </button>
                    )}
                    <button onClick={() => toggleActive(acc.id, acc.is_active)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                      {acc.is_active ? <ToggleRight className="w-5 h-5 text-blue-600"/> : <ToggleLeft className="w-5 h-5"/>}
                    </button>
                    <button onClick={() => deleteAccount(acc.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                {/* Test result */}
                {tm && (
                  <div className={`mx-4 mb-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2 ${ts==='ok'?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>
                    {ts==='ok'?<CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>:<XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/>}
                    {tm}
                  </div>
                )}

                {/* Test button */}
                <div className="px-4 pb-4">
                  <button onClick={() => testConnection(acc)} disabled={ts==='loading'}
                    className="flex items-center justify-center gap-2 py-1.5 px-4 border border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                    {ts==='loading'?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:ts==='ok'?<CheckCircle className="w-3.5 h-3.5 text-green-500"/>:ts==='error'?<XCircle className="w-3.5 h-3.5 text-red-500"/>:null}
                    {ru?'Проверить соединение':'Test connection'}
                  </button>
                </div>

                {/* Children groups */}
                {(isExp || children.length > 0) && children.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50">
                    <div className="px-4 py-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {ru?`Группы и каналы (${children.length})`:`Groups & channels (${children.length})`}
                      </p>
                      <div className="space-y-2">
                        {children.map(child => {
                          const cts = testStatuses[child.id] || 'idle';
                          const ctm = testMessages[child.id] || '';
                          return (
                            <div key={child.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-gray-200">
                              <div className={`w-7 h-7 rounded-lg ${pl?.bg} flex items-center justify-center text-sm flex-shrink-0`}>{pl?.icon}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{child.account_name}</p>
                                <p className="text-xs text-gray-400 truncate">{child.account_handle}</p>
                                {ctm && (
                                  <p className={`text-xs mt-0.5 ${cts==='ok'?'text-green-600':'text-red-500'}`}>{ctm}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => testConnection(child)} disabled={cts==='loading'}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100 disabled:opacity-50">
                                  {cts==='loading'?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:cts==='ok'?<CheckCircle className="w-3.5 h-3.5 text-green-500"/>:cts==='error'?<XCircle className="w-3.5 h-3.5 text-red-500"/>:<CheckCircle className="w-3.5 h-3.5 text-gray-300"/>}
                                </button>
                                <button onClick={() => toggleActive(child.id, child.is_active)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100">
                                  {child.is_active?<ToggleRight className="w-4 h-4 text-blue-500"/>:<ToggleLeft className="w-4 h-4"/>}
                                </button>
                                <button onClick={() => deleteAccount(child.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
                                  <Trash2 className="w-3.5 h-3.5"/>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Подключить новые платформы ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{ru?'Подключить аккаунт':'Connect account'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PLATFORMS.map(platform => {
            const isConnected = connectedPlatforms.has(platform.id);
            const clientId    = platform.envKey ? (import.meta.env[platform.envKey] || '') : null;
            const configured  = platform.type === 'oauth' ? !!clientId : true;

            return (
              <div key={platform.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${isConnected ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className={`w-10 h-10 rounded-xl ${platform.bg} flex items-center justify-center text-xl flex-shrink-0`}>{platform.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{platform.label}</p>
                  <p className="text-xs text-gray-400">{isConnected ? (ru?'Подключён':'Connected') : (configured ? (ru?'Не подключён':'Not connected') : (ru?'Нет ключа в Vercel':'No key in Vercel'))}</p>
                </div>
                {!isConnected && (
                  configured ? (
                    <button
                      onClick={() => platform.type === 'manual' ? setShowAddModal(platform.id) : initiateOAuth(platform.id)}
                      disabled={connecting === platform.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border ${platform.bg} ${platform.color} ${platform.border} hover:opacity-80 disabled:opacity-50 flex-shrink-0`}>
                      {connecting === platform.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
                      {ru?'Добавить':'Add'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 flex-shrink-0">{ru?'Нет ключа':'No key'}</span>
                  )
                )}
                {isConnected && (
                  <button
                    onClick={() => platform.type === 'manual' ? setShowAddModal(platform.id) : initiateOAuth(platform.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${platform.bg} ${platform.color} ${platform.border} hover:opacity-80 flex-shrink-0`}>
                    <Plus className="w-3 h-3"/>
                    {ru?'Ещё':'More'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Redirect URI info */}
      <div className="mt-6 bg-blue-50 rounded-xl border border-blue-100 p-4">
        <p className="text-xs font-semibold text-blue-700 mb-1">Redirect URI для OAuth:</p>
        <code className="text-xs font-mono text-blue-800 break-all">{callbackUrl}</code>
      </div>

      {/* ── Modal: добавить TG/VK аккаунт ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(null); setAddError(''); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {(() => {
              const pl     = PLATFORMS.find(p => p.id === showAddModal)!;
              const fields = MANUAL_FIELDS[showAddModal] || [];
              return (
                <>
                  <div className={`${pl.bg} rounded-t-2xl px-5 py-4 flex items-center justify-between border-b ${pl.border}`}>
                    <div className="flex items-center gap-3"><span className="text-2xl">{pl.icon}</span><h3 className="font-bold text-gray-900">{ru?`Подключить ${pl.label}`:`Connect ${pl.label}`}</h3></div>
                    <button onClick={() => { setShowAddModal(null); setAddError(''); }}><X className="w-5 h-5 text-gray-400"/></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{ru?'Название':'Name'}</label>
                      <input type="text" value={addName} onChange={e => setAddName(e.target.value)} autoFocus
                        placeholder={showAddModal==='telegram'?'Мой канал':showAddModal==='vk'?'Моя группа':'Название'}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    {fields.map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{ru?f.labelRu:f.labelEn}</label>
                        <input type="text" value={addFields[f.key]||''} onChange={e => setAddFields(p => ({...p,[f.key]:e.target.value}))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
                      </div>
                    ))}
                    {addError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{addError}</div>}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { setShowAddModal(null); setAddError(''); setAddName(''); setAddFields({}); }} className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">{ru?'Отмена':'Cancel'}</button>
                      <button onClick={saveManualAccount} disabled={addSaving}
                        className="flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2"
                        style={{backgroundColor: showAddModal==='telegram'?'#0284c7':'#1d4ed8'}}>
                        {addSaving && <Loader2 className="w-4 h-4 animate-spin"/>}
                        <Send className="w-4 h-4"/>
                        {ru?'Подключить':'Connect'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Modal: добавить группу к OK-аккаунту ── */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setShowGroupModal(null); setGroupError(''); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {(() => {
              const pl  = PLATFORMS.find(p => p.id === showGroupModal.platform)!;
              const acc = showGroupModal;
              return (
                <>
                  <div className={`${pl.bg} rounded-t-2xl px-5 py-4 flex items-center justify-between border-b ${pl.border}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pl.icon}</span>
                      <div>
                        <h3 className="font-bold text-gray-900">{ru?'Добавить группу / канал':'Add group / channel'}</h3>
                        <p className="text-xs text-gray-500">{acc.account_name}</p>
                      </div>
                    </div>
                    <button onClick={() => { setShowGroupModal(null); setGroupError(''); }}><X className="w-5 h-5 text-gray-400"/></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
                      {ru
                        ? `Вы можете добавить несколько групп/каналов к аккаунту "${acc.account_name}". Каждая группа будет доступна отдельно при публикации постов.`
                        : `You can add multiple groups/channels to "${acc.account_name}". Each group will be available separately when publishing posts.`}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{ru?'Название группы / канала':'Group / channel name'}</label>
                      <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus
                        placeholder={acc.platform==='telegram'?'Мой канал недвижимости':acc.platform==='vk'?'Группа ВКонтакте':'Группа в ОК'}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                        {acc.platform==='telegram'?(ru?'ID канала':'Channel ID'):acc.platform==='vk'?(ru?'ID группы':'Group ID'):(ru?'ID группы OK.ru':'OK.ru Group ID')}
                      </label>
                      <input type="text" value={groupId} onChange={e => setGroupId(e.target.value)}
                        placeholder={acc.platform==='telegram'?'-1001234567890 или @myhandle':'237728812'}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      <p className="text-xs text-gray-400 mt-1">
                        {acc.platform==='telegram'?'@username или -100xxxxxxxxxx':acc.platform==='vk'?'Числовой ID из URL группы (без минуса)':'ok.ru/group/XXXXXXXXX'}
                      </p>
                    </div>
                    {groupError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{groupError}</div>}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => { setShowGroupModal(null); setGroupError(''); setGroupName(''); setGroupId(''); }} className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">{ru?'Отмена':'Cancel'}</button>
                      <button onClick={addGroupToAccount} disabled={groupSaving}
                        className="flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
                        {groupSaving && <Loader2 className="w-4 h-4 animate-spin"/>}
                        <Plus className="w-4 h-4"/>
                        {ru?'Добавить группу':'Add group'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
