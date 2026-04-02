import React from 'react';
import { 
  Users, 
  CheckSquare, 
  FileText, 
  BookOpen, 
  Calendar, 
  TrendingUp,
  Clock,
  AlertCircle,
  ShieldCheck,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const data: any[] = [];
const performanceData: any[] = [];

import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';

interface DashboardProps {
  userRole: string | null;
}

export default function Dashboard({ userRole }: DashboardProps) {
  const [stats, setStats] = React.useState({
    students: 0,
    attendance: 0,
    classes: 0,
    reports: 0
  });
  const [agenda, setAgenda] = React.useState<any[]>([]);
  const [loginLogs, setLoginLogs] = React.useState<any[]>([]);
  const [isClearing, setIsClearing] = React.useState(false);
  const [isResettingAll, setIsResettingAll] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [showLogsConfirm, setShowLogsConfirm] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const clearLogs = async () => {
    setIsClearing(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const adminEmail = 'luis.hen1403@gmail.com';
      
      const deletePromises = snapshot.docs
        .filter(d => d.data().email?.toLowerCase() !== adminEmail)
        .map(d => deleteDoc(doc(db, 'users', d.id)));
      
      await Promise.all(deletePromises);
      setMessage({ text: 'Logs limpos com sucesso!', type: 'success' });
      setShowLogsConfirm(false);
    } catch (error) {
      console.error("Error clearing logs:", error);
      setMessage({ text: 'Erro ao limpar logs.', type: 'error' });
    } finally {
      setIsClearing(false);
    }
  };

  const resetAllData = async () => {
    setIsResettingAll(true);
    try {
      const collections = [
        'students', 
        'courses', 
        'attendance', 
        'grades', 
        'schedule', 
        'library', 
        'reports',
        'users' // Will filter admin inside the loop
      ];

      const adminEmail = 'luis.hen1403@gmail.com';

      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        const deletePromises = snapshot.docs
          .filter(d => {
            if (colName === 'users') return d.data().email?.toLowerCase() !== adminEmail;
            return true;
          })
          .map(d => deleteDoc(doc(db, colName, d.id)));
        
        await Promise.all(deletePromises);
      }
      
      setMessage({ text: 'Sistema resetado com sucesso!', type: 'success' });
      setShowResetConfirm(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Error resetting system data:", error);
      setMessage({ text: 'Erro ao resetar dados.', type: 'error' });
    } finally {
      setIsResettingAll(false);
    }
  };

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;

    if (userRole === 'admin') {
      // Admin sees everything
      const unsubStudents = onSnapshot(collection(db, 'students'), (s) => {
        setStats(prev => ({ ...prev, students: s.size }));
      }, (error) => console.error("Students Snapshot Error:", error));
      
      const unsubClasses = onSnapshot(collection(db, 'classes'), (s) => {
        setStats(prev => ({ ...prev, classes: s.size }));
      }, (error) => console.error("Classes Snapshot Error:", error));
      
      const unsubReports = onSnapshot(collection(db, 'reports'), (s) => {
        setStats(prev => ({ ...prev, reports: s.size }));
      }, (error) => console.error("Reports Snapshot Error:", error));
      
      const unsubAttendance = onSnapshot(collection(db, 'attendance'), (s) => {
        if (s.empty) {
          setStats(prev => ({ ...prev, attendance: 0 }));
          return;
        }
        const present = s.docs.filter(d => d.data().status === 'present').length;
        setStats(prev => ({ ...prev, attendance: Math.round((present / s.size) * 100) }));
      }, (error) => console.error("Attendance Snapshot Error:", error));

      // Fetch all users for admin logs
      const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('name')), (s) => {
        setLoginLogs(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error("Users Snapshot Error:", error));

      return () => {
        unsubStudents();
        unsubClasses();
        unsubReports();
        unsubAttendance();
        unsubUsers();
      };
    } else {
      // Instructor sees only their data
      const unsubStudents = onSnapshot(query(collection(db, 'students'), where('instructorId', '==', uid)), (s) => {
        setStats(prev => ({ ...prev, students: s.size }));
      });

      const unsubClasses = onSnapshot(query(collection(db, 'classes'), where('instructorId', '==', uid)), (s) => {
        setStats(prev => ({ ...prev, classes: s.size }));
        setAgenda(s.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((c: any) => {
          const classDate = new Date(c.date).toDateString();
          const today = new Date().toDateString();
          return classDate === today;
        }));
      });

      const unsubReports = onSnapshot(query(collection(db, 'reports'), where('instructorId', '==', uid)), (s) => {
        setStats(prev => ({ ...prev, reports: s.size }));
      });

      const unsubAttendance = onSnapshot(query(collection(db, 'attendance'), where('instructorId', '==', uid)), (s) => {
        if (s.empty) {
          setStats(prev => ({ ...prev, attendance: 0 }));
          return;
        }
        const present = s.docs.filter(d => d.data().status === 'present').length;
        setStats(prev => ({ ...prev, attendance: Math.round((present / s.size) * 100) }));
      });

      return () => {
        unsubStudents();
        unsubClasses();
        unsubReports();
        unsubAttendance();
      };
    }
  }, [userRole]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
            PAINEL DE <span className="text-primary">CONTROLE</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Gestão estratégica de turmas e indicadores de desempenho.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-lg self-start md:self-auto">
          <Calendar className="text-primary" size={20} />
          <span className="text-sm font-bold text-slate-200">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Alunos', value: stats.students.toString(), icon: Users, color: 'text-primary', trend: '+12%' },
          { label: 'Presença Média', value: `${stats.attendance}%`, icon: CheckSquare, color: 'text-emerald-500', trend: '+5%' },
          { label: 'Aulas Realizadas', value: stats.classes.toString(), icon: Calendar, color: 'text-blue-500', trend: 'Meta: 60' },
          { label: 'Relatórios Pendentes', value: stats.reports.toString(), icon: AlertCircle, color: 'text-rose-500', trend: 'Urgente' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="corporate-card group cursor-default"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:border-primary/50 transition-all ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded-full border border-slate-800">
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black mt-1 text-white">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="corporate-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <CheckSquare className="text-primary" size={18} />
              Frequência Semanal
            </h3>
            <button className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline">Relatório Completo</button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#FACC15' }}
                />
                <Bar dataKey="presenca" fill="#FACC15" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="corporate-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
              <TrendingUp className="text-primary" size={18} />
              Indicador de Evolução
            </h3>
            <button className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline">Análise Técnica</button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, 10]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#FACC15' }}
                />
                <Line type="monotone" dataKey="score" stroke="#FACC15" strokeWidth={3} dot={{ fill: '#FACC15', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming Classes / Admin Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="corporate-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <Clock className="text-primary" size={18} />
              Agenda do Dia
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agenda.length > 0 ? agenda.map((item, i) => (
                <div key={i} className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-primary/30 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-primary font-black text-xl">{new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="px-2 py-1 bg-slate-950 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-800">
                      {item.status === 'planned' ? 'Planejado' : 'Concluído'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-100 group-hover:text-primary transition-colors">{item.content || 'Sem conteúdo definido'}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Aula Agendada</p>
                </div>
              )) : (
                <div className="md:col-span-2 p-8 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Nenhuma aula agendada para hoje</p>
                </div>
              )}
            </div>
          </div>

          {userRole === 'admin' && (
            <div className="corporate-card border-rose-500/20 bg-rose-500/5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-500 shadow-lg shadow-rose-500/10">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">ZONA DE PERIGO</h3>
                    <p className="text-[10px] text-rose-500/70 font-bold uppercase tracking-widest">Ações Irreversíveis de Administrador</p>
                  </div>
                </div>
                
                {!showResetConfirm ? (
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full md:w-auto px-8 py-4 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20"
                  >
                    <Trash2 size={18} />
                    Zerar Todo o Sistema
                  </button>
                ) : (
                  <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest text-center md:text-right">Confirmar exclusão total?</p>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={resetAllData}
                        disabled={isResettingAll}
                        className="flex-1 md:flex-none px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isResettingAll ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        SIM, APAGAR TUDO
                      </button>
                      <button 
                        onClick={() => setShowResetConfirm(false)}
                        disabled={isResettingAll}
                        className="flex-1 md:flex-none px-6 py-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 text-[10px] text-slate-500 leading-relaxed italic">
                * Esta ação removerá permanentemente todos os alunos, cursos, notas, presenças e materiais da biblioteca de todos os instrutores.
              </p>
              
              {message && (
                <div className={`mt-4 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${
                  message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {message.text}
                </div>
              )}
            </div>
          )}
        </div>

        {userRole === 'admin' && (
          <div className="corporate-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <ShieldCheck className="text-primary" size={18} />
                Logins Realizados
              </h3>
              
              {!showLogsConfirm ? (
                <button 
                  onClick={() => setShowLogsConfirm(true)}
                  className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-rose-500/20"
                >
                  <Trash2 size={14} />
                  Zerar
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <p className="text-[9px] text-rose-500 font-black uppercase tracking-widest">Confirmar?</p>
                  <button 
                    onClick={clearLogs}
                    disabled={isClearing}
                    className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
                  >
                    SIM
                  </button>
                  <button 
                    onClick={() => setShowLogsConfirm(false)}
                    disabled={isClearing}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                  >
                    NÃO
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {loginLogs.map((log, i) => (
                <div key={i} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-primary border border-slate-800">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{log.name || 'Usuário'}</h4>
                    <p className="text-[10px] text-slate-500 font-medium">{log.email}</p>
                    <span className="text-[9px] text-primary font-bold uppercase tracking-widest mt-1 block">
                      {log.role === 'admin' ? 'Administrador' : 'Instrutor'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
