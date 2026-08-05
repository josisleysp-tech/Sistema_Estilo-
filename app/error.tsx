'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for diagnostics
    console.error('Unhandled Client-Side Error caught by Next.js Error Boundary:', error);
  }, [error]);

  const handleClearCacheAndReload = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('Failed to clear storage:', e);
      }
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          Ocorreu um erro no sistema
        </h2>
        
        <p className="text-sm text-slate-400 mb-6">
          Uma exceção não tratada foi detectada na aplicação. Você pode tentar reiniciar a interface ou limpar os dados armazenados no navegador.
        </p>

        {error?.message && (
          <div className="bg-slate-950/60 border border-slate-800 rounded p-3 text-xs text-red-300 font-mono text-left mb-6 max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-950/20"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>

          <button
            onClick={handleClearCacheAndReload}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4 text-amber-400" />
            Limpar Cache Local e Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
}
