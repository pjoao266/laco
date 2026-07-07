'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/utils/supabase';
import { Upload, Heart, Sparkles, Loader2 } from 'lucide-react';

export default function Onboarding() {
  const router = useRouter();
  const [shipName, setShipName] = useState('');
  const [bgImgUrl, setBgImgUrl] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Verifica se o utilizador está logado, se não, manda pro login
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };
    checkUser();
  }, [router]);

  // Função para fazer o upload da imagem de fundo
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      setUploading(true);
      setErrorMsg('');
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('laco-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('laco-media').getPublicUrl(filePath);
      setBgImgUrl(data.publicUrl);
    } catch (error: any) {
      setErrorMsg('Erro ao carregar a imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Função para salvar o Laço no banco de dados
  const handleCreateLaco = async () => {
    if (!shipName.trim()) {
      setErrorMsg('O Nome do Casal é obrigatório para começar!');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      const { error } = await supabase
        .from('lacos')
        .insert([
          {
            ship_name: shipName,
            background_img_link: bgImgUrl,
            user_creator_id: user.id
            // O user_invited_id fica vazio até alguém usar o link de convite!
          }
        ]);

      if (error) throw error;

      // Tudo certo? Manda para a página principal!
      router.push('/');
    } catch (error: any) {
      setErrorMsg('Erro ao criar o Laço: ' + error.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors relative overflow-hidden">
      
      {/* Efeito de fundo desfocado bonito para a tela de onboarding */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E81633]/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-8 md:p-10 relative z-10 border border-gray-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center border-2 border-[#E81633]/20">
            <Heart className="w-8 h-8 text-[#E81633]" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-center">
            Criar o vosso Laço <Sparkles className="w-6 h-6 ml-2 text-amber-400" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Configurem o vosso espaço especial. Depois, poderá convidar a sua dupla através de um link!
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-medium mb-6 border border-red-100 dark:border-red-900/30">
            {errorMsg}
          </div>
        )}

        <div className="space-y-6">
          {/* Input do Nome */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Nome do Casal / Título do Espaço
            </label>
            <input 
              type="text" 
              placeholder="Ex: João & Maria, Nosso Cantinho..." 
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#E81633] transition"
            />
          </div>

          {/* Upload de Imagem */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">
              Foto de Fundo (Opcional)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 transition relative overflow-hidden group">
              {bgImgUrl ? (
                <>
                  <Image src={bgImgUrl} alt="Fundo escolhido" fill className="object-cover" sizes="(max-width: 768px) 100vw, 500px" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <p className="text-white font-medium text-sm">Trocar foto</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-3 group-hover:text-[#E81633] transition" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {uploading ? 'A preparar imagem...' : 'Clique para escolher uma foto'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG até 5MB</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
          </div>

          {/* Botão de Submit */}
          <button 
            onClick={handleCreateLaco} 
            disabled={saving || uploading}
            className="w-full py-4 bg-[#E81633] text-white rounded-2xl font-bold text-lg flex items-center justify-center shadow-lg hover:bg-[#c2122a] hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> A criar espaço...
              </>
            ) : (
              'Começar o nosso Laço'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}