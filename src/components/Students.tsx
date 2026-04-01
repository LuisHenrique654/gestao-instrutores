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
import { db, auth, storage } from '../firebase';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Student, Course } from '../types';

export default function Students({ userRole }: { userRole: string | null }) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);

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

  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const storageRef = ref(storage, `students/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, { name: file.name, url, type: 'atestado' }]
      }));
    } catch (error: any) {
      console.error("Error uploading document:", error);
      if (error.code === 'storage/unauthorized') {
        setUploadError('Erro de permissão: Verifique se as regras do Firebase Storage permitem o upload.');
      } else if (error.code === 'storage/retry-limit-exceeded') {
        setUploadError('Limite de tempo excedido. Verifique sua conexão.');
      } else {
        setUploadError(`Erro ao fazer upload: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...formData,
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
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
            GESTÃO DE <span className="text-primary">ALUNOS</span>
          </h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">Base de dados corporativa de alunos e colaboradores.</p>
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
                  <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={32} className="text-slate-700" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{student.name}</h4>
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
                    className="p-2 hover:bg-slate-800 rounded-xl text-blue-400 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(student.id)}
                    className="p-2 hover:bg-slate-800 rounded-xl text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Mail size={14} className="text-primary" />
                  <span className="truncate">{student.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
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
                  {editingStudent ? 'EDITAR' : 'NOVO'} <span className="text-primary">ALUNO</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="input-corporate w-full"
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
                      className="input-corporate w-full"
                      placeholder="joao@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Telefone</label>
                    <input 
                      type="text" 
                      className="input-corporate w-full"
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
                    className="input-corporate w-full"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Atribuição de Cursos</label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    {courses.map(course => (
                      <label key={course.id} className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-primary transition-all">
                        <input 
                          type="checkbox"
                          checked={formData.courseIds.includes(course.id)}
                          onChange={(e) => {
                            const ids = e.target.checked 
                              ? [...formData.courseIds, course.id]
                              : formData.courseIds.filter(id => id !== course.id);
                            setFormData({...formData, courseIds: ids});
                          }}
                          className="accent-primary w-4 h-4 rounded border-slate-700 bg-slate-900"
                        />
                        {course.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Documentos e Atestados</label>
                    <div className="flex items-center gap-2">
                      {uploadError && <span className="text-[10px] text-rose-500 font-bold">{uploadError}</span>}
                      <label className={`cursor-pointer p-2 rounded-lg border border-slate-800 hover:bg-slate-900 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {isUploading ? <Loader2 size={16} className="animate-spin text-primary" /> : <Upload size={16} className="text-primary" />}
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Nome do doc (ou use upload acima)"
                      className="input-corporate flex-1 text-xs"
                      value={newDoc.name}
                      onChange={(e) => setNewDoc({...newDoc, name: e.target.value})}
                    />
                    <input 
                      type="url" 
                      placeholder="URL do doc"
                      className="input-corporate flex-1 text-xs"
                      value={newDoc.url}
                      onChange={(e) => setNewDoc({...newDoc, url: e.target.value})}
                    />
                    <button 
                      type="button"
                      onClick={addDocument}
                      className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 group">
                        <div className="flex items-center gap-3">
                          <FileText size={16} className="text-primary" />
                          <span className="text-xs text-slate-300 font-medium">{doc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-primary transition-all">
                            <ExternalLink size={14} />
                          </a>
                          <button 
                            type="button"
                            onClick={() => removeDocument(i)}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
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
