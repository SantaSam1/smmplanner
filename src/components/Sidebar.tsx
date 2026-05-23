import { LayoutDashboard, Calendar, Edit3, FileText, BarChart2, Users, Image, LogOut, ChevronRight } from 'lucide-react';
import { Page } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Sidebar({ currentPage, onNavigate, collapsed }: { currentPage: Page; onNavigate: (p: Page) => void; collapsed: boolean }) {
  const { profile, signOut } = useAuth();
  const { t } = useLanguage();

  const items = [
    { id: 'dashboard' as Page, label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'calendar'  as Page, label: t.nav.calendar,  icon: Calendar },
    { id: 'compose'   as Page, label: t.nav.compose,   icon: Edit3 },
    { id: 'posts'     as Page, label: t.nav.posts,     icon: FileText },
    { id: 'analytics' as Page, label: t.nav.analytics, icon: BarChart2 },
    { id: 'accounts'  as Page, label: t.nav.accounts,  icon: Users },
    { id: 'media'     as Page, label: t.nav.media,     icon: Image },
  ];

  return (
    <aside className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className={`flex items-center gap-3 p-4 border-b border-gray-200 h-16 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="font-bold text-gray-900 text-lg tracking-tight">SMMPlanner</span>}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ id, label, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <button key={id} onClick={() => onNavigate(id)} title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'} ${collapsed ? 'justify-center' : ''}`}>
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <ChevronRight className="w-4 h-4 ml-auto text-blue-500" />}
            </button>
          );
        })}
      </nav>
      {!collapsed && (
        <div className="mx-3 mb-3 bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{profile?.plan ?? 'Beginner'} {t.sidebar.plan}</p>
          <p className="text-xs text-blue-500 mt-0.5">{t.sidebar.upgradeText}</p>
          <button className="mt-2 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors">{t.common.upgrade}</button>
        </div>
      )}
      <div className={`border-t border-gray-200 p-3 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-semibold">{profile?.full_name?.[0]?.toUpperCase() ?? 'U'}</span>
        </div>
        {!collapsed && <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'User'}</p></div>}
        <button onClick={signOut} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
      </div>
    </aside>
  );
}
