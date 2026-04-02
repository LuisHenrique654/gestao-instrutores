import React from 'react';
import { 
  Settings as SettingsIcon, 
  Upload, 
  Save, 
  Building2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth, storage } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface AppSettings {
  id: string;
  companyName: string;
  companyLogoUrl: string;
  instructorId: string;
}

export default function Settings({ userRole }: { userRole: string | null }) {
  const [settings, setSettings] = React.useState<AppSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isResettingAll, setIsResettingAll] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = React.useState({
    companyName: 'Cascavel Fire',
    companyLogoUrl: ''
  });

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'settings'), where('instructorId', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data() as AppSettings;
        setSettings({ id: snapshot.docs[0].id, ...data });
        setFormData({
          companyName: data.companyName || 'Cascavel Fire',
          companyLogoUrl: data.companyLogoUrl || ''
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `settings/${auth.currentUser.uid}/logo_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, companyLogoUrl: url }));
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      let msg = 'Erro ao fazer upload da imagem.';
      if (error.code === 'storage/unauthorized') {
        msg = 'Erro de permissão: O Firebase Storage pode não estar ativado no seu console.';
      }
      setMessage({ text: msg, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      const docId = settings?.id || auth.currentUser.uid; // Use UID as doc ID for simplicity
      await setDoc(doc(db, 'settings', docId), {
        ...formData,
        instructorId: auth.currentUser.uid
      });
      setMessage({ text: 'Configurações salvas com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ text: 'Erro ao salvar configurações.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetAllData = async () => {
    setIsResettingAll(true);
    try {
      const collections = [
        'students', 
        'courses', 
        'attendance', 
        'grades', 
        'schedule', 
        'library', 
        'reports',
        'users' // Will filter admin inside the loop
      ];

      const adminEmail = 'luis.hen1403@gmail.com';

      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        const deletePromises = snapshot.docs
          .filter(d => {
            if (colName === 'users') return d.data().email?.toLowerCase() !== adminEmail;
            return true;
          })
          .map(d => deleteDoc(doc(db, colName, d.id)));
        
        await Promise.all(deletePromises);
      }
      
      setMessage({ text: 'Sistema resetado com sucesso!', type: 'success' });
      setShowResetConfirm(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Error resetting system data:", error);
      setMessage({ text: 'Erro ao resetar dados.', type: 'error' });
    } finally {
      setIsResettingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
          CONFIGURAÇÕES DO <span className="text-primary">SISTEMA</span>
        </h2>
        <p className="text-slate-400 mt-1 text-sm md:text-base">Personalize a identidade visual e parâmetros do seu portal.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Preview Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="corporate-card p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto border border-slate-800 overflow-hidden group relative">
              {formData.companyLogoUrl ? (
                <img 
                  src={formData.companyLogoUrl} 
                  alt="Logo Preview" 
                  className="w-full h-full object-contain p-2"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Building2 className="text-slate-700 group-hover:text-primary transition-colors" size={40} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight uppercase">{formData.companyName}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Visualização da Marca</p>
            </div>
            <div className="pt-6 border-t border-slate-800">
              <div className="flex items-center justify-center gap-2 text-emerald-500">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Ambiente Seguro</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle size={18} />
              <h4 className="font-bold text-sm">Dica de Branding</h4>
            </div>
            <p className="text-xs text-amber-500/80 leading-relaxed">
              Utilize uma logo com fundo transparente (PNG) e proporções quadradas para melhor adaptação na barra lateral.
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="md:col-span-2 space-y-8">
          <form onSubmit={handleSubmit} className="corporate-card p-8 space-y-8">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <SettingsIcon size={20} />
              </div>
              <h3 className="text-lg font-bold text-white">Identidade Visual</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome da Empresa / Unidade</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text" 
                    required
                    className="input-corporate pl-12"
                    placeholder="Ex: Cascavel Fire - Unidade Sul"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logo da Empresa (Upload)</label>
                <div className="relative">
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    isUploading ? 'bg-slate-900/50 border-primary/50' : 'bg-slate-950 border-slate-800 hover:border-primary/50'
                  }`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-500 mb-2" />
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Clique para fazer upload</p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-slate-600 font-medium">Recomendado: PNG com fundo transparente.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ou URL da Logo (PNG/SVG)</label>
                <div className="relative">
                  <Upload className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="url" 
                    className="input-corporate pl-12"
                    placeholder="https://exemplo.com/logo.png"
                    value={formData.companyLogoUrl}
                    onChange={(e) => setFormData({...formData, companyLogoUrl: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-end">
              <button 
                type="submit" 
                disabled={isSaving}
                className="btn-corporate-primary w-full sm:w-auto px-10 py-4"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-950"></div>
                ) : (
                  <>
                    <Save size={20} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </form>

          {userRole === 'admin' && (
            <div className="corporate-card border-rose-500/20 bg-rose-500/5 p-8 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
                <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-500">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">ZONA DE PERIGO</h3>
                  <p className="text-[10px] text-rose-500/70 font-bold uppercase tracking-widest">Ações Irreversíveis de Administrador</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-400 leading-relaxed">
                  Esta ação irá remover permanentemente todos os registros do banco de dados, incluindo alunos, cursos, notas e materiais. Utilize com extrema cautela.
                </p>
                
                {!showResetConfirm ? (
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20"
                  >
                    <Trash2 size={18} />
                    Zerar Todo o Banco de Dados
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-4 p-6 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest text-center">Confirmar exclusão total de todos os dados?</p>
                    <div className="flex gap-3 w-full">
                      <button 
                        onClick={resetAllData}
                        disabled={isResettingAll}
                        className="flex-1 py-4 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isResettingAll ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        SIM, APAGAR TUDO
                      </button>
                      <button 
                        onClick={() => setShowResetConfirm(false)}
                        disabled={isResettingAll}
                        className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
