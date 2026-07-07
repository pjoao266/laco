'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // Controla a aba
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isRegistering) {
      // CADASTRAR
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else alert("Conta criada! Verifique seu email ou tente fazer login agora.");
    } else {
      // ENTRAR
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Credenciais inválidas.");
      else router.push('/'); // Redireciona para a Home
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Laço</h1>
          <p className="text-gray-500 mt-2">Guarde suas melhores memórias.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => setIsRegistering(false)} 
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${!isRegistering ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Entrar
          </button>
          <button 
            type="button"
            onClick={() => setIsRegistering(true)} 
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${isRegistering ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E81633] outline-none transition" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E81633] outline-none transition" placeholder="••••••••" />
          </div>

          {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">{error}</p>}

          <button disabled={loading} type="submit" className="w-full bg-[#E81633] hover:bg-[#c2122a] text-white font-bold py-3 rounded-xl transition shadow-md disabled:opacity-50 mt-4">
            {loading ? 'Carregando...' : (isRegistering ? 'Criar Conta' : 'Acessar o Cofre')}
          </button>
        </form>
      </div>
    </div>
  );
}