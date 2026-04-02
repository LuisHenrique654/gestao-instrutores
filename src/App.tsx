import React from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Attendance from './components/Attendance';
import Reports from './components/Reports';
import Grades from './components/Grades';
import Courses from './components/Courses';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import Library from './components/Library';
import { LogIn, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { collection, query, where, onSnapshot, getDoc, doc, setDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [appSettings, setAppSettings] = React.useState<any>(null);
  const [loginError, setLoginError] = React.useState<string | null>(null);
  const [loginMode, setLoginMode] = React.useState<'login' | 'signup'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [isAuthProcessing, setIsAuthProcessing] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Load user role
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        } else {
          // Default role if not found
          const role = user.email === 'luis.hen1403@gmail.com' ? 'admin' : 'instructor';
          setUserRole(role);
          // Create user doc if it doesn't exist
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            role: role,
            name: user.displayName
          });
        }

        // Load custom settings (logo, name)
        const q = query(collection(db, 'settings'), where('instructorId', '==', user.uid));
        const unsubSettings = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            setAppSettings(snapshot.docs[0].data());
          }
        });
        setLoading(false);
        return () => unsubSettings();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthProcessing(true);
    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError("Email ou senha incorretos.");
      } else {
        setLoginError("Erro ao fazer login: " + (error.message || "Erro desconhecido"));
      }
    } finally {
      setIsAuthProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthProcessing(true);
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      // Create user doc
      const role = email === 'luis.hen1403@gmail.com' ? 'admin' : 'instructor';
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        role: role,
        name: name
      });
      
      setUserRole(role);
    } catch (error: any) {
      console.error("Signup Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginError("Este email já está em uso.");
      } else if (error.code === 'auth/weak-password') {
        setLoginError("A senha deve ter pelo menos 6 caracteres.");
      } else {
        setLoginError("Erro ao criar conta: " + (error.message || "Erro desconhecido"));
      }
    } finally {
      setIsAuthProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-primary text-4xl font-black tracking-tighter"
        >
          {appSettings?.companyName?.toUpperCase() || 'CASCAVEL'} <span className="text-white">{appSettings?.companyName ? '' : 'FIRE'}</span>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full corporate-card text-center space-y-10 p-12 border-slate-800"
        >
          <div className="space-y-3">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/20 overflow-hidden">
              {appSettings?.companyLogoUrl ? (
                <img src={appSettings.companyLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
              ) : (
                <ShieldCheck className="text-slate-950" size={36} />
              )}
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              {appSettings?.companyName?.split(' ')[0].toUpperCase() || 'CASCAVEL'} <span className="text-primary">{appSettings?.companyName?.split(' ').slice(1).join(' ').toUpperCase() || 'FIRE'}</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Enterprise Instructor Management</p>
          </div>
          
          <div className="space-y-4">
            <div className="text-left space-y-1">
              <h2 className="text-xl font-bold text-white">
                {loginMode === 'login' ? 'Acessar Portal' : 'Criar Conta'}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {loginMode === 'login' 
                  ? 'Bem-vindo ao portal corporativo. Por favor, utilize suas credenciais autorizadas para prosseguir.'
                  : 'Preencha os dados abaixo para solicitar seu acesso ao sistema corporativo.'}
              </p>
            </div>

            <form onSubmit={loginMode === 'login' ? handleLogin : handleSignup} className="space-y-4 text-left">
              {loginMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="input-corporate w-full"
                    placeholder="Seu Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Corporativo</label>
                <input 
                  required
                  type="email" 
                  className="input-corporate w-full"
                  placeholder="email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                <input 
                  required
                  type="password" 
                  className="input-corporate w-full"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                disabled={isAuthProcessing}
                className="w-full btn-corporate-primary py-4 text-lg mt-4 disabled:opacity-50"
              >
                {isAuthProcessing ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <LogIn size={24} />
                    {loginMode === 'login' ? 'Entrar' : 'Cadastrar'}
                  </>
                )}
              </button>
            </form>

            <div className="text-center space-y-2">
              <button 
                onClick={() => {
                  setLoginMode(loginMode === 'login' ? 'signup' : 'login');
                  setLoginError(null);
                }}
                className="text-xs font-bold text-primary uppercase tracking-widest hover:underline block w-full"
              >
                {loginMode === 'login' ? 'Não tem uma conta? Solicitar acesso' : 'Já tem uma conta? Fazer login'}
              </button>
              
              {loginMode === 'login' && (
                <button 
                  onClick={() => {
                    setEmail('luis.hen1403@gmail.com');
                    setLoginError(null);
                  }}
                  className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:text-primary transition-colors"
                >
                  Acesso Administrativo (Atalhos)
                </button>
              )}
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-left leading-relaxed"
              >
                {loginError}
              </motion.div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-lg font-black text-white">2k+</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Alunos</p>
              </div>
              <div className="h-8 w-[1px] bg-slate-800"></div>
              <div className="text-center">
                <p className="text-lg font-black text-white">50+</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Instrutores</p>
              </div>
              <div className="h-8 w-[1px] bg-slate-800"></div>
              <div className="text-center">
                <p className="text-lg font-black text-white">99%</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Uptime</p>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">
            © 2026 {appSettings?.companyName || 'Cascavel Fire'}. Todos os direitos reservados.
          </p>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard userRole={userRole} />;
      case 'students': return <Students userRole={userRole} />;
      case 'attendance': return <Attendance userRole={userRole} />;
      case 'reports': return <Reports userRole={userRole} />;
      case 'grades': return <Grades userRole={userRole} />;
      case 'courses': return <Courses userRole={userRole} />;
      case 'schedule': return <Schedule userRole={userRole} />;
      case 'library': return <Library userRole={userRole} />;
      case 'settings': return <Settings userRole={userRole} />;
      default: return <Dashboard userRole={userRole} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      user={user}
      appSettings={appSettings}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
