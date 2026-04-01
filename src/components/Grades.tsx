import React from 'react';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Filter,
  Trash2,
  Edit2,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { handleFirestoreError } from '../lib/firestore-utils';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  grade: number;
  date: string;
  instructorId: string;
}

interface Student {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function Grades({ userRole }: { userRole: string | null }) {
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingGrade, setEditingGrade] = React.useState<Grade | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const [formData, setFormData] = React.useState({
    studentId: '',
    subjectId: '',
    grade: '',
    date: new Date().toISOString().split('T')[0]
  });

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const isAdmin = userRole === 'admin';
    const uid = auth.currentUser.uid;

    const qGrades = isAdmin
      ? query(collection(db, 'grades'))
      : query(collection(db, 'grades'), where('instructorId', '==', uid));
      
    const qStudents = isAdmin
      ? query(collection(db, 'students'))
      : query(collection(db, 'students'), where('instructorId', '==', uid));
      
    const qSubjects = isAdmin
      ? query(collection(db, 'subjects'))
      : query(collection(db, 'subjects'), where('instructorId', '==', uid));

    const unsubGrades = onSnapshot(qGrades, (snapshot) => {
      setGrades(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade)));
    });

    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        name: doc.data().name,
        instructorId: doc.data().instructorId
      } as Student)));
    });

    const unsubSubjects = onSnapshot(qSubjects, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Subject)));
    });

    return () => {
      unsubGrades();
      unsubStudents();
      unsubSubjects();
    };
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const selectedStudent = students.find(s => s.id === formData.studentId);
    const gradeData = {
      ...formData,
      grade: parseFloat(formData.grade),
      instructorId: selectedStudent?.instructorId || auth.currentUser.uid,
      date: new Date(formData.date).toISOString()
    };

    try {
      if (editingGrade) {
        await updateDoc(doc(db, 'grades', editingGrade.id), gradeData);
      } else {
        await addDoc(collection(db, 'grades'), gradeData);
      }
      setIsModalOpen(false);
      setEditingGrade(null);
      setFormData({ studentId: '', subjectId: '', grade: '', date: new Date().toISOString().split('T')[0] });
    } catch (error) {
      console.error("Error saving grade:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'grades', id));
    } catch (error) {
      console.error("Error deleting grade:", error);
      handleFirestoreError(error, 'delete', `grades/${id}`);
    }
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'N/A';
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'N/A';

  const calculateAverage = (studentId: string) => {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    if (studentGrades.length === 0) return 0;
    const sum = studentGrades.reduce((acc, curr) => acc + curr.grade, 0);
    return (sum / studentGrades.length).toFixed(1);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
            NOTAS E <span className="text-primary">MÉDIAS</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Controle acadêmico e acompanhamento de desempenho.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-corporate-primary w-full md:w-auto"
        >
          <Plus size={20} />
          Lançar Nota
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Student List with Averages */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar aluno..."
              className="input-corporate pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="space-y-3">
            {filteredStudents.map(student => (
              <div key={student.id} className="corporate-card p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                <div>
                  <h4 className="font-bold text-white group-hover:text-primary transition-colors">{student.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Média Geral</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-primary flex items-center gap-2">
                    <Calculator size={16} className="text-slate-500" />
                    {calculateAverage(student.id)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Grades Table */}
        <div className="lg:col-span-2">
          <div className="corporate-card overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GraduationCap className="text-primary" size={20} />
                Histórico de Notas
              </h3>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtrar</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Aluno</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Disciplina</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Nota</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">Data</th>
                    <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {grades.map((grade) => (
                    <tr key={grade.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-200">{getStudentName(grade.studentId)}</td>
                      <td className="p-4 text-sm text-slate-400">{getSubjectName(grade.subjectId)}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                          grade.grade >= 7 ? 'bg-emerald-500/10 text-emerald-500' : 
                          grade.grade >= 5 ? 'bg-primary/10 text-primary' : 
                          'bg-rose-500/10 text-rose-500'
                        }`}>
                          {grade.grade.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-500">
                        {new Date(grade.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingGrade(grade);
                              setFormData({
                                studentId: grade.studentId,
                                subjectId: grade.subjectId,
                                grade: grade.grade.toString(),
                                date: grade.date.split('T')[0]
                              });
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(grade.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="corporate-card max-w-md w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                {editingGrade ? 'EDITAR' : 'LANÇAR'} <span className="text-primary">NOTA</span>
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aluno</label>
                  <select 
                    required
                    className="input-corporate"
                    value={formData.studentId}
                    onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                  >
                    <option value="">Selecione o aluno</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disciplina</label>
                  <select 
                    required
                    className="input-corporate"
                    value={formData.subjectId}
                    onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                  >
                    <option value="">Selecione a disciplina</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nota (0-10)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="10"
                      required
                      className="input-corporate"
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data</label>
                    <input 
                      type="date" 
                      required
                      className="input-corporate"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingGrade(null);
                    }}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-800 text-slate-400 font-bold uppercase tracking-widest text-xs hover:bg-slate-900 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-corporate-primary py-3"
                  >
                    Salvar Nota
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
