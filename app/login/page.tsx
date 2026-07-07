'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erroDetalhado, setErroDetalhado] = useState('')

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user
        
        // 1. Resgata o convite salvo no navegador (mesmo que a URL perca o ID após o Google)
        const savedInviteId = localStorage.getItem('invite_laco_id')

        if (savedInviteId) {
          await supabase
            .from('lacos')
            .update({ user_invited_id: user.id })
            .eq('id', savedInviteId)
          
          localStorage.removeItem('invite_laco_id') // Limpa após usar
          router.push('/')
        } else {
          // Se não tem convite, verifica se já tem laço
          const { data: laco, error: lacoError } = await supabase
            .from('lacos')
            .select('id')
            .or(`user_creator_id.eq.${user.id},user_invited_id.eq.${user.id}`)
            .maybeSingle()

          if (!laco || lacoError) {
            router.push('/onboarding')
          } else {
            router.push('/')
          }
        }
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [router])

  async function handleGoogleAuth() {
    setLoading(true)
    setErroDetalhado('')

    try {
      // 2. Salva o convite antes de redirecionar para o Google!
      const params = new URLSearchParams(window.location.search)
      const inviteLacoId = params.get('invite')
      if (inviteLacoId) {
        localStorage.setItem('invite_laco_id', inviteLacoId)
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      })

      if (error) {
        setErroDetalhado('Falha: ' + error.message)
        setLoading(false)
      }
    } catch (err) {
      setErroDetalhado('Erro inesperado.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Laço</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Guarde e celebre a história de vocês.</p>
        
        {erroDetalhado && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-6">{erroDetalhado}</div>}

        <button onClick={handleGoogleAuth} disabled={loading} className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center transition shadow-sm disabled:opacity-50">
          {loading ? 'Conectando...' : 'Entrar ou Cadastrar'}
        </button>
      </div>
    </div>
  )
}