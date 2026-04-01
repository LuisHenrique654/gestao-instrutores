import React from 'react';
import { 
  BookOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Layers, 
  X, 
  Check,
  ChevronRight,
  Info
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
import { Course, Subject } from '../types';

export default function Courses({ userRole }: { userRole: string | null }) {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = React.useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null);

  // Form states
  const [courseForm, setCourseForm] = React.useState({ name: '', description: '' });
  const [subjectForm, setSubjectForm] = React.useState({ name: '', description: '', courseId: '' });

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const isAdmin = userRole === 'admin';

    const qCourses = isAdmin
      ? query(collection(db, 'courses'), orderBy('name'))
      : query(collection(db, 'courses'), where('instructorId', '==', uid), orderBy('name'));
      
    const unsubscribeCourses = onSnapshot(qCourses, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)));
    });

    const qSubjects = isAdmin
      ? query(collection(db, 'subjects'), orderBy('name'))
      : query(collection(db, 'subjects'), where('instructorId', '==', uid), orderBy('name'));
      
    const unsubscribeSubjects = onSnapshot(qSubjects, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
    });

    return () => {
      unsubscribeCourses();
      unsubscribeSubjects();
    };
  }, [userRole]);

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...courseForm,
        instructorId: auth.currentUser.uid
      };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), data);
      } else {
        await addDoc(collection(db, 'courses'), data);
      }
      setIsCourseModalOpen(false);
      setCourseForm({ name: '', description: '' });
      setEditingCourse(null);
    } catch (error) {
      console.error("Error saving course:", error);
    }
  };

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...subjectForm,
        instructorId: auth.currentUser.uid
      };

      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id), data);
      } else {
        await addDoc(collection(db, 'subjects'), data);
      }
      setIsSubjectModalOpen(false);
      setSubjectForm({ name: '', description: '', courseId: selectedCourse?.id || '' });
      setEditingSubject(null);
    } catch (error) {
      console.error("Error saving subject:", error);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'courses', id));
      // Also delete related subjects
      const relatedSubjects = subjects.filter(s => s.courseId === id);
      for (const s of relatedSubjects) {
        await deleteDoc(doc(db, 'subjects', s.id));
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      handleFirestoreError(error, 'delete', `courses/${id}`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'subjects', id));
    } catch (error) {
      console.error("Error deleting subject:", error);
      handleFirestoreError(error, 'delete', `subjects/${id}`);
    }
  };

  const courseSubjects = subjects.filter(s => s.courseId === selectedCourse?.id);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
            CURSOS E <span className="text-primary">DISCIPLINAS</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Gestão de ativos educacionais e conteúdo programático.</p>
        </div>
        <button 
          onClick={() => { setEditingCourse(null); setCourseForm({ name: '', description: '' }); setIsCourseModalOpen(true); }}
          className="btn-corporate-primary w-full md:w-auto"
        >
          <Plus size={20} />
          Novo Curso
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Courses List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-white">
            <BookOpen className="text-primary" size={18} />
            Portfólio de Cursos
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {courses.map((course) => (
              <div key={course.id} className="group relative">
                <button
                  onClick={() => setSelectedCourse(course)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                    selectedCourse?.id === course.id 
                      ? 'bg-primary border-primary text-slate-950 shadow-xl shadow-primary/20 scale-[1.02]' 
                      : 'bg-surface border-border text-slate-400 hover:border-primary/50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-black text-lg truncate uppercase tracking-tighter">{course.name}</h4>
                    <ChevronRight size={20} className={selectedCourse?.id === course.id ? 'text-slate-950' : 'text-slate-600'} />
                  </div>
                  <p className={`text-xs line-clamp-2 leading-relaxed ${selectedCourse?.id === course.id ? 'text-slate-950/70' : 'text-slate-500'}`}>
                    {course.description || 'Sem descrição estratégica definida.'}
                  </p>
                </button>
                <div className="absolute top-3 right-3 flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingCourse(course); setCourseForm({ name: course.name, description: course.description || '' }); setIsCourseModalOpen(true); }}
                    className={`p-2 rounded-xl transition-colors ${selectedCourse?.id === course.id ? 'bg-slate-950/10 text-slate-950 hover:bg-slate-950/20' : 'bg-slate-950 border border-slate-800 text-blue-400 hover:bg-slate-800'}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                    className={`p-2 rounded-xl transition-colors ${selectedCourse?.id === course.id ? 'bg-slate-950/10 text-slate-950 hover:bg-slate-950/20' : 'bg-slate-950 border border-slate-800 text-rose-500 hover:bg-slate-800'}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subjects List */}
        <div className="lg:col-span-2">
          {selectedCourse ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="corporate-card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-slate-800">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase">
                    DISCIPLINAS: <span className="text-primary">{selectedCourse.name}</span>
                  </h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">Gestão de módulos e competências técnicas.</p>
                </div>
                <button 
                  onClick={() => { setEditingSubject(null); setSubjectForm({ name: '', description: '', courseId: selectedCourse.id }); setIsSubjectModalOpen(true); }}
                  className="btn-corporate-outline w-full sm:w-auto"
                >
                  <Plus size={20} />
                  Nova Disciplina
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courseSubjects.map((subject) => (
                  <div key={subject.id} className="p-6 bg-slate-900/30 rounded-2xl border border-slate-800/50 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-5">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-primary shadow-inner">
                        <Layers size={20} />
                      </div>
                      <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => { setEditingSubject(subject); setSubjectForm({ name: subject.name, description: subject.description || '', courseId: subject.courseId }); setIsSubjectModalOpen(true); }}
                          className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSubject(subject.id)}
                          className="p-2 hover:bg-slate-800 rounded-xl text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-lg mb-2 group-hover:text-primary transition-colors">{subject.name}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">{subject.description || 'Sem descrição técnica.'}</p>
                  </div>
                ))}
                {courseSubjects.length === 0 && (
                  <div className="col-span-2 text-center py-20 bg-slate-950/20 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                    <Info size={48} className="text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhuma disciplina vinculada a este curso.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-16 border-2 border-dashed border-slate-800 rounded-[2.5rem] bg-slate-950/20">
              <div className="p-6 md:p-8 bg-slate-900 rounded-full mb-6 md:mb-8 border border-slate-800 shadow-2xl shadow-primary/5">
                <BookOpen size={32} className="text-primary animate-pulse md:w-12 md:h-12" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-white mb-3 tracking-tight">SELECIONE UM CURSO</h3>
              <p className="text-slate-500 max-w-xs leading-relaxed text-sm md:text-base">Acesse o portfólio ao lado para gerenciar as disciplinas e competências.</p>
            </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      <AnimatePresence>
        {isCourseModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCourseModalOpen(false)}
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
                  {editingCourse ? 'EDITAR' : 'NOVO'} <span className="text-primary">CURSO</span>
                </h3>
                <button onClick={() => setIsCourseModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCourseSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nome do Curso</label>
                  <input 
                    required
                    type="text" 
                    className="input-corporate w-full"
                    placeholder="Ex: Desenvolvimento Web Fullstack"
                    value={courseForm.name}
                    onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Descrição Estratégica</label>
                  <textarea 
                    className="input-corporate w-full h-32 resize-none"
                    placeholder="Defina os objetivos e metas do curso..."
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsCourseModalOpen(false)}
                    className="flex-1 btn-corporate-outline"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-corporate-primary"
                  >
                    <Check size={20} />
                    Salvar Curso
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subject Modal */}
      <AnimatePresence>
        {isSubjectModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubjectModalOpen(false)}
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
                  {editingSubject ? 'EDITAR' : 'NOVA'} <span className="text-primary">DISCIPLINA</span>
                </h3>
                <button onClick={() => setIsSubjectModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubjectSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nome da Disciplina</label>
                  <input 
                    required
                    type="text" 
                    className="input-corporate w-full"
                    placeholder="Ex: Introdução ao React"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Conteúdo Programático</label>
                  <textarea 
                    className="input-corporate w-full h-32 resize-none"
                    placeholder="Quais competências serão abordadas?"
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({...subjectForm, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsSubjectModalOpen(false)}
                    className="flex-1 btn-corporate-outline"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-corporate-primary"
                  >
                    <Check size={20} />
                    Salvar Disciplina
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
