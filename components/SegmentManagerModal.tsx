'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer } from '../lib/types';

interface SegmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: string[];
  customers?: Customer[];
  onUpdateSegments: (
    newSegments: string[],
    renameMapping?: { old: string; new: string },
    deletedSegment?: string
  ) => void;
}

export default function SegmentManagerModal({
  isOpen,
  onClose,
  segments,
  customers = [],
  onUpdateSegments,
}: SegmentManagerModalProps) {
  const [newSegment, setNewSegment] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSegmentInUse = (segmentName: string) => {
    return customers.some(
      (c) => c.segment && c.segment.toLowerCase() === segmentName.toLowerCase()
    );
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = newSegment.trim();
    if (!trimmed) return;

    if (segments.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setError('Este segmento já existe.');
      return;
    }

    onUpdateSegments([...segments, trimmed]);
    setNewSegment('');
  };

  const handleStartEdit = (index: number, currentText: string) => {
    setEditingIndex(index);
    setEditingText(currentText);
    setError(null);
  };

  const handleSaveEdit = (index: number) => {
    setError(null);
    const trimmed = editingText.trim();
    if (!trimmed) return;

    const oldText = segments[index];
    if (oldText === trimmed) {
      setEditingIndex(null);
      return;
    }

    if (
      segments.some(
        (s, i) => i !== index && s.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setError('Outro segmento já possui este nome.');
      return;
    }

    const updated = [...segments];
    updated[index] = trimmed;
    onUpdateSegments(updated, { old: oldText, new: trimmed });
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    setError(null);
    const segmentToDelete = segments[index];
    
    // Check if the segment is in use by customers
    if (isSegmentInUse(segmentToDelete)) {
      setError('Este segmento não pode ser excluído pois está vinculado a um ou mais clientes.');
      return;
    }

    // Keep at least one segment to avoid empty dropdown state
    if (segments.length <= 1) {
      setError('É necessário manter ao menos um segmento cadastrado.');
      return;
    }

    const updated = segments.filter((_, i) => i !== index);
    onUpdateSegments(updated, undefined, segmentToDelete);
    
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-250">
      <div 
        className="relative bg-white w-full max-w-md rounded-xl border border-slate-100 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Gerenciar Segmentos Industriais</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Adicione, edite ou remova segmentos de atuação</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body & Scrollable list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Add Form */}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input 
              type="text"
              placeholder="Ex: Alimentos / Bebidas"
              value={newSegment}
              onChange={(e) => setNewSegment(e.target.value)}
              className="flex-1 text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
            />
            <button 
              type="submit"
              className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </form>

          {/* Feedback/Error */}
          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 px-3 py-2 rounded-lg text-[11px] font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* List of segments */}
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
            {segments.map((seg, idx) => (
              <div 
                key={`${seg}-${idx}`}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                  editingIndex === idx 
                    ? 'border-indigo-200 bg-indigo-50/20 shadow-xs' 
                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                {editingIndex === idx ? (
                  <input 
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="flex-1 text-xs border border-indigo-200 px-2.5 py-1 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold text-slate-700 mr-2"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(idx);
                      if (e.key === 'Escape') setEditingIndex(null);
                    }}
                  />
                ) : (
                  <span className="text-slate-700 font-semibold">{seg}</span>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {editingIndex === idx ? (
                    <>
                      <button 
                        type="button"
                        onClick={() => handleSaveEdit(idx)}
                        className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                        title="Salvar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={() => handleStartEdit(idx, seg)}
                        className="p-1.5 rounded-md hover:bg-slate-150 text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isSegmentInUse(seg) ? (
                        <div 
                          className="p-1.5 rounded-md text-slate-300 cursor-not-allowed flex items-center justify-center"
                          title="Este segmento está em uso por clientes cadastrados e não pode ser excluído"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleDelete(idx)}
                          className="p-1.5 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-xl">
          <button 
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-350 text-slate-700 text-xs px-4 py-2.5 rounded-lg font-bold shadow-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
