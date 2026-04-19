import React from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserPlus,
  Mail,
  Phone,
  Filter,
  X,
  Check,
  FileText,
  Paperclip,
  ExternalLink,
  Upload,
  Loader2
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
import { Student, Course } from '../types';

export default function Students({ userRole }: { userRole: string | null }) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    photoUrl: '',
    courseIds: [] as string[],
    documents: [] as { name: string, url: string, type: string }[]
  });

  const [newDoc, setNewDoc] = React.useState({ name: '', url: '', type: 'atestado' });

  React.useEffect(() => {
    const handleQuickAdd = () => {
      resetForm();
      setIsModalOpen(true);
    };
    window.addEventListener('app-quick-add', handleQuickAdd);
    return () => window.removeEventListener('app-quick-add', handleQuickAdd);
  }, []);

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const isAdmin = userRole === 'admin';
    const q = isAdmin
      ? query(collection(db, 'students'), orderBy('name'))
      : query(
          collection(db, 'students'), 
          where('instructorId', '==', auth.currentUser.uid),
          orderBy('name')
        );
        
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentData);
      setLoading(false);
    });

    const qCourses = isAdmin
      ? query(collection(db, 'courses'), orderBy('name'))
      : query(
          collection(db, 'courses'), 
          where('instructorId', '==', auth.currentUser.uid),
          orderBy('name')
        );
        
    const unsubscribeCourses = onSnapshot(qCourses, (snapshot) => {
      const courseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(courseData);
    });

    return () => {
      unsubscribe();
      unsubscribeCourses();
    };
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      // Auto-add document if fields are filled but '+' wasn't clicked
      let finalDocuments = [...formData.documents];
      if (newDoc.name && newDoc.url) {
        finalDocuments.push({ ...newDoc });
      }

      const data = {
        ...formData,
        documents: finalDocuments,
        instructorId: auth.currentUser.uid
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), data);
      } else {
        await addDoc(collection(db, 'students'), data);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (error) {
      console.error("Error deleting student:", error);
      handleFirestoreError(error, 'delete', `students/${id}`);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', photoUrl: '', courseIds: [], documents: [] });
    setEditingStudent(null);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email || '',
      phone: student.phone || '',
      photoUrl: student.photoUrl || '',
      courseIds: student.courseIds || [],
      documents: (student as any).documents || []
    });
    setIsModalOpen(true);
  };

  const addDocument = () => {
    if (newDoc.name && newDoc.url) {
      setFormData({
        ...formData,
        documents: [...formData.documents, newDoc]
      });
      setNewDoc({ name: '', url: '', type: 'atestado' });
    }
  };

  const removeDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index)
    });
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">
            GESTÃO DE <span className="text-primary">ALUNOS</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Base de dados corporativa de alunos e colaboradores.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="btn-corporate-primary w-full md:w-auto"
        >
          <UserPlus size={20} />
          Novo Aluno
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..."
            className="input-corporate w-full pl-12 h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-corporate-outline flex items-center gap-2 h-12">
          <Filter size={20} />
          Filtrar Turma
        </button>
      </div>

      {/* Students List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredStudents.map((student) => (
            <motion.div
              key={student.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="corporate-card group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner group-hover:bg-primary/5 transition-colors">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={32} className="text-slate-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors">{student.name}</h4>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 inline-block">
                      {student.courseIds.length > 0 
                        ? `${student.courseIds.length} Curso(s)` 
                        : 'Sem curso'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => openEditModal(student)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-blue-600 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(student.id)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-rose-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Documents Preview */}
              {student.documents && student.documents.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    <Paperclip size={10} className="text-primary" />
                    Documentos ({student.documents.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.documents.slice(0, 2).map((doc, idx) => (
                      <a 
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 hover:text-primary hover:border-primary/50 transition-all max-w-[120px] shadow-sm"
                      >
                        <FileText size={12} className="shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </a>
                    ))}
                    {student.documents.length > 2 && (
                      <button 
                        onClick={() => openEditModal(student)}
                        className="text-[10px] text-slate-400 hover:text-primary font-bold underline decoration-slate-200"
                      >
                        +{student.documents.length - 2} mais
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Mail size={14} className="text-primary" />
                  <span className="truncate">{student.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Phone size={14} className="text-primary" />
                  <span>{student.phone || 'N/A'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
              className="relative bg-white border border-slate-200 w-full max-w-lg rounded-[2.5rem] p-6 md:p-10 shadow-2xl shadow-slate-200/50 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 md:mb-10">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">
                  {editingStudent ? 'EDITAR' : 'NOVO'} <span className="text-primary">ALUNO</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="input-corporate w-full bg-slate-50"
                    placeholder="Ex: João Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Corporativo</label>
                    <input 
                      type="email" 
                      className="input-corporate w-full bg-slate-50"
                      placeholder="joao@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Telefone</label>
                    <input 
                      type="text" 
                      className="input-corporate w-full bg-slate-50"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">URL da Foto</label>
                  <input 
                    type="text" 
                    className="input-corporate w-full bg-slate-50"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Atribuição de Cursos</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {courses.map(course => (
                      <label key={course.id} className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-primary transition-all">
                        <input 
                          type="checkbox"
                          checked={formData.courseIds.includes(course.id)}
                          onChange={(e) => {
                            const ids = e.target.checked 
                              ? [...formData.courseIds, course.id]
                              : formData.courseIds.filter(id => id !== course.id);
                            setFormData({...formData, courseIds: ids});
                          }}
                          className="accent-primary w-4 h-4 rounded border-slate-200 bg-white"
                        />
                        {course.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Documentos e Atestados (Insira a URL abaixo)</label>
                  </div>
                                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Nome do documento"
                      className="input-corporate flex-1 text-xs bg-slate-50"
                      value={newDoc.name}
                      onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                    />
                    <input 
                      type="url" 
                      placeholder="URL do arquivo"
                      className="input-corporate flex-1 text-xs bg-slate-50"
                      value={newDoc.url}
                      onChange={(e) => setNewDoc({...newDoc, url: e.target.value})}
                    />
                    <select
                      className="input-corporate text-xs w-24 bg-slate-50"
                      value={newDoc.type}
                      onChange={(e) => setNewDoc({...newDoc, type: e.target.value})}
                    >
                      <option value="atestado" className="bg-white">Atestado</option>
                      <option value="contrato" className="bg-white">Contrato</option>
                      <option value="identidade" className="bg-white">ID/RG</option>
                      <option value="outro" className="bg-white">Outro</option>
                    </select>
                    <button 
                      type="button"
                      onClick={addDocument}
                      disabled={!newDoc.name || !newDoc.url}
                      className={`p-3 rounded-xl transition-all ${
                        !newDoc.name || !newDoc.url 
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' 
                        : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 scale-100 active:scale-90'
                      }`}
                      title="Adicionar à lista"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 group shadow-sm">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-primary" />
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-700 font-medium">{doc.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{doc.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-all">
                            <ExternalLink size={14} />
                          </a>
                          <button 
                            type="button"
                            onClick={() => removeDocument(i)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    Salvar Registro
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
