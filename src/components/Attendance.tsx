import React from 'react';
import { 
  CheckSquare, 
  Search, 
  Calendar, 
  Users, 
  Check, 
  Plus,
  X, 
  AlertCircle,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  Timestamp,
  setDoc,
  doc
} from 'firebase/firestore';
import { Student, Class, Attendance, Subject } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { handleFirestoreError } from '../lib/firestore-utils';

export default function AttendanceComponent({ 
  userRole, 
  selectedInstructorId 
}: { 
  userRole: string | null, 
  selectedInstructorId?: string | null 
}) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<Class | null>(null);
  const [attendanceRecords, setAttendanceRecords] = React.useState<Attendance[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [classFormData, setClassFormData] = React.useState({
    subjectId: '',
    date: new Date().toISOString(),
    content: '',
    status: 'planned' as 'planned' | 'completed'
  });

  const effectiveInstructorId = selectedInstructorId;

  React.useEffect(() => {
    const handleQuickAdd = () => {
      setClassFormData({
        subjectId: '',
        date: new Date().toISOString(),
        content: '',
        status: 'planned'
      });
      setIsAddModalOpen(true);
    };
    window.addEventListener('app-quick-add', handleQuickAdd);
    return () => window.removeEventListener('app-quick-add', handleQuickAdd);
  }, []);

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const getQuery = (col: string, baseOrder: any) => {
      if (effectiveInstructorId) {
        return query(collection(db, col), where('instructorId', '==', effectiveInstructorId), baseOrder);
      }
      return query(collection(db, col), baseOrder);
    };

    const unsubscribeStudents = onSnapshot(query(collection(db, 'students'), orderBy('name')), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const unsubscribeClasses = onSnapshot(getQuery('classes', orderBy('date', 'desc')), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
    });

    const unsubscribeSubjects = onSnapshot(getQuery('subjects', orderBy('name')), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    });

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
      unsubscribeSubjects();
    };
  }, [userRole, effectiveInstructorId]);

  React.useEffect(() => {
    if (selectedClass && auth.currentUser) {
      const qAttendance = effectiveInstructorId
        ? query(collection(db, 'attendance'), where('classId', '==', selectedClass.id), where('instructorId', '==', effectiveInstructorId))
        : query(collection(db, 'attendance'), where('classId', '==', selectedClass.id));
          
      const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
        setAttendanceRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
      }, (error) => {
        handleFirestoreError(error, 'list', 'attendance');
      });
      return () => unsubscribeAttendance();
    }
  }, [selectedClass, userRole, effectiveInstructorId]);

  const selectedCourseId = React.useMemo(() => {
    if (!selectedClass) return null;
    return subjects.find(s => s.id === selectedClass.subjectId)?.courseId;
  }, [selectedClass, subjects]);

  const [showAllStudents, setShowAllStudents] = React.useState(false);

  const filteredStudents = React.useMemo(() => {
    let result = students;
    if (selectedCourseId && !showAllStudents) {
      // Filter students by course assignment
      result = result.filter(s => s.courseIds?.includes(selectedCourseId));
    }
    if (searchTerm) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [students, selectedCourseId, searchTerm]);

  const handleAttendance = async (studentId: string, status: 'present' | 'absent' | 'justified') => {
    if (!selectedClass || !auth.currentUser) return;

    const existing = attendanceRecords.find(r => r.studentId === studentId);
    try {
      const docId = existing ? existing.id : `${selectedClass.id}_${studentId}`;
      await setDoc(doc(db, 'attendance', docId), {
        classId: selectedClass.id,
        studentId,
        status,
        date: new Date().toISOString(),
        instructorId: selectedClass.instructorId || selectedInstructorId || auth.currentUser.uid
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
      handleFirestoreError(error, 'write', 'attendance');
    }
  };

  const handleMarkAllPresent = async () => {
    if (!selectedClass || !auth.currentUser || filteredStudents.length === 0) return;

    try {
      const promises = filteredStudents.map(student => {
        const existing = attendanceRecords.find(r => r.studentId === student.id);
        const docId = existing ? existing.id : `${selectedClass.id}_${student.id}`;
        return setDoc(doc(db, 'attendance', docId), {
          classId: selectedClass.id,
          studentId: student.id,
          status: 'present',
          date: new Date().toISOString(),
          instructorId: selectedClass.instructorId || auth.currentUser.uid
        });
      });
      await Promise.all(promises);
    } catch (error) {
      console.error("Error marking all present:", error);
      handleFirestoreError(error, 'write', 'attendance');
    }
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...classFormData,
        instructorId: selectedInstructorId || auth.currentUser.uid
      };
      await addDoc(collection(db, 'classes'), data);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error saving class:", error);
      handleFirestoreError(error, 'write', 'classes');
    }
  };

  const getStudentStatus = (studentId: string) => {
    return attendanceRecords.find(r => r.studentId === studentId)?.status;
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Disciplina Desconhecida';
  };

  return (
    <>
      <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">
            LISTA DE <span className="text-primary">PRESENÇA</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Controle de frequência e auditoria de participação.</p>
        </div>
        <button 
          onClick={() => {
            setClassFormData({
              subjectId: '',
              date: new Date().toISOString(),
              content: '',
              status: 'planned'
            });
            setIsAddModalOpen(true);
          }}
          className="btn-corporate-primary w-full md:w-auto"
        >
          <Plus size={20} />
          Agendar Aula
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Classes List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900">
            <Calendar className="text-primary" size={18} />
            Selecionar Aula
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                  selectedClass?.id === cls.id 
                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                    : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                    selectedClass?.id === cls.id ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-100 text-primary'
                  }`}>
                    {cls.status}
                  </span>
                  <span className={`text-[10px] font-bold ${selectedClass?.id === cls.id ? 'text-white/80' : 'text-slate-500'}`}>
                    {format(new Date(cls.date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <h4 className={`font-bold truncate text-base ${selectedClass?.id === cls.id ? 'text-white' : 'text-slate-800'}`}>{getSubjectName(cls.subjectId)}</h4>
                <p className={`text-xs mt-2 line-clamp-1 ${selectedClass?.id === cls.id ? 'text-white/70' : 'text-slate-500'}`}>
                  {cls.content || 'Sem descrição de conteúdo'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Marking */}
        <div className="lg:col-span-2">
          {selectedClass ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="corporate-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-100">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">
                    CHAMADA: <span className="text-primary uppercase">{getSubjectName(selectedClass.subjectId)}</span>
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    {format(new Date(selectedClass.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right bg-white p-3 md:p-4 rounded-2xl border border-slate-200 self-end sm:self-auto shadow-sm">
                  <p className="text-2xl md:text-3xl font-black text-primary">
                    {attendanceRecords.filter(r => r.status === 'present').length}/{filteredStudents.length}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Presentes</p>
                </div>
              </div>

              <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar aluno nesta turma..."
                    className="input-corporate w-full pl-12 h-12 text-sm bg-slate-50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleMarkAllPresent}
                  disabled={filteredStudents.length === 0}
                  className="btn-corporate-outline h-12 px-6 whitespace-nowrap flex items-center gap-2 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                >
                  <Check size={16} />
                  Marcar Todos Presentes
                </button>
              </div>

              <div className="space-y-3">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                  const status = getStudentStatus(student.id);
                  return (
                    <div 
                      key={student.id} 
                      onClick={() => handleAttendance(student.id, status === 'present' ? 'absent' : 'present')}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border transition-all group gap-4 shadow-sm cursor-pointer ${
                        status === 'present' ? 'border-emerald-500/30 bg-emerald-50/20' : 'border-slate-100 hover:border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center overflow-hidden shadow-inner transition-colors ${
                          status === 'present' ? 'bg-emerald-100 border-emerald-200' : 'bg-slate-50 border-slate-100'
                        }`}>
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Users size={24} className={status === 'present' ? 'text-emerald-500' : 'text-slate-300'} />
                          )}
                        </div>
                        <div className="max-w-[200px] md:max-w-xs">
                          <span className={`font-bold transition-colors block truncate ${status === 'present' ? 'text-emerald-700' : 'text-slate-700 group-hover:text-primary'}`}>{student.name}</span>
                          <p className={`text-[10px] uppercase font-bold tracking-widest ${status === 'present' ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {status === 'present' ? 'Presença Confirmada' : 'Matrícula Ativa'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleAttendance(student.id, 'present')}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                            status === 'present' 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-110' 
                              : 'bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50'
                          }`}
                          title="Presente"
                        >
                          <Check size={24} />
                        </button>
                        <button
                          onClick={() => handleAttendance(student.id, 'absent')}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                            status === 'absent' 
                              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-110' 
                              : 'bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-500/50'
                          }`}
                          title="Ausente"
                        >
                          <X size={24} />
                        </button>
                        <button
                          onClick={() => handleAttendance(student.id, 'justified')}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                            status === 'justified' 
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 scale-110' 
                              : 'bg-white border border-slate-200 text-slate-400 hover:text-amber-500 hover:border-amber-500/50'
                          }`}
                          title="Justificado"
                        >
                          <AlertCircle size={24} />
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-12 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                    <Users className="mx-auto text-slate-300 mb-4" size={40} />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Nenhum aluno encontrado para este curso.
                    </p>
                    <div className="mt-4 flex flex-col items-center gap-4">
                      <p className="text-[10px] text-slate-400 max-w-xs">
                        Este curso parece não ter alunos vinculados. Você pode ver todos os alunos do sistema se desejar.
                      </p>
                      <button 
                        onClick={() => setShowAllStudents(true)}
                        className="btn-corporate-primary text-[10px] px-6 py-2"
                      >
                        Mostrar Todos os Alunos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-16 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white shadow-sm">
              <div className="p-6 md:p-8 bg-slate-50 rounded-full mb-6 md:mb-8 border border-slate-100 shadow-xl shadow-primary/5">
                <ArrowRight size={32} className="text-primary animate-pulse md:w-12 md:h-12" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3 tracking-tight">SELECIONE UMA AULA</h3>
              <p className="text-slate-500 max-w-xs leading-relaxed text-sm md:text-base">Escolha uma aula na lista ao lado para iniciar o processo de chamada corporativa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    
      {/* Add Class Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="relative bg-white border border-slate-200 w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-slate-200/50 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">
                  AGENDAR <span className="text-primary">AULA</span>
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleClassSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Unidade Curricular</label>
                  <select 
                    required
                    className="input-corporate w-full bg-slate-50"
                    value={classFormData.subjectId}
                    onChange={(e) => setClassFormData({...classFormData, subjectId: e.target.value})}
                  >
                    <option value="" className="bg-white">Selecione...</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id} className="bg-white">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Data e Horário</label>
                    <input 
                      required
                      type="datetime-local" 
                      className="input-corporate w-full bg-slate-50"
                      value={classFormData.date.slice(0, 16)}
                      onChange={(e) => setClassFormData({...classFormData, date: new Date(e.target.value).toISOString()})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Status Operacional</label>
                    <select 
                      className="input-corporate w-full bg-slate-50"
                      value={classFormData.status}
                      onChange={(e) => setClassFormData({...classFormData, status: e.target.value as any})}
                    >
                      <option value="planned" className="bg-white">Planejada</option>
                      <option value="completed" className="bg-white">Concluída</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Conteúdo Programático</label>
                  <textarea 
                    className="input-corporate w-full h-32 resize-none bg-slate-50"
                    placeholder="Quais competências serão abordadas nesta sessão?"
                    value={classFormData.content}
                    onChange={(e) => setClassFormData({...classFormData, content: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
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
    </>
  );
}
