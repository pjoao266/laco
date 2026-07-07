'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erroDetalhado, setErroDetalhado] = useState('')

  useEffect(() => {
    // Escuta a sessão do Supabase para capturar o usuário assim que ele voltar do Google
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user
        const params = new URLSearchParams(window.location.search)
        const inviteLacoId = params.get('invite')

        if (inviteLacoId) {
          // Vincula a pessoa convidada à coluna user_invited_id da tabela lacos
          await supabase
            .from('lacos')
            .update({ user_invited_id: user.id })
            .eq('id', inviteLacoId)
        }
        router.push('/')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  async function handleGoogleAuth() {
    setLoading(true)
    setErroDetalhado('')

    try {
      const params = new URLSearchParams(window.location.search)
      const inviteLacoId = params.get('invite')
      
      // Mantém o parâmetro de convite no redirecionamento de retorno
      const redirectToUrl = inviteLacoId 
        ? `${window.location.origin}/login?invite=${inviteLacoId}`
        : `${window.location.origin}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectToUrl }
      })

      if (error) {
        setErroDetalhado('Falha ao conectar com o Google: ' + error.message)
        setLoading(false)
      }
    } catch (err) {
      setErroDetalhado('Erro inesperado no sistema.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Laço</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">Guarde e celebre a história de vocês.</p>

        {erroDetalhado && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-6 text-left border border-red-100 dark:border-red-900/30">
            {erroDetalhado}
          </div>
        )}

        <button 
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center transition shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-pulse">Conectando...</span>
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Entrar ou Cadastrar
            </>
          )}
        </button>
      </div>
    </div>
  )
}