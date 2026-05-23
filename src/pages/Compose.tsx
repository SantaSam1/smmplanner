import { useEffect, useState, useRef } from 'react';
import { Clock, Send, Save, Sparkles, X, CheckSquare, Square, AlertCircle, Loader2, CheckCircle, XCircle, Upload, Link, Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Platform, SocialAccount } from '../types';
import { platformConfig } from '../components/PlatformBadge';
import { Page } from '../types';

interface ComposeProps { onNavigate: (page: Page) => void; }

const ALL_PLATFORMS: Platform[] = ['instagram','facebook','twitter','linkedin','tiktok','youtube','telegram','vk','ok'];

function toDirectUrl(url: string) {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
}

// Загрузка файла в Supabase Storage
async function uploadFileToStorage(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error || !data) return null;
  const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
  return urlData.publicUrl;
}

export default function Compose({ onNavigate }: ComposeProps) {
  const { user, session } = useAuth();
  const { t, language } = useLanguage();
  const c = t.compose;
  const ru = language === 'ru';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accounts, setAccounts]     = useState<SocialAccount[]>([]);
  const [content, setContent]       = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState<'now'|'later'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [saving, setSaving]         = useState(false);
  const [success, setSuccess]       = useState('');
  const [error, setError]           = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [mediaUrls, setMediaUrls]   = useState<string[]>([]);
  const [videoUrl, setVideoUrl]     = useState('');
  const [urlInput, setUrlInput]     = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [publishResults, setPublishResults] = useState<{id: string; name: string; platform: string; status: 'pending'|'success'|'error'; message?: string}[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const charLimit = selectedPlatforms.includes('twitter') ? 280 : selectedPlatforms.includes('telegram') ? 4096 : 2200;
  const hasYoutube = selectedPlatforms.includes('youtube');

  useEffect(() => {
    if (!user) return;
    supabase.from('social_accounts').select('*').eq('user_id', user.id).eq('is_active', true)
      .then(({ data }) => setAccounts(data ?? []));
  }, [user]);

  function togglePlatform(p: Platform) {
    const next = selectedPlatforms.includes(p) ? selectedPlatforms.filter(x => x !== p) : [...selectedPlatforms, p];
    setSelectedPlatforms(next);
    if (!selectedPlatforms.includes(p)) {
      const ids = accounts.filter(a => a.platform === p).map(a => a.id);
      setSelectedAccountIds(prev => [...new Set([...prev, ...ids])]);
    }
  }

  function toggleAccount(id: string) {
    setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function generateCaption() {
    setAiLoading(true);
    setTimeout(() => { setContent(c.captions[Math.floor(Math.random() * c.captions.length)]); setAiLoading(false); }, 800);
  }

  function addFromUrl() {
    if (!urlInput.trim()) return;
    setMediaUrls(prev => [...prev, toDirectUrl(urlInput.trim())]);
    setUrlInput('');
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !user) return;
    setUploadingFile(true);
    setError('');
    for (const file of Array.from(files)) {
      if (file.size > 50 * 1024 * 1024) {
        setError(ru ? `Файл ${file.name} больше 50МБ` : `File ${file.name} exceeds 50MB`);
        continue;
      }
      const url = await uploadFileToStorage(file, user.id);
      if (url) {
        setMediaUrls(prev => [...prev, url]);
      } else {
        // Fallback: create object URL for preview
        const objUrl = URL.createObjectURL(file);
        setMediaUrls(prev => [...prev, objUrl]);
      }
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function savePost(status: 'draft'|'scheduled') {
    if (!content.trim()) { setError(c.contentRequired); return; }
    if (selectedPlatforms.length === 0) { setError(c.platformRequired); return; }
    if (status === 'scheduled') {
      if (!scheduledDate) { setError(c.dateRequired); return; }
      if (selectedAccountIds.length === 0) { setError(c.accountRequired); return; }
    }
    setSaving(true); setError('');
    const scheduledAt = status === 'scheduled' && scheduledDate
      ? new Date(`${scheduledDate}T${scheduledTime||'09:00'}`).toISOString()
      : null;
    const allMedia = videoUrl ? [...mediaUrls, videoUrl] : mediaUrls;
    const { error: dbErr } = await supabase.from('posts').insert({
      user_id: user!.id, content, platforms: selectedPlatforms,
      account_ids: selectedAccountIds, status, scheduled_at: scheduledAt,
      media_urls: allMedia.map(toDirectUrl),
    });
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSuccess(status === 'draft' ? c.postSaved : c.postScheduled);
    setTimeout(() => { setSuccess(''); onNavigate('posts'); }, 1500);
  }

  async function publishNow() {
    if (!content.trim()) { setError(c.contentRequired); return; }
    if (selectedPlatforms.length === 0) { setError(c.platformRequired); return; }
    if (selectedAccountIds.length === 0) { setError(c.accountRequired); return; }
    if (hasYoutube && !videoUrl) {
      setError(ru ? 'Для YouTube укажите ссылку на видео' : 'For YouTube, provide a video URL');
      return;
    }

    setPublishing(true); setError('');
    const allMedia = videoUrl ? [...mediaUrls, videoUrl] : mediaUrls;
    const results: typeof publishResults = selectedAccountIds.map(id => {
      const acc = accounts.find(a => a.id === id);
      return { id, name: acc?.account_name || id, platform: acc?.platform || '', status: 'pending' };
    });
    setPublishResults(results);
    setShowResults(true);

    const { data: newPost, error: dbErr } = await supabase.from('posts').insert({
      user_id: user!.id, content, platforms: selectedPlatforms,
      account_ids: selectedAccountIds, status: 'scheduled', scheduled_at: null,
      media_urls: allMedia.map(toDirectUrl),
    }).select().maybeSingle();
    if (dbErr || !newPost) { setError(dbErr?.message || 'DB error'); setPublishing(false); return; }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    for (const accountId of selectedAccountIds) {
      const acc = accounts.find(a => a.id === accountId);
      if (!acc) continue;
      setPublishResults(prev => prev.map(r => r.id === accountId ? { ...r, status: 'pending' } : r));
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/publish-post`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: newPost.id, accountId, platform: acc.platform,
            content, mediaUrls: allMedia, videoUrl: videoUrl || undefined,
          }),
        });
        const result = await resp.json();
        const ok = resp.ok && result.ok;
        setPublishResults(prev => prev.map(r =>
          r.id === accountId ? { ...r, status: ok ? 'success' : 'error', message: result.message || result.error } : r
        ));
      } catch (e: any) {
        setPublishResults(prev => prev.map(r =>
          r.id === accountId ? { ...r, status: 'error', message: e.message } : r
        ));
      }
    }
    setPublishing(false);
  }

  const preview = accounts.find(a => selectedAccountIds.includes(a.id));
  const allDone = publishResults.length > 0 && publishResults.every(r => r.status !== 'pending');

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Platform selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{c.selectPlatforms}</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_PLATFORMS.map(p => {
                const cfg = platformConfig[p];
                const sel = selectedPlatforms.includes(p);
                const has = accounts.some(a => a.platform === p);
                return (
                  <button key={p} onClick={() => togglePlatform(p)} disabled={!has}
                    title={!has ? (ru?`Нет аккаунта ${cfg.label}`:`No ${cfg.label} account`) : ''}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      sel ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            {accounts.length === 0 && (
              <p className="text-xs text-amber-600 mt-3">
                {ru ? 'Нет аккаунтов. ' : 'No accounts. '}
                <button onClick={() => onNavigate('accounts')} className="underline font-medium">{c.goToAccounts}</button>
              </p>
            )}
          </div>

          {/* Account selector */}
          {accounts.length > 0 && selectedPlatforms.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{c.chooseAccounts}</h3>
              <div className="grid grid-cols-2 gap-2">
                {accounts.filter(a => selectedPlatforms.includes(a.platform)).map(acc => {
                  const sel = selectedAccountIds.includes(acc.id);
                  return (
                    <button key={acc.id} onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left ${
                        sel ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      {sel ? <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{acc.account_name}</p>
                        <p className="text-xs text-gray-400">{platformConfig[acc.platform]?.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{c.postContent}</h3>
              <button onClick={generateCaption} disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200">
                <Sparkles className="w-3.5 h-3.5" />
                {aiLoading ? c.generating : c.aiCaption}
              </button>
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={c.contentPlaceholder} rows={6}
              className="w-full text-sm text-gray-900 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-400">{content.length} {ru?'симв.':'chars'}</span>
              <span className={`text-xs font-medium ${content.length > charLimit ? 'text-red-500' : 'text-gray-400'}`}>
                {charLimit - content.length} {ru?'осталось':'left'}
              </span>
            </div>
          </div>

          {/* Media upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{c.media}</h3>

            {/* Upload from computer */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-4 text-center cursor-pointer transition-colors mb-3 group"
            >
              {uploadingFile ? (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">{ru ? 'Загружаю...' : 'Uploading...'}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 group-hover:text-blue-500 mx-auto mb-1.5 transition-colors" />
                  <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">
                    {ru ? 'Нажмите чтобы выбрать файлы' : 'Click to select files'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ru ? 'JPG, PNG, GIF, MP4 — до 50МБ' : 'JPG, PNG, GIF, MP4 — up to 50MB'}
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Add from URL */}
            <div className="flex gap-2 mb-3">
              <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder={ru ? 'Или вставьте URL изображения / Google Drive' : 'Or paste image URL / Google Drive link'}
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && addFromUrl()} />
              <button onClick={addFromUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg flex-shrink-0">
                <Link className="w-4 h-4" />
                {ru ? 'Добавить' : 'Add'}
              </button>
            </div>

            {/* YouTube video URL */}
            {hasYoutube && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Film className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">
                    {ru ? 'YouTube — ссылка на видео' : 'YouTube — video URL'}
                  </span>
                  <span className="text-xs text-red-500">*{ru?'обязательно':'required'}</span>
                </div>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... или https://youtu.be/..."
                  className="w-full text-sm px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                />
                <p className="text-xs text-red-500 mt-1">
                  {ru
                    ? 'YouTube API требует прямую ссылку на видеофайл или YouTube URL для публикации'
                    : 'YouTube API requires a direct video file URL or YouTube URL to publish'}
                </p>
              </div>
            )}

            {/* Media preview */}
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {mediaUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover" onError={e => {
                      (e.target as HTMLImageElement).style.display='none';
                    }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <button onClick={() => setMediaUrls(p => p.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{c.scheduling}</h3>
            <div className="flex gap-2 mb-4">
              {(['now','later'] as const).map(m => (
                <button key={m} onClick={() => setScheduleMode(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    scheduleMode===m ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>
                  {m==='now' ? c.publishNow : c.scheduleLater}
                </button>
              ))}
            </div>
            {scheduleMode==='later' && (
              <>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">{c.date}</label>
                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">{c.time}</label>
                    <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  ⏰ {ru
                    ? 'Автоматическая публикация запланированных постов требует отдельного cron-сервиса. Пока посты сохраняются со статусом "Запланирован" и публикуются вручную.'
                    : 'Auto-publishing scheduled posts requires a separate cron service. Posts are saved as "Scheduled" and published manually for now.'}
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
              ✅ {success}
            </div>
          )}

          {/* Publish results */}
          {showResults && publishResults.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{c.publishingStatus}</h3>
                {allDone && (
                  <button onClick={() => onNavigate('posts')}
                    className="text-xs text-blue-600 hover:underline font-medium">
                    {ru ? 'Перейти к постам →' : 'Go to posts →'}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {publishResults.map(r => (
                  <div key={r.id} className="flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 mt-0.5">
                      {r.status==='pending' && <Loader2 className="w-4 h-4 animate-spin text-amber-500"/>}
                      {r.status==='success' && <CheckCircle className="w-4 h-4 text-green-500"/>}
                      {r.status==='error'   && <XCircle className="w-4 h-4 text-red-500"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900">{r.name}</span>
                      <span className="text-gray-400 text-xs ml-2">{platformConfig[r.platform as Platform]?.label || r.platform}</span>
                      {r.message && (
                        <p className={`text-xs mt-0.5 ${r.status==='error' ? 'text-red-500' : 'text-green-600'}`}>
                          {r.message}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ${
                      r.status==='success' ? 'text-green-600' : r.status==='error' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {r.status==='pending' ? (c.publishing) : r.status==='success' ? (ru?'Готово':'Done') : (ru?'Ошибка':'Failed')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => savePost('draft')} disabled={saving||publishing}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-lg disabled:opacity-50 flex-shrink-0">
              <Save className="w-4 h-4" /> {c.saveDraft}
            </button>
            {scheduleMode==='later' ? (
              <button onClick={() => savePost('scheduled')} disabled={saving||publishing}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm rounded-lg flex-1 justify-center">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Clock className="w-4 h-4"/>}
                {saving ? (ru?'Сохраняю...':'Saving...') : c.schedulePost}
              </button>
            ) : (
              <button onClick={publishNow} disabled={saving||publishing||selectedAccountIds.length===0}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold text-sm rounded-lg flex-1 justify-center">
                {publishing ? <><Loader2 className="w-4 h-4 animate-spin"/>{c.publishing}</> : <><Send className="w-4 h-4"/>{c.publishPost}</>}
              </button>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{c.preview}</h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center gap-2 border-b border-gray-100">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{preview?.account_name?.[0]?.toUpperCase() ?? 'A'}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{preview?.account_name ?? (ru?'Аккаунт':'Account')}</p>
                  <p className="text-xs text-gray-400">{preview ? platformConfig[preview.platform]?.label : (ru?'платформа':'platform')}</p>
                </div>
              </div>
              {mediaUrls[0] && <img src={mediaUrls[0]} alt="" className="w-full aspect-video object-cover" />}
              <div className="p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
                  {content || <span className="text-gray-400 italic">{ru?'Текст поста...':'Post text...'}</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{c.tips}</h3>
            <ul className="space-y-2 text-xs text-gray-500">
              {c.tipsList.map((tip, i) => <li key={i} className="flex gap-2"><span className="text-blue-500 font-bold">•</span>{tip}</li>)}
            </ul>
          </div>

          {/* Char limits */}
          {selectedPlatforms.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {ru?'Лимиты символов':'Char limits'}
              </h3>
              <div className="space-y-2">
                {selectedPlatforms.map(p => {
                  const lim = p==='twitter'?280:p==='telegram'?4096:2200;
                  const pct = Math.min(100, (content.length/lim)*100);
                  return (
                    <div key={p}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">{platformConfig[p]?.label}</span>
                        <span className={content.length>lim?'text-red-500 font-semibold':'text-gray-400'}>{content.length}/{lim}</span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct>90?'bg-red-500':pct>70?'bg-amber-400':'bg-green-500'}`} style={{width:`${pct}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
