// src/pages/RssFeeds.tsx
import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight, Rss, ExternalLink, Clock, CheckCircle, XCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SocialAccount } from '../types';

interface RssFeed {
  id: string;
  name: string;
  url: string;
  account_ids: string[];
  platforms: string[];
  is_active: boolean;
  auto_publish: boolean;
  interval_hours: number;
  last_checked_at: string | null;
  last_item_guid: string | null;
  created_at: string;
}

export default function RssFeeds() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ru = language === 'ru';

  const [feeds, setFeeds]               = useState<RssFeed[]>([]);
  const [accounts, setAccounts]         = useState<SocialAccount[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [publishing, setPublishing]     = useState<string | null>(null);

  // Form state
  const [formName, setFormName]         = useState('');
  const [formUrl, setFormUrl]           = useState('');
  const [formAccounts, setFormAccounts] = useState<string[]>([]);
  const [formAuto, setFormAuto]         = useState(false);
  const [formInterval, setFormInterval] = useState(1);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (user) { fetchFeeds(); fetchAccounts(); }
  }, [user]);

  async function fetchFeeds() {
    const { data } = await supabase.from('rss_feeds').select('*')
      .eq('user_id', user!.id).order('created_at', { ascending: false });
    setFeeds(data ?? []);
    setLoading(false);
  }

  async function fetchAccounts() {
    const { data } = await supabase.from('social_accounts').select('*')
      .eq('user_id', user!.id).eq('is_active', true);
    setAccounts(data ?? []);
  }

  function resetForm() {
    setFormName(''); setFormUrl(''); setFormAccounts([]);
    setFormAuto(false); setFormInterval(1); setError('');
  }

  async function saveFeed() {
    if (!formName.trim()) { setError(ru ? 'Введите название' : 'Enter name'); return; }
    if (!formUrl.trim())  { setError(ru ? 'Введите URL RSS' : 'Enter RSS URL'); return; }
    if (!formAccounts.length) { setError(ru ? 'Выберите хотя бы один аккаунт' : 'Select at least one account'); return; }

    setSaving(true); setError('');
    const platforms = [...new Set(
      formAccounts.map(id => accounts.find(a => a.id === id)?.platform || '').filter(Boolean)
    )];

    const { error: dbErr } = await supabase.from('rss_feeds').insert({
      user_id: user!.id,
      name: formName.trim(),
      url: formUrl.trim(),
      account_ids: formAccounts,
      platforms,
      is_active: true,
      auto_publish: formAuto,
      interval_hours: formInterval,
    });

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setShowModal(false); resetForm();
    setSuccess(ru ? '✅ RSS фид добавлен!' : '✅ RSS feed added!');
    setTimeout(() => setSuccess(''), 3000);
    fetchFeeds();
  }

  async function toggleFeed(id: string, current: boolean) {
    await supabase.from('rss_feeds').update({ is_active: !current }).eq('id', id);
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, is_active: !current } : f));
  }

  async function deleteFeed(id: string) {
    if (!confirm(ru ? 'Удалить этот RSS фид?' : 'Delete this RSS feed?')) return;
    await supabase.from('rss_feeds').delete().eq('id', id);
    setFeeds(prev => prev.filter(f => f.id !== id));
  }

  async function publishNow(feedId: string) {
    setPublishing(feedId);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/smart-processor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey },
        body: JSON.stringify({ feedId, manual: true }),
      });
      const data = await res.json();
      const feed = data.results?.[0];
      if (feed?.ok) {
        const count = feed.newItems || 0;
        setSuccess(count > 0
          ? (ru ? `✅ Опубликовано ${count} новых записей` : `✅ Published ${count} new items`)
          : (ru ? 'Нет новых записей для публикации' : 'No new items to publish'));
      } else {
        setError(feed?.error || 'Error');
      }
      fetchFeeds();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPublishing(null);
      setTimeout(() => { setSuccess(''); setError(''); }, 4000);
    }
  }

  const platformEmoji: Record<string, string> = {
    telegram: '✈️', vk: '🔵', ok: '🟠', instagram: '📸',
    facebook: '📘', youtube: '▶️', twitter: '𝕏',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Rss className="w-5 h-5 text-orange-500"/>
            {ru ? 'RSS публикации' : 'RSS Publishing'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {ru ? 'Автоматически публикуйте новые записи из RSS фидов в соцсети'
                : 'Automatically publish new RSS feed items to social networks'}
          </p>
        </div>
        <button onClick={() => { setShowModal(true); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl">
          <Plus className="w-4 h-4"/>
          {ru ? 'Добавить фид' : 'Add feed'}
        </button>
      </div>

      {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}

      {/* Feed list */}
      {feeds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Rss className="w-12 h-12 text-gray-300 mx-auto mb-4"/>
          <p className="text-gray-500 font-medium">{ru ? 'Нет RSS фидов' : 'No RSS feeds'}</p>
          <p className="text-gray-400 text-sm mt-1">
            {ru ? 'Добавьте первый RSS фид для автопубликации' : 'Add your first RSS feed for auto-publishing'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map(feed => {
            const feedAccounts = accounts.filter(a => feed.account_ids.includes(a.id));
            return (
              <div key={feed.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${feed.is_active ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <Rss className={`w-5 h-5 ${feed.is_active ? 'text-orange-500' : 'text-gray-400'}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{feed.name}</p>
                      {feed.auto_publish && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          {ru ? 'Авто' : 'Auto'} · {feed.interval_hours}ч
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${feed.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {feed.is_active ? (ru ? 'Активен' : 'Active') : (ru ? 'Выкл' : 'Off')}
                      </span>
                    </div>
                    <a href={feed.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5 truncate">
                      {feed.url}
                      <ExternalLink className="w-3 h-3 flex-shrink-0"/>
                    </a>

                    {/* Accounts */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {feedAccounts.map(acc => (
                        <span key={acc.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {platformEmoji[acc.platform] || '•'} {acc.account_name}
                        </span>
                      ))}
                    </div>

                    {/* Last check */}
                    {feed.last_checked_at && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {ru ? 'Проверено: ' : 'Checked: '}
                        {new Date(feed.last_checked_at).toLocaleString(ru ? 'ru-RU' : 'en-US')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => publishNow(feed.id)} disabled={publishing === feed.id}
                      title={ru ? 'Опубликовать новые записи сейчас' : 'Publish new items now'}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50">
                      {publishing === feed.id
                        ? <Loader2 className="w-4 h-4 animate-spin"/>
                        : <RefreshCw className="w-4 h-4"/>}
                    </button>
                    <button onClick={() => toggleFeed(feed.id, feed.is_active)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100">
                      {feed.is_active
                        ? <ToggleRight className="w-5 h-5 text-blue-600"/>
                        : <ToggleLeft className="w-5 h-5"/>}
                    </button>
                    <button onClick={() => deleteFeed(feed.id)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add feed modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-orange-50 rounded-t-2xl px-5 py-4 flex items-center justify-between border-b border-orange-100">
              <div className="flex items-center gap-3">
                <Rss className="w-5 h-5 text-orange-500"/>
                <h3 className="font-bold text-gray-900">{ru ? 'Добавить RSS фид' : 'Add RSS feed'}</h3>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }}>
                <X className="w-5 h-5 text-gray-400"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {ru ? 'Название' : 'Name'}
                </label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} autoFocus
                  placeholder={ru ? 'Мой новостной сайт' : 'My news site'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  RSS URL
                </label>
                <input type="url" value={formUrl} onChange={e => setFormUrl(e.target.value)}
                  placeholder="https://example.com/rss.xml"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              {/* Accounts */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  {ru ? 'Публиковать в аккаунты' : 'Publish to accounts'}
                </label>
                {accounts.length === 0 ? (
                  <p className="text-sm text-gray-400">{ru ? 'Нет подключённых аккаунтов' : 'No connected accounts'}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {accounts.map(acc => {
                      const sel = formAccounts.includes(acc.id);
                      return (
                        <button key={acc.id} onClick={() => setFormAccounts(prev =>
                          sel ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                        )}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-sm transition-all ${
                            sel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                          <span>{platformEmoji[acc.platform] || '•'}</span>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate text-xs">{acc.account_name}</p>
                            <p className="text-gray-400 text-xs">{acc.platform}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Auto publish */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{ru ? 'Автопубликация' : 'Auto-publish'}</p>
                    <p className="text-xs text-gray-500">{ru ? 'Публиковать новые записи автоматически' : 'Automatically publish new items'}</p>
                  </div>
                  <button onClick={() => setFormAuto(!formAuto)}>
                    {formAuto
                      ? <ToggleRight className="w-8 h-8 text-blue-600"/>
                      : <ToggleLeft className="w-8 h-8 text-gray-400"/>}
                  </button>
                </div>
                {formAuto && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {ru ? 'Интервал проверки (часы)' : 'Check interval (hours)'}
                    </label>
                    <select value={formInterval} onChange={e => setFormInterval(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value={1}>1 {ru ? 'час' : 'hour'}</option>
                      <option value={2}>2 {ru ? 'часа' : 'hours'}</option>
                      <option value={4}>4 {ru ? 'часа' : 'hours'}</option>
                      <option value={6}>6 {ru ? 'часов' : 'hours'}</option>
                      <option value={12}>12 {ru ? 'часов' : 'hours'}</option>
                      <option value={24}>24 {ru ? 'часа' : 'hours'}</option>
                    </select>
                  </div>
                )}
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">
                  {ru ? 'Отмена' : 'Cancel'}
                </button>
                <button onClick={saveFeed} disabled={saving}
                  className="flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50">
                  {saving && <Loader2 className="w-4 h-4 animate-spin"/>}
                  <Rss className="w-4 h-4"/>
                  {ru ? 'Добавить фид' : 'Add feed'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
