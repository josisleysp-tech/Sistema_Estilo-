'use client';

/* eslint-disable */

import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Folder, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ArrowLeft, 
  Share2, 
  ChevronRight, 
  CheckCircle,
  FileCheck2,
  Settings,
  HelpCircle,
  FileText,
  Download,
  ExternalLink,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { ProductionOrder, SalesOrder } from '../lib/types';

interface BlueprintTabProps {
  selectedOP: ProductionOrder | null;
  salesOrders: SalesOrder[];
  onBackToProduction: () => void;
}

export default function BlueprintTab({
  selectedOP,
  salesOrders,
  onBackToProduction
}: BlueprintTabProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Keep track of created blob URLs to revoke them and avoid memory leaks
  const createdBlobUrls = React.useRef<string[]>([]);

  const base64ToBlobUrl = React.useCallback((dataUrl: string): string => {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
    try {
      const parts = dataUrl.split(',');
      if (parts.length < 2) return dataUrl;
      const meta = parts[0];
      const base64Data = parts[1];
      const mimeMatch = meta.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      
      const binaryStr = window.atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      createdBlobUrls.current.push(blobUrl);
      return blobUrl;
    } catch (e) {
      console.error('Failed to convert base64 to blob URL:', e);
      return dataUrl;
    }
  }, []);

  React.useEffect(() => {
    return () => {
      // Cleanup blob URLs to free memory
      createdBlobUrls.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  const salesOrderId = selectedOP?.salesOrderId;
  const associatedSalesOrder = salesOrderId 
    ? salesOrders.find(so => so.id.trim().toLowerCase() === salesOrderId.trim().toLowerCase()) 
    : null;

  // Build the list of files combining OP files and Sales Order attachments
  const normalizedFilesList = React.useMemo(() => {
    const list: Array<{ name: string; type: string; data?: string; safeUrl?: string; origin: 'op' | 'sales_order' | 'default' }> = [];

    // 1. Files from the Sales Order
    if (associatedSalesOrder) {
      // Collect files from projectFiles
      if (associatedSalesOrder.projectFiles && associatedSalesOrder.projectFiles.length > 0) {
        associatedSalesOrder.projectFiles.forEach(f => {
          list.push({
            name: f.name,
            type: f.type,
            data: f.data,
            safeUrl: f.data ? base64ToBlobUrl(f.data) : undefined,
            origin: 'sales_order'
          });
        });
      }
      
      // Collect images from projectImages, avoiding duplicate data
      if (associatedSalesOrder.projectImages && associatedSalesOrder.projectImages.length > 0) {
        associatedSalesOrder.projectImages.forEach((img, idx) => {
          const isAlreadyAdded = list.some(item => item.data === img);
          if (!isAlreadyAdded) {
            list.push({
              name: `desenho-${idx + 1}.png`,
              type: 'image/png',
              data: img,
              safeUrl: base64ToBlobUrl(img),
              origin: 'sales_order'
            });
          }
        });
      }
    }

    // 2. Files from the OP
    if (selectedOP && selectedOP.files && selectedOP.files.length > 0) {
      selectedOP.files.forEach(f => {
        list.push({
          name: f,
          type: f.toLowerCase().endsWith('.pdf') ? 'application/pdf' : f.toLowerCase().endsWith('.dwg') ? 'application/dwg' : 'mock',
          origin: 'op'
        });
      });
    }

    // 3. Fallback to default mock files if absolutely empty
    if (list.length === 0) {
      list.push(
        { name: 'Desenho_Tecnico_Turbina.dwg', type: 'application/dwg', origin: 'default' },
        { name: 'Especificacoes_Montagem.pdf', type: 'application/pdf', origin: 'default' },
        { name: 'Foto_Peca_Lote.jpg', type: 'image/jpeg', origin: 'default' },
        { name: 'Modelo_3D_Bico.stp', type: 'mock', origin: 'default' }
      );
    }

    return list;
  }, [selectedOP, associatedSalesOrder, base64ToBlobUrl]);

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Declaratively derive selected file. If the selection is invalid or stale, default to the first file.
  const isSelectedFileValid = normalizedFilesList.some(f => f.name === selectedFileName);
  const selectedFile = isSelectedFileValid && selectedFileName ? selectedFileName : (normalizedFilesList[0]?.name || '');

  const currentFileObj = normalizedFilesList.find(f => f.name === selectedFile) || normalizedFilesList[0];

  const versionHistory = [
    { version: 'v1.2', date: '18/06/2026', author: 'Ana Paula', description: 'Revisão das folgas de acoplamento do mancal' },
    { version: 'v1.1', date: '10/06/2026', author: 'Carlos Eduardo', description: 'Ajuste do torque de fixação principal' },
    { version: 'v1.0', date: '01/06/2026', author: 'Eduardo Fontes', description: 'Lançamento inicial homologado pela engenharia' }
  ];

  const handleZoom = (type: 'in' | 'out') => {
    if (type === 'in') setZoomLevel(prev => Math.min(prev + 25, 200));
    else setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div className="space-y-6">
      {/* Top Header and Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToProduction}
            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg transition-all"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 id="blueprint-viewer-heading" className="text-xl font-bold text-slate-800 tracking-tight">Visualizador de Desenhos Técnicos OP</h2>
            <p className="text-xs text-slate-500 mt-1">
              {selectedOP ? `Anexos vinculados à ordem de serviço: ${selectedOP.id}` : 'Mapeamento CAD integrado de desenhos industriais homologados'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-2 rounded-lg font-semibold shadow-xs">
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Compartilhar Ficha</span>
          </button>
          <button className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-semibold shadow-sm">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Aprovar Desenho</span>
          </button>
        </div>
      </div>

      {/* Main visualizer row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: File directory tree */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diretório de Documentos</h4>
          
          <div className="space-y-1.5 font-sans text-xs">
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg text-slate-700 font-semibold mb-2">
              <Folder className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span>{selectedOP ? selectedOP.id : 'Dossiê Geral'}</span>
              <ChevronRight className="w-3 h-3 text-slate-400 ml-auto" />
            </div>

            <div className="pl-3 space-y-1 max-h-[300px] overflow-y-auto">
              {normalizedFilesList.map((file) => {
                const isActive = selectedFile === file.name;
                const isImage = file.type.startsWith('image/');
                const isPdf = file.type === 'application/pdf';
                return (
                  <button 
                    key={file.name}
                    onClick={() => setSelectedFileName(file.name)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors font-mono text-[11px] ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {isImage ? (
                      <ImageIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    ) : isPdf ? (
                      <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    ) : (
                      <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate" title={file.name}>{file.name}</span>
                      <span className="text-[8px] opacity-75 font-sans font-semibold">
                        {file.origin === 'sales_order' ? 'Anexo do Pedido' : file.origin === 'op' ? 'Anexo da OP' : 'Modelo Padrão'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-800 font-semibold">
            <Settings className="w-4 h-4 text-indigo-600 inline mr-1.5 align-text-bottom" />
            <span>Suporte a DWG, PDF, JPG e STEP habilitado</span>
          </div>
        </div>

        {/* Center column: CAD Schematic rendering Canvas */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-950 rounded-xl p-4 relative h-[450px] flex flex-col justify-between overflow-hidden">
          {/* Top control bar overlay */}
          <div className="flex items-center justify-between z-10 bg-slate-950/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-white text-xs">
            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[150px] sm:max-w-[180px]" title={currentFileObj?.name}>
              {currentFileObj?.name} | Rot: {rotation}° | Zoom: {zoomLevel}%
            </span>
            
            <div className="flex gap-1.5">
              <button 
                onClick={() => handleZoom('in')}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleZoom('out')}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors"
                title="Diminuir Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={handleRotate}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 transition-colors mr-1"
                title="Rotacionar 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {currentFileObj && currentFileObj.safeUrl && (
                <>
                  <div className="w-[1px] h-4 bg-slate-800 self-center mx-0.5" />
                  <a 
                    href={currentFileObj.safeUrl} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-slate-800 rounded text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center"
                    title="Visualizar em Nova Guia"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a 
                    href={currentFileObj.safeUrl} 
                    download={currentFileObj.name}
                    className="p-1 hover:bg-slate-800 rounded text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center"
                    title="Baixar Arquivo"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Interactive SVG CAD Schematics drawing area or Image display or PDF */}
          <div className="flex-1 flex items-center justify-center relative p-2 overflow-auto">
            {currentFileObj && currentFileObj.data ? (
              currentFileObj.type.startsWith('image/') ? (
                /* Renders actual uploaded image! */
                <div className="flex flex-col items-center justify-center gap-4 max-w-full max-h-full">
                  <div 
                    className="transition-transform duration-300 ease-out flex items-center justify-center max-w-full max-h-full"
                    style={{ 
                      transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`
                    }}
                  >
                    <img 
                      src={currentFileObj.safeUrl || currentFileObj.data} 
                      alt={currentFileObj.name} 
                      className="max-w-full max-h-[260px] object-contain rounded-lg shadow-2xl border border-slate-800"
                    />
                  </div>
                  {currentFileObj.safeUrl && (
                    <div className="flex gap-2.5 w-full max-w-[240px] z-10">
                      <a 
                        href={currentFileObj.safeUrl} 
                        download={currentFileObj.name}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 shadow cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Baixar Imagem
                      </a>
                      <a 
                        href={currentFileObj.safeUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 border border-slate-750 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" /> Abrir Guia
                      </a>
                    </div>
                  )}
                </div>
              ) : currentFileObj.type === 'application/pdf' ? (
                /* Beautiful view/download PDF card */
                <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-950/80 rounded-xl max-w-md mx-auto space-y-4 border border-slate-800/80">
                  <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-rose-500 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm tracking-tight">{currentFileObj.name}</h5>
                    <p className="text-[11px] text-slate-400 mt-1">Este documento PDF foi anexado no pedido de venda.</p>
                  </div>
                  <div className="flex gap-2.5 w-full">
                    <a 
                      href={currentFileObj.safeUrl || currentFileObj.data} 
                      download={currentFileObj.name}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 shadow"
                    >
                      <Download className="w-3.5 h-3.5" /> Baixar PDF
                    </a>
                    <a 
                      href={currentFileObj.safeUrl || currentFileObj.data} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-750"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Visualizar
                    </a>
                  </div>
                </div>
              ) : (
                /* Fallback blueprint drawing */
                <div 
                  className="transition-transform duration-300 ease-out flex items-center justify-center"
                  style={{ 
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`
                  }}
                >
                  <svg width="240" height="240" viewBox="0 0 200 200" className="text-indigo-400">
                    <defs>
                      <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(79, 70, 229, 0.15)" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cadGrid)" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(129, 140, 248, 0.3)" strokeWidth="1" strokeDasharray="3,3" />
                    <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(129, 140, 248, 0.6)" strokeWidth="1.5" />
                    <circle cx="100" cy="100" r="45" fill="none" stroke="rgba(129, 140, 248, 0.4)" strokeWidth="1" />
                    <circle cx="100" cy="100" r="20" fill="none" stroke="rgba(129, 140, 248, 0.7)" strokeWidth="1.5" />
                    <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(129, 140, 248, 0.5)" strokeWidth="0.75" strokeDasharray="5,2" />
                    <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(129, 140, 248, 0.5)" strokeWidth="0.75" strokeDasharray="5,2" />
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                      <g key={angle} transform={`rotate(${angle} 100 100)`}>
                        <path 
                          d="M 100 80 Q 115 50 100 25 Q 85 50 100 80" 
                          fill="rgba(129, 140, 248, 0.15)" 
                          stroke="#818cf8" 
                          strokeWidth="1" 
                        />
                        <circle cx="100" cy="50" r="2" fill="#818cf8" />
                      </g>
                    ))}
                    <circle cx="100" cy="100" r="8" fill="#0f172a" stroke="#818cf8" strokeWidth="2" />
                    <path d="M 100 20 L 165 20 M 165 20 L 165 100" fill="none" stroke="#e11d48" strokeWidth="0.75" strokeDasharray="2,2" />
                    <text x="170" y="60" fill="#e11d48" fontSize="7" fontFamily="monospace">R=65.00mm</text>
                    <path d="M 20 100 L 20 180 M 20 180 L 100 180" fill="none" stroke="#e11d48" strokeWidth="0.75" strokeDasharray="2,2" />
                    <text x="50" y="190" fill="#e11d48" fontSize="7" fontFamily="monospace">D=160.00mm</text>
                  </svg>
                </div>
              )
            ) : (
              /* Default/Mock blueprint representation */
              <div 
                className="transition-transform duration-300 ease-out flex items-center justify-center"
                style={{ 
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`
                }}
              >
                <svg width="240" height="240" viewBox="0 0 200 200" className="text-indigo-400">
                  <defs>
                    <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(79, 70, 229, 0.15)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#cadGrid)" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(129, 140, 248, 0.3)" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(129, 140, 248, 0.6)" strokeWidth="1.5" />
                  <circle cx="100" cy="100" r="45" fill="none" stroke="rgba(129, 140, 248, 0.4)" strokeWidth="1" />
                  <circle cx="100" cy="100" r="20" fill="none" stroke="rgba(129, 140, 248, 0.7)" strokeWidth="1.5" />
                  <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(129, 140, 248, 0.5)" strokeWidth="0.75" strokeDasharray="5,2" />
                  <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(129, 140, 248, 0.5)" strokeWidth="0.75" strokeDasharray="5,2" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <g key={angle} transform={`rotate(${angle} 100 100)`}>
                      <path 
                        d="M 100 80 Q 115 50 100 25 Q 85 50 100 80" 
                        fill="rgba(129, 140, 248, 0.15)" 
                        stroke="#818cf8" 
                        strokeWidth="1" 
                      />
                      <circle cx="100" cy="50" r="2" fill="#818cf8" />
                    </g>
                  ))}
                  <circle cx="100" cy="100" r="8" fill="#0f172a" stroke="#818cf8" strokeWidth="2" />
                  <path d="M 100 20 L 165 20 M 165 20 L 165 100" fill="none" stroke="#e11d48" strokeWidth="0.75" strokeDasharray="2,2" />
                  <text x="170" y="60" fill="#e11d48" fontSize="7" fontFamily="monospace">R=65.00mm</text>
                  <path d="M 20 100 L 20 180 M 20 180 L 100 180" fill="none" stroke="#e11d48" strokeWidth="0.75" strokeDasharray="2,2" />
                  <text x="50" y="190" fill="#e11d48" fontSize="7" fontFamily="monospace">D=160.00mm</text>
                </svg>
              </div>
            )}
          </div>

          {/* Bottom canvas watermark */}
          <div className="text-[9px] text-slate-500 font-mono text-center flex justify-between items-center z-10 bg-slate-950/40 p-2 rounded-lg border border-slate-800/30">
            <span>Visualizador CAD v4.2 PRO</span>
            <span>Estúdio de Desenvolvimento em Nuvem</span>
          </div>
        </div>

        {/* Right column: Document details & version logs */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Metadados Técnicos</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Origem:</span>
                <span className="font-semibold text-indigo-600">
                  {currentFileObj?.origin === 'sales_order' ? 'Pedido de Venda' : currentFileObj?.origin === 'op' ? 'Ordem de Produção' : 'Padrão do Sistema'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Escopo da OP:</span>
                <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={selectedOP ? selectedOP.product : 'Turbina Eólica T-40'}>
                  {selectedOP ? selectedOP.product : 'Turbina Eólica T-40'}
                </span>
              </div>
              {selectedOP?.salesOrderId && (
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Pedido Vinculado:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {selectedOP.salesOrderId}
                  </span>
                </div>
              )}
              {selectedOP?.salesOrderClient && (
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={selectedOP.salesOrderClient}>
                    {selectedOP.salesOrderClient}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Data de Emissão:</span>
                <span className="font-mono text-slate-600">{selectedOP ? selectedOP.date : '18/06/2026'}</span>
              </div>
            </div>
          </div>

          {/* Version log */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Histórico de Versões</h4>
            
            <div className="space-y-3">
              {versionHistory.map((v, index) => {
                return (
                  <div key={v.version} className="flex gap-2 text-xs">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-slate-300'}`}></div>
                      {index < versionHistory.length - 1 && <div className="w-0.5 h-10 bg-slate-100"></div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{v.version}</span>
                        <span className="text-[10px] text-slate-400">• {v.date}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Por: {v.author}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{v.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
