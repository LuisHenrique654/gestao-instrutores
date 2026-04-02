import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  FileText, 
  BookOpen, 
  Calendar, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  Library,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  appSettings?: any;
  userRole: string | null;
}

export default function Layout({ children, activeTab, setActiveTab, user, appSettings, userRole }: LayoutProps) {
  const [windowWidth, setWindowWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(windowWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width > 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Alunos', icon: Users },
    { id: 'attendance', label: 'Presença', icon: CheckSquare },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'grades', label: 'Notas', icon: GraduationCap },
    { id: 'courses', label: 'Disciplinas', icon: BookOpen },
    { id: 'schedule', label: 'Cronograma', icon: Calendar },
    { id: 'library', label: 'Biblioteca', icon: Library },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon },
  ];

  const handleLogout = () => {
    signOut(auth);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (windowWidth <= 1024) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
            {appSettings?.companyLogoUrl ? (
              <img src={appSettings.companyLogoUrl} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck className="text-slate-950" size={20} />
            )}
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-bold text-white tracking-tight truncate leading-tight">
              {appSettings?.companyName?.split(' ')[0].toUpperCase() || 'CASCAVEL'} <span className="text-primary font-black">{appSettings?.companyName?.split(' ').slice(1).join(' ').toUpperCase() || 'FIRE'}</span>
            </h1>
            <p className="text-[9px] text-primary font-bold tracking-[0.1em] -mt-0.5">PORTAL DO INSTRUTOR</p>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors active:scale-90"
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </header>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[65]"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          width: windowWidth <= 1024 ? 280 : (isSidebarOpen ? 280 : 80),
          x: (windowWidth <= 1024 && !isMobileMenuOpen) ? -280 : 0
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-slate-950 border-r border-slate-800 flex flex-col z-[70] fixed lg:static inset-y-0 left-0 shadow-2xl shadow-black lg:rounded-none rounded-r-[2rem]"
      >
        <div className="p-6 flex items-center justify-between">
          {(isSidebarOpen || isMobileMenuOpen) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {appSettings?.companyLogoUrl ? (
                  <img src={appSettings.companyLogoUrl} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                ) : (
                  <ShieldCheck className="text-slate-950" size={20} />
                )}
              </div>
              <div className="flex flex-col justify-center overflow-hidden">
                <h1 className="text-xl font-bold text-white tracking-tight truncate leading-tight">
                  {appSettings?.companyName?.split(' ')[0].toUpperCase() || 'CASCAVEL'} <span className="text-primary font-black">{appSettings?.companyName?.split(' ').slice(1).join(' ').toUpperCase() || 'FIRE'}</span>
                </h1>
                <p className="text-[10px] text-primary font-bold tracking-[0.2em] mt-0.5">PORTAL DO INSTRUTOR</p>
              </div>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:block p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-3 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors active:scale-90"
          >
            <X size={28} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full sidebar-item ${
                activeTab === item.id 
                  ? 'sidebar-item-active' 
                  : 'sidebar-item-inactive'
              } ${isMobileMenuOpen ? 'py-4 px-5' : ''}`}
            >
              <item.icon size={isMobileMenuOpen ? 24 : 20} className={activeTab === item.id ? 'text-primary' : ''} />
              {(isSidebarOpen || isMobileMenuOpen) && <span className={`ml-4 ${isMobileMenuOpen ? 'text-base font-bold' : 'text-sm'}`}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          {(isSidebarOpen || isMobileMenuOpen) && user && (
            <div className="mb-4 px-4 py-3 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Acesso Corporativo</p>
                {userRole === 'admin' && (
                  <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded border border-primary/30 uppercase tracking-tighter">Admin</span>
                )}
              </div>
              <p className="text-sm font-bold text-slate-200 truncate">{user.displayName || user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 ${isMobileMenuOpen ? 'p-4' : 'p-3'}`}
          >
            <LogOut size={isMobileMenuOpen ? 24 : 20} />
            {(isSidebarOpen || isMobileMenuOpen) && <span className={`ml-4 font-bold ${isMobileMenuOpen ? 'text-base' : 'text-sm'}`}>Encerrar Sessão</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#020617] p-4 md:p-8 pt-20 lg:pt-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
