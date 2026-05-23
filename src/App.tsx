import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Compose from './pages/Compose';
import Posts from './pages/Posts';
import Analytics from './pages/Analytics';
import Accounts from './pages/Accounts';
import Media from './pages/Media';
import { Page } from './types';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <AuthPage />;

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':  return <Dashboard onNavigate={setCurrentPage} />;
      case 'calendar':   return <Calendar onNavigate={setCurrentPage} />;
      case 'compose':    return <Compose onNavigate={setCurrentPage} />;
      case 'posts':      return <Posts onNavigate={setCurrentPage} />;
      case 'analytics':  return <Analytics />;
      case 'accounts':   return <Accounts />;
      case 'media':      return <Media />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} collapsed={sidebarCollapsed} />
      <div className={`${sidebarCollapsed ? 'pl-16' : 'pl-60'} transition-all duration-300`}>
        <Header
          currentPage={currentPage}
          onToggleSidebar={() => setSidebarCollapsed(c => !c)}
          onCompose={() => setCurrentPage('compose')}
        />
        <main>{renderPage()}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}
