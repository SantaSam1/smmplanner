import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Calendar, Zap, BarChart2, Users, Globe } from 'lucide-react';

const ICONS = [Calendar, Zap, BarChart2, Users];

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const a = t.auth;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      if (!fullName.trim()) { setError(a.fullNameRequired); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName);
      if (error) setError(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">SMMPlanner</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">{a.tagline}</h1>
          <p className="text-blue-200 text-lg mb-10">{a.taglineSub}</p>
          <div className="space-y-4">
            {a.features.map((text, i) => {
              const Icon = ICONS[i];
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-blue-100">{text}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-blue-300 text-sm">{a.trustedBy}</p>
      </div>
      {/* Right */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between mb-8">
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">SMMPlanner</span>
            </div>
            {/* Language switcher */}
            <div className="ml-auto flex items-center gap-0.5 border border-gray-200 rounded-lg p-0.5 bg-white">
              <Globe className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
              {(['ru','en'] as const).map(l => (
                <button key={l} onClick={() => setLanguage(l)}
                  className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${language===l?'bg-blue-600 text-white':'text-gray-500 hover:text-gray-700'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{mode==='signin'?a.welcomeBack:a.createAccount}</h2>
            <p className="text-gray-500 mb-8">{mode==='signin'?a.signInContinue:a.startTrial}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode==='signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.fullName}</label>
                  <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Иван Иванов"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.email}</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{a.password}</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors">
                {loading ? t.common.pleaseWait : mode==='signin' ? a.signIn : a.createAccount}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-gray-500">
              {mode==='signin'?a.noAccount:a.hasAccount}{' '}
              <button onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('');}} className="text-blue-600 font-medium hover:underline">
                {mode==='signin'?a.signUpFree:a.signIn}
              </button>
            </p>
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
              <a href="/privacy-policy" className="hover:text-gray-600 hover:underline">Политика конфиденциальности</a>
              <span>·</span>
              <a href="/terms-of-service" className="hover:text-gray-600 hover:underline">Пользовательское соглашение</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
