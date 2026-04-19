import React from 'react';
import { 
  Library as LibraryIcon, 
  Plus, 
  Search, 
  FileText, 
  ExternalLink,
  Trash2,
  Edit2,
  BookOpen,
  FileCode,
  FileVideo,
  Upload,
  Loader2
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

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  type: 'pdf' | 'video' | 'doc' | 'other';
  instructorId: string;
}

export default function Library({ userRole }: { userRole: string | null }) {
  const [items, setItems] = React.useState<LibraryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<LibraryItem | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [message, setMessage] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);
  
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    fileUrl: '',
    type: 'pdf' as const
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', fileUrl: '', type: 'pdf' });
    setEditingItem(null);
  };

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
      ? query(collection(db, 'library'))
      : query(collection(db, 'library'), where('instructorId', '==', auth.currentUser.uid));
      
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LibraryItem)));
    });

    return () => unsubscribe();
  }, [userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const itemData = {
      ...formData,
      instructorId: auth.currentUser.uid,
      createdAt: new Date().toISOString()
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'library', editingItem.id), itemData);
      } else {
        await addDoc(collection(db, 'library'), itemData);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ title: '', description: '', fileUrl: '', type: 'pdf' });
    } catch (error) {
      console.error("Error saving library item:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'library', id));
    } catch (error) {
      console.error("Error deleting library item:", error);
      handleFirestoreError(error, 'delete', `library/${id}`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="text-rose-500" size={24} />;
      case 'video': return <FileVideo className="text-blue-500" size={24} />;
      case 'doc': return <FileCode className="text-emerald-500" size={24} />;
      default: return <BookOpen className="text-primary" size={24} />;
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter">
            BIBLIOTECA DE <span className="text-primary">CONTEÚDOS</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm md:text-base">Repositório corporativo de arquivos e materiais didáticos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-corporate-primary w-full md:w-auto"
        >
          <Plus size={20} />
          Adicionar Material
        </button>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar materiais..."
          className="input-corporate pl-12 bg-white border-slate-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="corporate-card group hover:border-primary/30 transition-all flex flex-col bg-white shadow-sm"
          >
            <div className="p-6 flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                  {getIcon(item.type)}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setEditingItem(item);
                      setFormData({
                        title: item.title,
                        description: item.description,
                        fileUrl: item.fileUrl,
                        type: item.type
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-primary transition-all"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-50 rounded-lg text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-100">
                  {item.type}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
              <a 
                href={item.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-black text-primary uppercase tracking-widest hover:bg-primary/10 rounded-xl transition-all"
              >
                <ExternalLink size={14} />
                Acessar Conteúdo
              </a>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="corporate-card max-w-md w-full p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar bg-white border-slate-200 shadow-2xl"
            >
              <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">
                {editingItem ? 'EDITAR' : 'ADICIONAR'} <span className="text-primary">MATERIAL</span>
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título do Conteúdo</label>
                  <input 
                    type="text" 
                    required
                    className="input-corporate bg-slate-50"
                    placeholder="Ex: Manual de Primeiros Socorros"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição Breve</label>
                  <textarea 
                    className="input-corporate min-h-[100px] py-3 bg-slate-50"
                    placeholder="Descreva o que o aluno encontrará neste arquivo..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo de Conteúdo</label>
                    <select 
                      className="input-corporate bg-slate-50"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="pdf" className="bg-white">PDF</option>
                      <option value="video" className="bg-white">Vídeo</option>
                      <option value="doc" className="bg-white">Documento</option>
                      <option value="other" className="bg-white">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">URL do Arquivo</label>
                    <input 
                      type="url" 
                      className="input-corporate bg-slate-50"
                      placeholder="https://google.drive/..."
                      value={formData.fileUrl}
                      onChange={(e) => setFormData({...formData, fileUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingItem(null);
                    }}
                    className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-400 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-corporate-primary py-3"
                  >
                    Salvar Material
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
