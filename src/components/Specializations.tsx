import React from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Info,
  Calendar,
  User as UserIcon,
  ChevronUp,
  ChevronDown,
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { Specialization } from '../types';
import { handleFirestoreError } from '../lib/firestore-utils';

export default function Specializations({ 
  userRole, 
  selectedInstructorId 
}: { 
  userRole: string | null,
  selectedInstructorId?: string | null
}) {
  const [specializations, setSpecializations] = React.useState<Specialization[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingSpec, setEditingSpec] = React.useState<Specialization | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [instructors, setInstructors] = React.useState<any[]>([]);

  const effectiveInstructorId = selectedInstructorId;

  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    requirements: ''
  });

  React.useEffect(() => {
    const handleQuickAdd = () => {
      setEditingSpec(null);
      setFormData({ name: '', description: '', requirements: '' });
      setIsModalOpen(true);
    };
    window.addEventListener('app-quick-add', handleQuickAdd);
    return () => window.removeEventListener('app-quick-add', handleQuickAdd);
  }, []);

  React.useEffect(() => {
    if (!auth.currentUser) return;

    let q = query(collection(db, 'specializations'), orderBy('createdAt', 'desc'));
    
    if (effectiveInstructorId) {
      q = query(collection(db, 'specializations'), 
        where('instructorId', '==', effectiveInstructorId), 
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      } as Specialization));
      setSpecializations(data);
      setLoading(false);
    });

    if (userRole === 'admin') {
      const unsubInstructors = onSnapshot(collection(db, 'users'), (snapshot) => {
        setInstructors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => {
        unsubscribe();
        unsubInstructors();
      };
    }

    return () => unsubscribe();
  }, [effectiveInstructorId, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...formData,
        instructorId: selectedInstructorId || auth.currentUser.uid,
        updatedAt: serverTimestamp()
      };

      if (editingSpec) {
        await updateDoc(doc(db, 'specializations', editingSpec.id), data);
      } else {
        await addDoc(collection(db, 'specializations'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', description: '', requirements: '' });
      setEditingSpec(null);
    } catch (error) {
      console.error("Error saving specialization:", error);
      handleFirestoreError(error, editingSpec ? 'update' : 'create', 'specializations');
    }
  };

  const openEditModal = (spec: Specialization) => {
    setEditingSpec(spec);
    setFormData({
      name: spec.name,
      description: spec.description || '',
      requirements: spec.requirements || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta especialização?')) return;
    try {
      await deleteDoc(doc(db, 'specializations', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `specializations/${id}`);
    }
  };

  const filteredSpecs = specializations.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInstructorName = (id?: string) => {
    if (!id) return 'Administração';
    return instructors.find(i => i.id === id)?.name || 'Instrutor';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">
            MÓDULOS DE <span className="text-primary">ESPECIALIZAÇÃO</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base italic">Capacitação avançada e certificações técnicas.</p>
        </div>
        <button 
          onClick={() => { setEditingSpec(null); setFormData({ name: '', description: '', requirements: '' }); setIsModalOpen(true); }}
          className="btn-corporate-primary w-full md:w-auto"
        >
          <Plus size={20} />
          Nova Especialização
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por especialização ou técnica..." 
            className="input-corporate w-full pl-12 h-14 bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 size={48} className="text-primary animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Especializações...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredSpecs.map((spec) => (
              <motion.div
                key={spec.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="corporate-card group overflow-hidden border-t-4 border-t-primary"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner shadow-primary/5">
                    <Award size={24} />
                  </div>
                  <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => openEditModal(spec)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-blue-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(spec.id)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase group-hover:text-primary transition-colors">
                    {spec.name}
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed italic">
                      "{spec.description || 'Nenhum resumo técnico disponível para esta especialização.'}"
                    </p>
                  </div>
                </div>

                {spec.requirements && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Check size={12} className="text-emerald-500" />
                      Pré-requisitos Necessários
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2">{spec.requirements}</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {userRole === 'admin' && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        <UserIcon size={12} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate max-w-[100px]">
                        {getInstructorName(spec.instructorId)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-300 ml-auto">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">
                      {new Date(spec.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {filteredSpecs.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                < Award size={40} className="text-slate-300" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Nenhuma Especialização Encontrada</h4>
              <p className="text-slate-500 max-w-sm text-sm">Crie novos módulos de especialização para enriquecer o portfólio técnico da instituição.</p>
            </div>
          )}
        </div>
      )}

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
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">
                  {editingSpec ? 'EDITAR' : 'NOVA'} <span className="text-primary">ESPECIALIZAÇÃO</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Título da Especialização</label>
                  <input 
                    required
                    type="text" 
                    className="input-corporate w-full bg-slate-50"
                    placeholder="Ex: Resgate em Espaços Confinados"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Descrição do Módulo</label>
                  <textarea 
                    className="input-corporate w-full h-32 resize-none bg-slate-50"
                    placeholder="Descreva os objetivos e competências técnicas..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Pré-requisitos e Recomendações</label>
                  <textarea 
                    className="input-corporate w-full h-24 resize-none bg-slate-50"
                    placeholder="Ex: NR33 Básico, 20h de treinamento prévio..."
                    value={formData.requirements}
                    onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 btn-corporate-outline font-bold"
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-corporate-primary font-bold"
                  >
                    <Check size={20} />
                    Finalizar
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
