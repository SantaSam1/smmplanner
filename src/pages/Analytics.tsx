import { useEffect, useState } from 'react';
import { TrendingUp, Heart, MessageCircle, Share2, Eye, ArrowUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Post, Platform } from '../types';
import { platformConfig } from '../components/PlatformBadge';

const ALL_PLATFORMS: Platform[] = ['instagram','facebook','twitter','linkedin','tiktok','youtube','telegram','vk','ok'];

export default function Analytics() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const a = t.analytics;
  const [posts, setPosts]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<7|30>(30);
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    if (!user) return;
    supabase.from('posts').select('*').eq('user_id', user.id).then(({ data }) => { setPosts(data??[]); setLoading(false); });
  }, [user]);

  const published      = posts.filter(p => p.status === 'published');
  const totalLikes     = published.reduce((s,p) => s+p.likes_count, 0);
  const totalComments  = published.reduce((s,p) => s+p.comments_count, 0);
  const totalShares    = published.reduce((s,p) => s+p.shares_count, 0);
  const totalReach     = published.reduce((s,p) => s+p.reach_count, 0);
  const avgEngagement  = published.length > 0 ? Math.round(((totalLikes+totalComments+totalShares)/published.length)*10)/10 : 0;

  const platformBreakdown = ALL_PLATFORMS.map(p => ({
    platform: p,
    count: posts.filter(post => post.platforms.includes(p)).length,
  })).filter(p => p.count > 0).sort((a,b) => b.count-a.count);

  const topPosts = [...published].sort((a,b) => (b.likes_count+b.comments_count+b.shares_count)-(a.likes_count+a.comments_count+a.shares_count)).slice(0,5);

  const days = Array.from({ length: period===7?7:30 }, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(period===7?6:29)+i); return d;
  });
  const maxVal = Math.max(4, ...days.map(d => posts.filter(p => {
    const pd = p.published_at?new Date(p.published_at):p.scheduled_at?new Date(p.scheduled_at):null;
    return pd && pd.toDateString()===d.toDateString();
  }).length));

  const statCards = [
    { label: a.totalReach,     value: totalReach.toLocaleString(),   icon: Eye,           color: 'text-blue-600',  bg: 'bg-blue-50',  change: '+12%' },
    { label: a.totalLikes,     value: totalLikes.toLocaleString(),   icon: Heart,         color: 'text-pink-600',  bg: 'bg-pink-50',  change: '+8%'  },
    { label: a.comments,       value: totalComments.toLocaleString(),icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50', change: '+5%'  },
    { label: a.shares,         value: totalShares.toLocaleString(),  icon: Share2,        color: 'text-amber-600', bg: 'bg-amber-50', change: '+3%'  },
    { label: a.avgEngagement,  value: avgEngagement.toString(),      icon: TrendingUp,    color: 'text-sky-600',   bg: 'bg-sky-50',   change: '+2%'  },
    { label: a.postsPublished, value: published.length.toString(),   icon: TrendingUp,    color: 'text-gray-600',  bg: 'bg-gray-100', change: '+15%' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">{a.period}</span>
        {([7,30] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period===p?'bg-blue-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {a.lastDays.replace('{n}', String(p))}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, change }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`${bg} ${color} p-2.5 rounded-lg`}><Icon className="w-4 h-4"/></div>
              <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600"><ArrowUp className="w-3 h-3"/>{change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{a.postingActivity}</h2>
          <div className="flex items-end gap-1 h-36">
            {days.map((d, i) => {
              const count = posts.filter(p => {
                const pd = p.published_at?new Date(p.published_at):p.scheduled_at?new Date(p.scheduled_at):null;
                return pd && pd.toDateString()===d.toDateString();
              }).length;
              const height = Math.max(4, (count/maxVal)*100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full">
                    <div className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all cursor-pointer"
                      style={{height:`${height}%`, minHeight: count>0?'8px':'3px'}}
                      title={`${d.toLocaleDateString(locale)}: ${count}`}/>
                  </div>
                  {(period===7 || i%5===0) && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {d.toLocaleDateString(locale, {month:'short', day:'numeric'})}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{a.platformBreakdown}</h2>
          {platformBreakdown.length === 0 ? (
            <p className="text-gray-400 text-sm">{a.noData}</p>
          ) : (
            <div className="space-y-4">
              {platformBreakdown.map(({ platform, count }) => {
                const cfg = platformConfig[platform];
                const pct = Math.round((count/(posts.length||1))*100);
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${cfg?.color||'text-gray-600'}`}>{cfg?.label||platform}</span>
                      <span className="text-sm text-gray-500">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg?.bg||'bg-gray-300'} opacity-80`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top posts */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-900">{a.topPerforming}</h2></div>
        {topPosts.length === 0 ? (
          <div className="py-12 text-center text-gray-400"><p>{a.noPublished}</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {topPosts.map((post, i) => (
              <div key={post.id} className="px-5 py-4 flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-200 w-8 flex-shrink-0">#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-1">{post.content}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{post.likes_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3"/>{post.comments_count}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{post.reach_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
