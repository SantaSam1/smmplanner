import { useEffect, useState } from 'react';
import { TrendingUp, FileText, Clock, CheckCircle, ArrowUpRight, BarChart2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Post, SocialAccount, Page } from '../types';
import PlatformBadge from '../components/PlatformBadge';
import { platformConfig } from '../components/PlatformBadge';

const PAGE_ORDER: Page[] = ['compose','calendar','analytics','media'];

export default function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const d = t.dashboard;
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('social_accounts').select('*').eq('user_id', user.id),
    ]).then(([pr, ar]) => { setPosts(pr.data ?? []); setAccounts(ar.data ?? []); setLoading(false); });
  }, [user]);

  const scheduled = posts.filter(p => p.status === 'scheduled');
  const published  = posts.filter(p => p.status === 'published');
  const drafts     = posts.filter(p => p.status === 'draft');
  const totalReach = posts.reduce((s, p) => s + (p.reach_count || 0), 0);
  const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0);

  const stats = [
    { label: d.scheduledPosts, value: scheduled.length, icon: Clock,         color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: d.publishedPosts, value: published.length,  icon: CheckCircle,   color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: d.totalReach,     value: totalReach.toLocaleString(), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: d.totalLikes,     value: totalLikes.toLocaleString(), icon: BarChart2,  color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
  ];

  const statusLabels = t.posts.statuses;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white rounded-xl border ${border} p-5 flex items-start gap-4`}>
            <div className={`${bg} ${color} p-2.5 rounded-lg flex-shrink-0`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500 mt-0.5">{label}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent posts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">{d.recentPosts}</h2>
            <button onClick={() => onNavigate('posts')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              {t.common.viewAll} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {posts.slice(0,5).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3"><FileText className="w-6 h-6 text-gray-400" /></div>
              <p className="text-gray-500 font-medium">{d.noPostsYet}</p>
              <p className="text-gray-400 text-sm mt-1">{d.noPostsDesc}</p>
              <button onClick={() => onNavigate('compose')} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">{d.createPost}</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {posts.slice(0,5).map(post => (
                <div key={post.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {post.platforms.map(p => <PlatformBadge key={p} platform={p} />)}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        post.status==='published'?'bg-green-100 text-green-700':post.status==='scheduled'?'bg-amber-100 text-amber-700':post.status==='failed'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-600'
                      }`}>{statusLabels[post.status as keyof typeof statusLabels] || post.status}</span>
                    </div>
                  </div>
                  {post.scheduled_at && <p className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{new Date(post.scheduled_at).toLocaleDateString(language==='ru'?'ru-RU':'en-US')}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Accounts */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{d.connectedAccounts}</h2>
              <button onClick={() => onNavigate('accounts')} className="text-sm text-blue-600 hover:text-blue-700 font-medium">{t.common.manage}</button>
            </div>
            {accounts.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{d.noAccountsConnected}</p>
                <button onClick={() => onNavigate('accounts')} className="mt-3 text-sm text-blue-600 hover:underline font-medium">{d.connectAccount}</button>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {accounts.slice(0,4).map(acc => (
                  <div key={acc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <div className={`w-8 h-8 rounded-full ${platformConfig[acc.platform]?.bg || 'bg-gray-100'} flex items-center justify-center text-sm font-bold ${platformConfig[acc.platform]?.color || 'text-gray-600'} flex-shrink-0`}>
                      {acc.account_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{acc.account_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{platformConfig[acc.platform]?.label || acc.platform}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${acc.is_active?'bg-green-400':'bg-gray-300'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
            <h2 className="font-semibold text-gray-900 mb-2">{d.quickActions}</h2>
            {PAGE_ORDER.map((page, i) => (
              <button key={page} onClick={() => onNavigate(page)}
                className="w-full text-left text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium flex items-center justify-between group">
                {d.actions[i]}
                <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400" />
              </button>
            ))}
          </div>

          {/* Post breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">{d.postBreakdown}</h2>
            {[{label:d.published,count:published.length,color:'bg-green-500'},{label:d.scheduled,count:scheduled.length,color:'bg-amber-400'},{label:d.drafts,count:drafts.length,color:'bg-gray-300'}].map(({label,count,color})=>{
              const pct = Math.round((count/(posts.length||1))*100);
              return (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{label}</span><span className="font-semibold text-gray-900">{count}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full`} style={{width:`${pct}%`}}/></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
