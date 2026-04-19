import React from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  UserPlus,
  Mail,
  Phone,
  Filter,
  X,
  Check,
  TrendingUp,
  Award,
  BookOpen,
  Users
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
import { Student, Report, Subject } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports({ 
  userRole, 
  selectedInstructorId 
}: { 
  userRole: string | null,
  selectedInstructorId?: string | null
}) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingReport, setEditingReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);

  const effectiveInstructorId = selectedInstructorId;

  // Form state
  const [formData, setFormData] = React.useState({
    studentId: '',
    subjectId: '',
    date: new Date().toISOString(),
    performance: 0,
    behavior: '',
    technical: '',
    evolution: ''
  });

  React.useEffect(() => {
    const handleQuickAdd = () => {
      resetForm();
      setIsModalOpen(true);
    };
    window.addEventListener('app-quick-add', handleQuickAdd);
    return () => window.removeEventListener('app-quick-add', handleQuickAdd);
  }, [students]);

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const getQuery = (col: string, baseOrder: any) => {
      if (effectiveInstructorId) {
        return query(collection(db, col), where('instructorId', '==', effectiveInstructorId), baseOrder);
      }
      return query(collection(db, col), baseOrder);
    };

    const unsubscribeStudents = onSnapshot(getQuery('students', orderBy('name')), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const unsubscribeSubjects = onSnapshot(getQuery('subjects', orderBy('name')), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    });

    const unsubscribeReports = onSnapshot(getQuery('reports', orderBy('date', 'desc')), (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
      setLoading(false);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeSubjects();
      unsubscribeReports();
    };
  }, [userRole, effectiveInstructorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const selectedStudent = students.find(s => s.id === formData.studentId);
      const data = {
        ...formData,
        instructorId: selectedStudent?.instructorId || selectedInstructorId || auth.currentUser.uid
      };

      if (editingReport) {
        await updateDoc(doc(db, 'reports', editingReport.id), data);
      } else {
        await addDoc(collection(db, 'reports'), data);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving report:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reports', id));
    } catch (error) {
      console.error("Error deleting report:", error);
      handleFirestoreError(error, 'delete', `reports/${id}`);
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: selectedStudent?.id || '',
      subjectId: '',
      date: new Date().toISOString(),
      performance: 0,
      behavior: '',
      technical: '',
      evolution: ''
    });
    setEditingReport(null);
  };

  const openEditModal = (report: Report) => {
    setEditingReport(report);
    setFormData({
      studentId: report.studentId,
      subjectId: report.subjectId,
      date: report.date,
      performance: report.performance || 0,
      behavior: report.behavior || '',
      technical: report.technical || '',
      evolution: report.evolution || ''
    });
    setIsModalOpen(true);
  };

  const studentReports = reports.filter(r => r.studentId === selectedStudent?.id);
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'N/A';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">
            RELATÓRIOS <span className="text-primary">INDIVIDUAIS</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Avaliação estratégica de desempenho e evolução técnica.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Students List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-900">
            <Users className="text-primary" size={18} />
            Diretório de Alunos
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                  selectedStudent?.id === student.id 
                    ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
                    : 'bg-white border-slate-200 text-slate-400 hover:border-primary/50 shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border ${
                  selectedStudent?.id === student.id ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'
                }`}>
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Users size={20} className={selectedStudent?.id === student.id ? 'text-white/40' : 'text-slate-300'} />
                  )}
                </div>
                <span className="font-bold truncate text-sm">{student.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reports Content */}
        <div className="lg:col-span-3">
          {selectedStudent ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="corporate-card flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white shadow-sm border-slate-200">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-24 h-24 rounded-3xl bg-slate-50 border border-slate-100 overflow-hidden shadow-xl shrink-0">
                    {selectedStudent.photoUrl ? (
                      <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={48} className="text-slate-200 w-full h-full p-6" />
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">{selectedStudent.name}</h3>
                    <p className="text-primary font-bold text-sm tracking-wide truncate max-w-[200px] sm:max-w-none">{selectedStudent.email}</p>
                    <div className="flex justify-center sm:justify-start gap-6 mt-3">
                      <div className="text-left">
                        <p className="text-xl font-black text-slate-900">{studentReports.length}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Registros</p>
                      </div>
                      <div className="h-8 w-[1px] bg-slate-100"></div>
                      <div className="text-left">
                        <p className="text-xl font-black text-slate-900">
                          {(studentReports.reduce((acc, r) => acc + (r.performance || 0), 0) / (studentReports.length || 1)).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">KPI Média</p>
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="btn-corporate-primary w-full md:w-auto"
                >
                  <Plus size={20} />
                  Novo Relatório
                </button>
              </div>

              <div className="space-y-4">
                {studentReports.map((report) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="corporate-card group relative overflow-hidden bg-white shadow-sm border-slate-200"
                  >
                    <div className="absolute top-0 right-0 p-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => openEditModal(report)}
                        className="p-2 hover:bg-slate-50 rounded-xl text-blue-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(report.id)}
                        className="p-2 hover:bg-slate-50 rounded-xl text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="md:w-1/3">
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Unidade Curricular</p>
                          <h4 className="font-bold text-primary truncate text-lg">{getSubjectName(report.subjectId)}</h4>
                          <p className="text-xs text-slate-400 mt-2 font-medium">
                            {format(new Date(report.date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <div className="mt-6 pt-6 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">Performance Score</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden border border-slate-100">
                                <div 
                                  className="h-full bg-primary" 
                                  style={{ width: `${(report.performance || 0) * 10}%` }}
                                />
                              </div>
                              <span className="font-black text-slate-700 text-lg">{report.performance || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="md:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <TrendingUp size={14} className="text-primary" />
                            Comportamental
                          </h5>
                          <p className="text-sm text-slate-600 leading-relaxed italic">"{report.behavior || 'Nenhuma observação registrada.'}"</p>
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Award size={14} className="text-primary" />
                            Técnico
                          </h5>
                          <p className="text-sm text-slate-600 leading-relaxed">{report.technical || 'Nenhuma observação registrada.'}</p>
                        </div>
                        <div>
                          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <BookOpen size={14} className="text-primary" />
                            Evolução
                          </h5>
                          <p className="text-sm text-slate-600 leading-relaxed">{report.evolution || 'Nenhuma observação registrada.'}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {studentReports.length === 0 && (
                  <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <FileText size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Nenhum relatório estratégico encontrado para este perfil.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-16 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50 shadow-sm">
              <div className="p-6 md:p-8 bg-white rounded-full mb-6 md:mb-8 border border-slate-100 shadow-xl shadow-primary/10">
                <FileText size={32} className="text-primary animate-pulse md:w-12 md:h-12" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3 tracking-tight">SELECIONE UM ALUNO</h3>
              <p className="text-slate-500 max-w-xs leading-relaxed text-sm md:text-base">Acesse o diretório ao lado para gerenciar os relatórios de desempenho corporativo.</p>
            </div>
          )}
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
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="relative bg-white border border-slate-200 w-full max-w-2xl rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-slate-200/50 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">
                  {editingReport ? 'EDITAR' : 'NOVO'} <span className="text-primary">RELATÓRIO</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Unidade Curricular</label>
                    <select 
                      required
                      className="input-corporate w-full bg-slate-50"
                      value={formData.subjectId}
                      onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                    >
                      <option value="" className="bg-white">Selecione...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id} className="bg-white">{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Performance KPI (0-10)</label>
                    <input 
                      type="number" 
                      min="0"
                      max="10"
                      step="0.1"
                      className="input-corporate w-full bg-slate-50"
                      value={formData.performance}
                      onChange={(e) => setFormData({...formData, performance: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Observações Comportamentais</label>
                  <textarea 
                    className="input-corporate w-full h-24 resize-none bg-slate-50"
                    placeholder="Descreva o comportamento técnico e social..."
                    value={formData.behavior}
                    onChange={(e) => setFormData({...formData, behavior: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Avaliação de Competências</label>
                  <textarea 
                    className="input-corporate w-full h-24 resize-none bg-slate-50"
                    placeholder="Avalie as habilidades técnicas demonstradas..."
                    value={formData.technical}
                    onChange={(e) => setFormData({...formData, technical: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Evolução e Feedback</label>
                  <textarea 
                    className="input-corporate w-full h-24 resize-none bg-slate-50"
                    placeholder="Notas sobre o progresso e próximos passos..."
                    value={formData.evolution}
                    onChange={(e) => setFormData({...formData, evolution: e.target.value})}
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
                    Finalizar Relatório
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
