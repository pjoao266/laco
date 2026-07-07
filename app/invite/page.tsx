'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/utils/supabase'
import { Heart, Loader2 } from 'lucide-react'

export default function Invite() {
  const router = useRouter();
  const [lacoData, setLacoData] = useState<any>(null);
  const [inviterName, setInviterName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchInviteData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const lacoId = params.get('laco_id');

        if (!lacoId) {
          setErrorMsg('Link de convite inválido ou expirado.');
          return;
        }

        const { data: laco, error: lacoError } = await supabase
          .from('lacos')
          .select('*')
          .eq('id', lacoId)
          .maybeSingle();

        if (lacoError || !laco) {
          setErrorMsg('Link de convite inválido ou expirado.');
          return;
        }

        setLacoData(laco);

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if(userError || !userData?.user) {
            router.push(`/login?invite=${lacoId}`);
            return;
        }
        
        // Tentativa de puxar nome, fallback para algo carinhoso em PT-BR
        setInviterName('Seu amor');

        setIsLoading(false);
      } catch (error: any) {
        setErrorMsg('Erro inesperado: ' + error.message);
      }
    };
    fetchInviteData();
  }, [router]);

  const handleJoinLaco = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await supabase
        .from('lacos')
        .update({ user_invited_id: user.id })
        .eq('id', lacoData.id);

      if (error) throw error;

      router.push('/');
    } catch (error: any) {
      setErrorMsg('Erro ao aceitar o convite: ' + error.message);
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center font-sans"><Heart className="w-8 h-8 text-[#E81633] animate-pulse" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E81633]/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-8 md:p-10 relative z-10 border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center border-2 border-[#E81633]/20">
            <Heart className="w-8 h-8 text-[#E81633]" />
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 leading-tight">
            Olá! <span className="text-[#E81633] font-extrabold">{inviterName}</span> te convidou.
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-line">
            ...pra esse laço de memórias entre vcs. Entre pra reviver e colecionar momentos especiais juntos.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium mb-6 border border-red-100 dark:border-red-900/30">
            {errorMsg}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gray-100 dark:bg-slate-900 rounded-3xl p-6 border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 text-left transition relative overflow-hidden group">
            {lacoData.background_img_link ? (
                <Image src={lacoData.background_img_link} alt="Cofre de Memórias" fill className="object-cover opacity-20 dark:opacity-[0.15] scale-110 blur-[1px]" sizes="500px" />
            ) : (
                <div className="w-16 h-16 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 border border-gray-300 dark:border-slate-700">
                    <Image src="/static/logo_preto_sem_fundo_transparente.png" alt="Laço" width={32} height={25} className="object-contain" />
                </div>
            )}
            
            <div className="flex-1 relative z-10">
                <p className="text-xs font-bold text-[#E81633] uppercase">Cofre de Memórias</p>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight mt-1 truncate">
                    {lacoData.ship_name || 'Laço'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Guarde e celebre a história de vocês.</p>
            </div>
          </div>

          <button 
            onClick={handleJoinLaco} 
            disabled={saving}
            className="w-full py-4 bg-[#E81633] text-white rounded-2xl font-bold text-lg flex items-center justify-center shadow-lg hover:bg-[#c2122a] hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Entrando no laço...
              </>
            ) : (
              'Entrar no Nosso Laço'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}