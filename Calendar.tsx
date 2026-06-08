import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Post, Page } from '../types';
import PlatformBadge from '../components/PlatformBadge';

export default function Calendar({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const c = t.calendar;
  const [posts, setPosts]         = useState<Post[]>([]);
  const [viewDate, setViewDate]   = useState(new Date());
  const [selectedDay, setSelected] = useState<number|null>(null);
  const today = new Date();

  useEffect(() => {
    if (!user) return;
    supabase.from('posts').select('*').eq('user_id', user.id).in('status', ['scheduled','published'])
      .then(({ data }) => setPosts(data ?? []));
  }, [user]);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const postsByDay: Record<number, Post[]> = {};
  posts.forEach(post => {
    const d = post.scheduled_at ? new Date(post.scheduled_at) : post.published_at ? new Date(post.published_at) : null;
    if (d && d.getFullYear()===year && d.getMonth()===month) {
      const day = d.getDate();
      if (!postsByDay[day]) postsByDay[day] = [];
      postsByDay[day].push(post);
    }
  });

  const cells: (number|null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d: number) => d===today.getDate() && month===today.getMonth() && year===today.getFullYear();
  const selectedPosts = selectedDay ? (postsByDay[selectedDay] ?? []) : [];
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const statusLabels = t.posts.statuses;

  return (
    <div className="p-6 flex gap-6 items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => { setViewDate(new Date(year,month-1,1)); setSelected(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4 text-gray-600"/></button>
            <h2 className="text-lg font-semibold text-gray-900 w-52 text-center">{c.months[month]} {year}</h2>
            <button onClick={() => { setViewDate(new Date(year,month+1,1)); setSelected(null); }} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4 text-gray-600"/></button>
          </div>
          <button onClick={() => onNavigate('compose')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">
            <Plus className="w-4 h-4"/> {c.newPost}
          </button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {c.weekDays.map(d => <div key={d} className="text-xs font-semibold text-gray-400 text-center py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="bg-gray-50 h-24"/>;
            const dayPosts = postsByDay[d] ?? [];
            return (
              <div key={d} onClick={() => setSelected(d===selectedDay?null:d)}
                className={`bg-white h-24 p-2 cursor-pointer hover:bg-blue-50 transition-colors ${selectedDay===d?'ring-2 ring-inset ring-blue-500':''}`}>
                <span className={`text-sm font-medium inline-flex w-7 h-7 items-center justify-center rounded-full ${isToday(d)?'bg-blue-600 text-white':'text-gray-700'}`}>{d}</span>
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayPosts.slice(0,2).map(post => (
                    <div key={post.id} className={`text-xs truncate px-1 py-0.5 rounded ${post.status==='published'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                      {post.content.slice(0,16)}…
                    </div>
                  ))}
                  {dayPosts.length > 2 && <p className="text-xs text-gray-400 pl-1">+{dayPosts.length-2}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day panel */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 sticky top-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              {selectedDay ? `${c.months[month]} ${selectedDay}, ${year}` : c.selectDay}
            </h3>
          </div>
          {!selectedDay ? (
            <div className="p-6 text-center text-gray-400 text-sm">{c.clickDay}</div>
          ) : selectedPosts.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-400 text-sm mb-3">{c.noPostsDay}</p>
              <button onClick={() => onNavigate('compose')} className="text-sm text-blue-600 hover:underline font-medium">{c.schedulePost}</button>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {selectedPosts.map(post => (
                <div key={post.id} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm text-gray-700 line-clamp-3">{post.content}</p>
                  <div className="flex flex-wrap gap-1 mt-2">{post.platforms.map(p => <PlatformBadge key={p} platform={p}/>)}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${post.status==='published'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                      {statusLabels[post.status as keyof typeof statusLabels] || post.status}
                    </span>
                    {post.scheduled_at && (
                      <span className="text-xs text-gray-400">{new Date(post.scheduled_at).toLocaleTimeString(locale, {hour:'2-digit',minute:'2-digit'})}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
