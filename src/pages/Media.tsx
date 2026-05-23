import { useEffect, useState } from 'react';
import { Plus, Trash2, Image, Search, X, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { MediaItem } from '../types';

const STOCK = [
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/2977547/pexels-photo-2977547.jpeg?auto=compress&cs=tinysrgb&w=400',
];

function toDirectUrl(url: string) {
  const m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : url;
}

export default function Media() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const m = t.media;
  const [items, setItems]     = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [adding, setAdding]   = useState(false);
  const [selected, setSelected] = useState<string|null>(null);
  const [search, setSearch]   = useState('');
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    if (!user) return;
    supabase.from('media_library').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => { setItems(data??[]); setLoading(false); });
  }, [user]);

  async function addFromUrl() {
    if (!urlInput.trim()) return;
    setAdding(true);
    const url = toDirectUrl(urlInput.trim());
    const { data, error } = await supabase.from('media_library').insert({
      user_id: user!.id, file_name: nameInput || url.split('/').pop() || 'image',
      file_url: url, file_type: 'image', file_size: 0, width: 0, height: 0,
    }).select().maybeSingle();
    setAdding(false);
    if (!error && data) { setItems(prev => [data,...prev]); setUrlInput(''); setNameInput(''); setShowForm(false); }
  }

  async function addStock(url: string) {
    setAdding(true);
    const name = (language==='ru'?'Фото ':'Stock ') + new Date().toLocaleDateString(locale);
    const { data, error } = await supabase.from('media_library').insert({
      user_id: user!.id, file_name: name, file_url: url, file_type: 'image', file_size: 0, width: 0, height: 0,
    }).select().maybeSingle();
    setAdding(false);
    if (!error && data) setItems(prev => [data,...prev]);
  }

  async function deleteItem(id: string) {
    if (!confirm(m.deleteConfirm)) return;
    await supabase.from('media_library').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (selected === id) setSelected(null);
  }

  const filtered = items.filter(i => !search || i.file_name.toLowerCase().includes(search.toLowerCase()));
  const selectedItem = selected ? items.find(i => i.id === selected) : null;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={m.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
            <Plus className="w-4 h-4"/> {m.addMedia}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-blue-200 p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{m.addFromUrl}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">{m.imageName} <span className="text-gray-400">({m.imageNameHint})</span></label>
                <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder={language==='ru'?'Моё изображение':'My image'}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">URL / Google Drive</label>
                <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <button onClick={addFromUrl} disabled={adding || !urlInput.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg">
              <Link className="w-4 h-4"/> {adding ? t.common.pleaseWait : m.addFromUrlBtn}
            </button>
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{m.stockPhotos}</p>
              <div className="grid grid-cols-3 gap-2">
                {STOCK.map(url => (
                  <button key={url} onClick={() => addStock(url)} disabled={adding}
                    className="aspect-square rounded-lg overflow-hidden relative group">
                    <img src={url} alt="" className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/30 transition-colors flex items-center justify-center">
                      <Plus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-20 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4"><Image className="w-8 h-8 text-gray-400"/></div>
            <p className="text-gray-600 font-semibold">{m.noMedia}</p>
            <p className="text-gray-400 text-sm mt-1">{m.noMediaDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(item => (
              <div key={item.id} onClick={() => setSelected(selected===item.id?null:item.id)}
                className={`relative group aspect-square rounded-xl overflow-hidden cursor-pointer ring-2 transition-all ${selected===item.id?'ring-blue-500':'ring-transparent hover:ring-blue-300'}`}>
                <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover"/>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"/>
                <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3 h-3"/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 sticky top-4">
            <img src={selectedItem.file_url} alt={selectedItem.file_name} className="w-full aspect-square object-cover rounded-t-xl"/>
            <div className="p-4">
              <p className="font-semibold text-gray-900 text-sm truncate">{selectedItem.file_name}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{selectedItem.file_type}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.addedOn}: {new Date(selectedItem.created_at).toLocaleDateString(locale)}</p>
              <button onClick={() => deleteItem(selectedItem.id)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg">
                <Trash2 className="w-4 h-4"/> {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
