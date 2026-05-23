import { useEffect, useState } from 'react';
import { Trash2, Filter, Edit3, Clock, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Post, PostStatus, Page } from '../types';
import PlatformBadge from '../components/PlatformBadge';

const statusIcon: Record<PostStatus, React.ComponentType<{className?:string}>> = {
  draft: FileText, scheduled: Clock, published: CheckCircle, failed: AlertCircle,
};
const statusColor: Record<PostStatus, string> = {
  draft: 'bg-gray-100 text-gray-600', scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700',
};

export default function Posts({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const p = t.posts;

  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<PostStatus|'all'>('all');
  const [deleting, setDeleting] = useState<string|null>(null);

  useEffect(() => { fetchPosts(); }, [user]);

  async function fetchPosts() {
    if (!user) return;
    const { data } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPosts(data ?? []); setLoading(false);
  }

  async function deletePost(id: string) {
    if (!confirm(p.deleteConfirm)) return;
    setDeleting(id);
    await supabase.from('posts').delete().eq('id', id);
    setPosts(prev => prev.filter(x => x.id !== id)); setDeleting(null);
  }

  const filtered = filter === 'all' ? posts : posts.filter(x => x.status === filter);
  const counts: Record<string, number> = { all: posts.length };
  posts.forEach(x => { counts[x.status] = (counts[x.status] || 0) + 1; });

  const filterKeys = ['all', 'draft', 'scheduled', 'published', 'failed'] as const;
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {filterKeys.map((s, i) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter===s?'bg-blue-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {p.filters[i]}<span className="ml-1.5 text-xs opacity-70">({counts[s]??0})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 flex flex-col items-center">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4"><FileText className="w-7 h-7 text-gray-400"/></div>
          <p className="text-gray-500 font-medium">{p.noPosts}</p>
          <p className="text-gray-400 text-sm mt-1">{p.noPostsDesc}</p>
          <button onClick={() => onNavigate('compose')} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">{p.createFirst}</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Post</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Platforms</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">{p.scheduledFor}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Engagement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(post => {
                const Icon = statusIcon[post.status];
                return (
                  <tr key={post.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900 line-clamp-2 max-w-xs">{post.content}</p>
                      {post.media_urls?.length > 0 && <p className="text-xs text-gray-400 mt-0.5">{post.media_urls.length} {p.mediaFiles}</p>}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell"><div className="flex flex-wrap gap-1">{post.platforms.map(pl => <PlatformBadge key={pl} platform={pl}/>)}</div></td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusColor[post.status]}`}>
                        <Icon className="w-3 h-3"/>
                        {p.statuses[post.status as keyof typeof p.statuses] || post.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 hidden lg:table-cell">
                      {post.scheduled_at ? new Date(post.scheduled_at).toLocaleString(locale, {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <div>{post.likes_count} {p.likes}</div>
                        <div>{post.comments_count} {p.comments}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-3.5 h-3.5"/></button>
                        <button onClick={() => deletePost(post.id)} disabled={deleting===post.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
