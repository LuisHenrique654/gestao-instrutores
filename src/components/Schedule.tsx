import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  X, 
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { handleFirestoreError } from '../lib/firestore-utils';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  where 
} from 'firebase/firestore';
import { Class, Subject } from '../types';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Schedule({ userRole }: { userRole: string | null }) {
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<Class | null>(null);
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  // Form state
  const [formData, setFormData] = React.useState({
    subjectId: '',
    date: new Date().toISOString(),
    content: '',
    status: 'planned' as 'planned' | 'completed'
  });

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const isAdmin = userRole === 'admin';

    const qClasses = isAdmin
      ? query(collection(db, 'classes'), orderBy('date'))
      : query(collection(db, 'classes'), where('instructorId', '==', uid), orderBy('date'));
      
    const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
    });

    const qSubjects = isAdmin
      ? query(collection(db, 'subjects'), orderBy('name'))
      : query(collection(db, 'subjects'), where('instructorId', '==', uid), orderBy('name'));
      
    const unsubscribeSubjects = onSnapshot(qSubjects, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    });

    return () => {
      unsubscribeClasses();
      unsubscribeSubjects();
    };
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...formData,
        instructorId: auth.currentUser.uid
      };

      if (editingClass) {
        await updateDoc(doc(db, 'classes', editingClass.id), data);
      } else {
        await addDoc(collection(db, 'classes'), data);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving class:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'classes', id));
    } catch (error) {
      console.error("Error deleting class:", error);
      handleFirestoreError(error, 'delete', `classes/${id}`);
    }
  };

  const resetForm = () => {
    setFormData({
      subjectId: '',
      date: selectedDate.toISOString(),
      content: '',
      status: 'planned'
    });
    setEditingClass(null);
  };

  const openEditModal = (cls: Class) => {
    setEditingClass(cls);
    setFormData({
      subjectId: cls.subjectId,
      date: cls.date,
      content: cls.content || '',
      status: cls.status
    });
    setIsModalOpen(true);
  };

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'N/A';

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDate, { weekStartsOn: 1 })
  });

  const dayClasses = classes.filter(cls => isSameDay(new Date(cls.date), selectedDate));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
            CRONOGRAMA DE <span className="text-primary">AULAS</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Planejamento estratégico e controle de conteúdo ministrado.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-corporate-primary w-full md:w-auto"
        >
          <Plus size={20} />
          Nova Aula
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="corporate-card p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-white uppercase tracking-widest text-[10px]">Calendário Estratégico</h3>
              <div className="flex gap-1">
                <button onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
                <div key={i} className="text-center text-[10px] font-black text-slate-600">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const hasClasses = classes.some(cls => isSameDay(new Date(cls.date), day));
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all relative ${
                      isSelected 
                        ? 'bg-primary text-slate-950 font-bold shadow-lg shadow-primary/20 scale-110 z-10' 
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {format(day, 'd')}
                    {hasClasses && !isSelected && (
                      <div className="absolute bottom-1.5 w-1 h-1 bg-primary rounded-full shadow-[0_0_5px_rgba(250,204,21,0.5)]"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="corporate-card p-6">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Métricas da Semana</h4>
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400 font-medium">Aulas Planejadas</span>
                <span className="font-black text-white">{classes.filter(c => c.status === 'planned').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400 font-medium">Aulas Concluídas</span>
                <span className="font-black text-emerald-500">{classes.filter(c => c.status === 'completed').length}</span>
              </div>
              <div className="h-[1px] bg-slate-800 w-full"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400 font-medium">Taxa de Execução</span>
                <span className="font-black text-primary">
                  {Math.round((classes.filter(c => c.status === 'completed').length / (classes.length || 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase">
              AULAS PARA: <span className="text-primary">{format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}</span>
            </h3>
          </div>

          <div className="space-y-4">
            {dayClasses.map((cls) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="corporate-card group relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => openEditModal(cls)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(cls.id)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/4 flex flex-col justify-center items-center p-6 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                    <Clock className="text-primary mb-3" size={28} />
                    <p className="text-3xl font-black text-white tracking-tighter">
                      {format(new Date(cls.date), "HH:mm")}
                    </p>
                    <span className={`mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      cls.status === 'completed' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {cls.status === 'completed' ? 'CONCLUÍDA' : 'PLANEJADA'}
                    </span>
                  </div>

                  <div className="md:w-3/4 py-2">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                        <BookOpen size={18} className="text-primary" />
                      </div>
                      <h4 className="text-2xl font-black text-white uppercase tracking-tighter">
                        {getSubjectName(cls.subjectId)}
                      </h4>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                      {cls.content || 'Nenhum conteúdo estratégico planejado para esta sessão.'}
                    </p>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                        <MapPin size={14} className="text-primary" />
                        <span>Sala Corporativa</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                        <Clock size={14} className="text-primary" />
                        <span>60 Minutos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {dayClasses.length === 0 && (
              <div className="text-center py-24 bg-slate-950/20 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                <div className="p-8 bg-slate-900 rounded-full w-fit mx-auto mb-6 border border-slate-800 shadow-2xl">
                  <CalendarIcon size={48} className="text-slate-800" />
                </div>
                <p className="text-slate-500 font-medium text-lg">Nenhuma aula agendada para este período.</p>
                <button 
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="mt-6 text-primary font-black uppercase tracking-widest text-xs hover:text-white transition-colors flex items-center gap-2 mx-auto"
                >
                  <Plus size={16} />
                  Agendar primeira sessão
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="relative bg-surface border border-border w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-black max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                  {editingClass ? 'EDITAR' : 'AGENDAR'} <span className="text-primary">AULA</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Unidade Curricular</label>
                  <select 
                    required
                    className="input-corporate w-full"
                    value={formData.subjectId}
                    onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                  >
                    <option value="" className="bg-slate-900">Selecione...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id} className="bg-slate-900">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Data e Horário</label>
                    <input 
                      required
                      type="datetime-local" 
                      className="input-corporate w-full"
                      value={formData.date.slice(0, 16)}
                      onChange={(e) => setFormData({...formData, date: new Date(e.target.value).toISOString()})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Status Operacional</label>
                    <select 
                      className="input-corporate w-full"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="planned" className="bg-slate-900">Planejada</option>
                      <option value="completed" className="bg-slate-900">Concluída</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Conteúdo Programático</label>
                  <textarea 
                    className="input-corporate w-full h-32 resize-none"
                    placeholder="Quais competências serão abordadas nesta sessão?"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 btn-corporate-outline"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-corporate-primary"
                  >
                    <Check size={20} />
                    Confirmar Aula
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
