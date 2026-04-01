import React from 'react';
import { 
  CheckSquare, 
  Search, 
  Calendar, 
  Users, 
  Check, 
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

export default function AttendanceComponent({ userRole }: { userRole: string | null }) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [classes, setClasses] = React.useState<Class[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<Class | null>(null);
  const [attendanceRecords, setAttendanceRecords] = React.useState<Attendance[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const isAdmin = userRole === 'admin';

    const qStudents = isAdmin 
      ? query(collection(db, 'students'), orderBy('name'))
      : query(collection(db, 'students'), where('instructorId', '==', uid), orderBy('name'));
      
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    }, (error) => {
      handleFirestoreError(error, 'list', 'students');
    });

    const qClasses = isAdmin
      ? query(collection(db, 'classes'), orderBy('date', 'desc'))
      : query(collection(db, 'classes'), where('instructorId', '==', uid), orderBy('date', 'desc'));
      
    const unsubscribeClasses = onSnapshot(qClasses, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Class)));
    }, (error) => {
      handleFirestoreError(error, 'list', 'classes');
    });

    const qSubjects = isAdmin
      ? query(collection(db, 'subjects'), orderBy('name'))
      : query(collection(db, 'subjects'), where('instructorId', '==', uid), orderBy('name'));
      
    const unsubscribeSubjects = onSnapshot(qSubjects, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    }, (error) => {
      handleFirestoreError(error, 'list', 'subjects');
    });

    return () => {
      unsubscribeStudents();
      unsubscribeClasses();
      unsubscribeSubjects();
    };
  }, [userRole]);

  React.useEffect(() => {
    if (selectedClass && auth.currentUser) {
      const isAdmin = userRole === 'admin';
      const qAttendance = isAdmin
        ? query(collection(db, 'attendance'), where('classId', '==', selectedClass.id))
        : query(
            collection(db, 'attendance'), 
            where('classId', '==', selectedClass.id),
            where('instructorId', '==', auth.currentUser.uid)
          );
          
      const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
        setAttendanceRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
      }, (error) => {
        handleFirestoreError(error, 'list', 'attendance');
      });
      return () => unsubscribeAttendance();
    }
  }, [selectedClass, userRole]);

  const selectedCourseId = React.useMemo(() => {
    if (!selectedClass) return null;
    return subjects.find(s => s.id === selectedClass.subjectId)?.courseId;
  }, [selectedClass, subjects]);

  const filteredStudents = React.useMemo(() => {
    let result = students;
    if (selectedCourseId) {
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
        instructorId: selectedClass.instructorId || auth.currentUser.uid
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

  const getStudentStatus = (studentId: string) => {
    return attendanceRecords.find(r => r.studentId === studentId)?.status;
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Disciplina Desconhecida';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
            LISTA DE <span className="text-primary">PRESENÇA</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Controle de frequência e auditoria de participação.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Classes List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-white">
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
                    ? 'bg-primary border-primary text-slate-950 shadow-xl shadow-primary/20 scale-[1.02]' 
                    : 'bg-surface border-border text-slate-400 hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                    selectedClass?.id === cls.id ? 'bg-slate-950/10 border-slate-950/20 text-slate-950' : 'bg-slate-950 border-slate-800 text-primary'
                  }`}>
                    {cls.status}
                  </span>
                  <span className={`text-[10px] font-bold ${selectedClass?.id === cls.id ? 'text-slate-900' : 'text-slate-500'}`}>
                    {format(new Date(cls.date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <h4 className="font-bold truncate text-base">{getSubjectName(cls.subjectId)}</h4>
                <p className={`text-xs mt-2 line-clamp-1 ${selectedClass?.id === cls.id ? 'text-slate-900/70' : 'text-slate-500'}`}>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-800">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                    CHAMADA: <span className="text-primary uppercase">{getSubjectName(selectedClass.subjectId)}</span>
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    {format(new Date(selectedClass.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="text-right bg-slate-950 p-3 md:p-4 rounded-2xl border border-slate-800 self-end sm:self-auto">
                  <p className="text-2xl md:text-3xl font-black text-primary">
                    {attendanceRecords.filter(r => r.status === 'present').length}/{filteredStudents.length}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Presentes</p>
                </div>
              </div>

              <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar aluno nesta turma..."
                    className="input-corporate w-full pl-12 h-12 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleMarkAllPresent}
                  disabled={filteredStudents.length === 0}
                  className="btn-corporate-outline h-12 px-6 whitespace-nowrap flex items-center gap-2 text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                >
                  <Check size={16} />
                  Marcar Todos Presentes
                </button>
              </div>

              <div className="space-y-3">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                  const status = getStudentStatus(student.id);
                  return (
                    <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/30 rounded-2xl border border-slate-800/50 hover:border-primary/20 transition-all group gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Users size={24} className="text-slate-700" />
                          )}
                        </div>
                        <div className="max-w-[200px] md:max-w-xs">
                          <span className="font-bold text-slate-200 group-hover:text-white transition-colors block truncate">{student.name}</span>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Matrícula Ativa</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleAttendance(student.id, 'present')}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                            status === 'present' 
                              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 scale-110' 
                              : 'bg-slate-950 border border-slate-800 text-slate-600 hover:text-emerald-500 hover:border-emerald-500/50'
                          }`}
                          title="Presente"
                        >
                          <Check size={24} />
                        </button>
                        <button
                          onClick={() => handleAttendance(student.id, 'absent')}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                            status === 'absent' 
                              ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20 scale-110' 
                              : 'bg-slate-950 border border-slate-800 text-slate-600 hover:text-rose-500 hover:border-rose-500/50'
                          }`}
                          title="Ausente"
                        >
                          <X size={24} />
                        </button>
                        <button
                          onClick={() => handleAttendance(student.id, 'justified')}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 ${
                            status === 'justified' 
                              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-110' 
                              : 'bg-slate-950 border border-slate-800 text-slate-600 hover:text-amber-500 hover:border-amber-500/50'
                          }`}
                          title="Justificado"
                        >
                          <AlertCircle size={24} />
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-12 text-center bg-slate-950/30 rounded-[2rem] border border-dashed border-slate-800">
                    <Users className="mx-auto text-slate-700 mb-4" size={40} />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                      Nenhum aluno encontrado para este curso ou busca.
                    </p>
                    <p className="text-[10px] text-slate-600 mt-2">
                      Verifique se os alunos estão vinculados ao curso desta disciplina.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-16 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/20">
              <div className="p-6 md:p-8 bg-slate-900 rounded-full mb-6 md:mb-8 border border-slate-800 shadow-2xl shadow-primary/5">
                <ArrowRight size={32} className="text-primary animate-pulse md:w-12 md:h-12" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-3 tracking-tight">SELECIONE UMA AULA</h3>
              <p className="text-slate-500 max-w-xs leading-relaxed text-sm md:text-base">Escolha uma aula na lista ao lado para iniciar o processo de chamada corporativa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
