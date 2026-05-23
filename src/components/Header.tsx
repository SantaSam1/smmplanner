import { Menu, Bell, Search, Plus, Globe } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  currentPage: Page;
  onToggleSidebar: () => void;
  onCompose: () => void;
}

export default function Header({ currentPage, onToggleSidebar, onCompose }: HeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="text-gray-500 hover:text-gray-900 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{t.pageTitles[currentPage]}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder={t.header.searchPlaceholder}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 transition" />
        </div>
        {/* Language switcher */}
        <div className="flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 bg-gray-50">
          <Globe className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
          {(['ru', 'en'] as const).map(l => (
            <button key={l} onClick={() => setLanguage(l)}
              className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language === l ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="relative text-gray-500 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <button onClick={onCompose}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.header.newPost}</span>
        </button>
      </div>
    </header>
  );
}
