'use client'
import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const router = useRouter()
  const [shipName, setShipName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreateLaco(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    // 1. Pega o usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    
    
    if (user) {                                                   
      // 2. Insere o novo Laço no banco
      const { data, error } = await supabase
        .from('lacos')
        .insert([{ ship_name: shipName, user_creator_id: user.id }])
        .select()
      
      if (!error) {
        // 3. Se deu certo, vai para a Home!
        router.push('/')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quase lá!</h2>
        <p className="text-gray-500 mb-8">Como devemos chamar o espaço de vocês?</p>
        
        <form onSubmit={handleCreateLaco} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome do Casal (Ship)</label>
            <input 
              type="text" 
              required
              placeholder="Ex: Brumar"
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-red-500 focus:bg-white outline-none transition"
              value={shipName}
              onChange={(e) => setShipName(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 text-white rounded-xl py-3.5 font-medium hover:bg-red-700 transition"
          >
            {loading ? 'Criando espaço...' : 'Criar nosso Laço'}
          </button>
        </form>
      </div>
    </div>
  )
}