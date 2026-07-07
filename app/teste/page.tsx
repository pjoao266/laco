'use client'
import React, { useEffect, useState } from 'react'
// Ajuste o caminho abaixo se a sua pasta utils/lib estiver em outro lugar
import { supabase } from '@/utils/supabase' 

export default function TesteConexao() {
  const [status, setStatus] = useState('Conectando ao banco...')
  const [categorias, setCategorias] = useState<any[]>([])
  const [erroDetalhado, setErroDetalhado] = useState('')

  useEffect(() => {
    async function testarSupabase() {
      // Tenta bater na tabela de categorias que criamos
      const { data, error } = await supabase
        .from('event_categories')
        .select('name, color_hex')

      if (error) {
        setStatus('❌ Falha na comunicação')
        setErroDetalhado(error.message)
      } else {
        setStatus('✅ Conexão Perfeita!')
        setCategorias(data || [])
      }
    }

    testarSupabase()
  }, [])

  return (
    <div className="min-h-screen p-10 bg-gray-50 flex flex-col items-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Status do Supabase</h1>
        
        <div className={`p-4 rounded-xl mb-6 font-medium ${status.includes('✅') ? 'bg-green-100 text-green-800' : status.includes('❌') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
          {status}
        </div>

        {erroDetalhado && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
            <strong>Erro:</strong> {erroDetalhado}
          </div>
        )}

        {categorias.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase mb-3">Dados recebidos:</h2>
            <ul className="space-y-2">
              {categorias.map((cat, index) => (
                <li key={index} className="flex items-center space-x-2 text-gray-700 font-medium bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: cat.color_hex }}></span>
                  <span>{cat.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}