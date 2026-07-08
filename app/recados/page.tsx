'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';
import { Heart, ArrowLeft, Plus, X, Trash2, Loader2, StickyNote } from 'lucide-react';

const NOTE_COLORS = [
  'bg-yellow-100 text-yellow-900', // Clássico Post-it
  'bg-pink-100 text-pink-900',     // Romântico
  'bg-blue-100 text-blue-900',     // Tranquilo
  'bg-emerald-100 text-emerald-900', // Natureza
];

export default function MuralRecados() {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [lacoData, setLacoData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [partnerName, setPartnerName] = useState<string>('Seu amor');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState(NOTE_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function carregarMural() {
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data?.user; 
      if (userError || !user) { router.push('/login'); return; }
      setCurrentUser(user);

      const { data: laco } = await supabase.from('lacos').select('*').or(`user_creator_id.eq.${user.id},user_invited_id.eq.${user.id}`).maybeSingle();
      if (!laco) { router.push('/'); return; }
      setLacoData(laco);

      // Tenta buscar o nome do parceiro
      if (laco.user_creator_id && laco.user_invited_id) {
        const partnerId = user.id === laco.user_creator_id ? laco.user_invited_id : laco.user_creator_id;
        const { data: profile } = await supabase.from('profiles').select('full_name, name').eq('id', partnerId).maybeSingle();
        if (profile) setPartnerName(profile.full_name || profile.name);
      }

      // Buscar os recados
      const { data: msgs } = await supabase.from('laco_messages').select('*').eq('laco_id', laco.id).order('created_at', { ascending: false });
      if (msgs) setMessages(msgs);

      setIsLoading(false);
    } catch (err) { console.error(err); }
  }

  useEffect(() => { carregarMural(); }, [router]);

  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) return alert('Escreva alguma coisa no recadinho!');
    setSaving(true);
    
    await supabase.from('laco_messages').insert([{
      laco_id: lacoData.id,
      user_id: currentUser.id,
      content: newNoteContent,
      color: newNoteColor
    }]);

    setNewNoteContent('');
    setIsNewNoteOpen(false);
    setSaving(false);
    carregarMural();
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Apagar este recadinho?")) return;
    await supabase.from('laco_messages').delete().eq('id', id);
    carregarMural();
  };

  if (isLoading) return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center"><Heart className="w-8 h-8 text-[#E81633] animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex flex-col font-sans transition-colors relative overflow-hidden">
      {/* Background divertido para o mural */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition font-medium text-sm bg-gray-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Laço
          </Link>
          <div className="flex items-center text-[#E81633] font-bold text-lg">
            <StickyNote className="w-5 h-5 mr-2" /> Mural de Recados
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-8 relative z-10">
        
        {messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-bold text-gray-600 dark:text-gray-300 mb-2">O mural está vazio!</h2>
            <p>Seja o primeiro a deixar um recadinho carinhoso.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {messages.map((msg, index) => {
              // Simula post-its colados tortinhos na tela (aleatoriedade consistente via index)
              const rotation = index % 2 === 0 ? 'rotate-[-2deg]' : index % 3 === 0 ? 'rotate-[3deg]' : 'rotate-[-1deg]';
              const isMine = msg.user_id === currentUser.id;
              
              return (
                <div key={msg.id} className={`relative p-5 rounded-bl-2xl rounded-tr-2xl shadow-md hover:shadow-lg transition-shadow group ${msg.color} ${rotation} animate-in zoom-in duration-300`}>
                  
                  {/* Fita adesiva decorativa */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-4 bg-white/40 rotate-[2deg] shadow-sm"></div>

                  <p className="text-sm md:text-base font-medium leading-relaxed whitespace-pre-line mt-2">
                    {msg.content}
                  </p>
                  
                  <div className="mt-4 flex items-center justify-between text-[10px] font-bold opacity-60 uppercase tracking-wider">
                    <span>{isMine ? 'Eu' : partnerName}</span>
                    <span>{new Date(msg.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {isMine && (
                    <button onClick={() => handleDeleteNote(msg.id)} className="absolute bottom-2 right-2 p-1.5 bg-black/10 hover:bg-black/20 text-black/60 rounded-full opacity-0 group-hover:opacity-100 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <button onClick={() => setIsNewNoteOpen(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-[#E81633] text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(232,22,51,0.4)] hover:scale-105 transition-transform z-40">
        <Plus className="w-7 h-7" />
      </button>

      {/* MODAL DE NOVO RECADO */}
      {isNewNoteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl p-6 relative border border-gray-100 dark:border-slate-800">
            <button onClick={() => setIsNewNoteOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full"><X className="w-5 h-5" /></button>
            
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Deixar um Recado</h2>
            
            <div className="space-y-4">
              {/* O textarea já assume a cor escolhida para dar o preview ao vivo */}
              <textarea 
                placeholder="Escreva algo fofo aqui..." 
                value={newNoteContent} 
                onChange={e => setNewNoteContent(e.target.value)} 
                rows={5} 
                className={`w-full p-4 rounded-xl outline-none shadow-inner resize-none font-medium transition-colors ${newNoteColor}`} 
              />
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Cor do papel</label>
                <div className="flex space-x-3">
                  {NOTE_COLORS.map(color => (
                    <button 
                      key={color} 
                      onClick={() => setNewNoteColor(color)} 
                      className={`w-10 h-10 rounded-full shadow-sm border-2 transition-transform ${color.split(' ')[0]} ${newNoteColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    />
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSaveNote} 
                disabled={saving}
                className="w-full py-3 mt-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold flex items-center justify-center hover:opacity-90 transition shadow-md"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Colar no Mural'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}