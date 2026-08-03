import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <h2 className="text-2xl font-bold mb-2">Página Não Encontrada (404)</h2>
      <p className="text-slate-400 mb-4 text-sm">A página solicitada não foi encontrada.</p>
      <Link href="/" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-bold text-white transition-colors">
        Voltar ao Início
      </Link>
    </div>
  );
}
