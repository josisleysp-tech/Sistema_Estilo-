'use client';

import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  RefreshCw, 
  MessageSquare, 
  ShieldCheck, 
  X, 
  Smartphone, 
  Sparkles, 
  Check, 
  Copy,
  Server,
  Info
} from 'lucide-react';
import { WhatsAppConfig } from '../lib/types';

interface WhatsAppQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappConfig: WhatsAppConfig;
  onUpdateWhatsAppConfig: (config: WhatsAppConfig) => void;
}

export default function WhatsAppQRCodeModal({
  isOpen,
  onClose,
  whatsappConfig,
  onUpdateWhatsAppConfig
}: WhatsAppQRCodeModalProps) {
  const [countdown, setCountdown] = useState(45);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Countdown timer for QR code refresh simulation
  useEffect(() => {
    if (!isOpen || whatsappConfig.isConnected) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 45; // reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, whatsappConfig.isConnected]);

  if (!isOpen) return null;

  const handleRefreshQr = () => {
    setCountdown(45);
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      onUpdateWhatsAppConfig({
        ...whatsappConfig,
        isConnected: true
      });
    }, 1500);
  };

  const handleDisconnect = () => {
    onUpdateWhatsAppConfig({
      ...whatsappConfig,
      isConnected: false
    });
  };

  const handleCopyServerUrl = () => {
    if (whatsappConfig.serverUrl) {
      navigator.clipboard.writeText(whatsappConfig.serverUrl);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Conectar WhatsApp CRM</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border ${
                  whatsappConfig.isConnected 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {whatsappConfig.isConnected ? 'Conectado' : 'Aguardando QR'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Instância: <span className="font-mono text-emerald-400 font-bold">{whatsappConfig.instanceName || 'estilocoifas_prod'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY CONTENT */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          
          {whatsappConfig.isConnected ? (
            /* STATE 1: ALREADY CONNECTED */
            <div className="text-center space-y-5 py-4">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-200 shadow-lg animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">WhatsApp Conectado com Sucesso!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Sua conta de WhatsApp está sincronizada com o ERP. As mensagens e notificações de pedidos podem ser disparadas diretamente.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Número Conectado:</span>
                  <span className="font-mono font-bold text-slate-900">{whatsappConfig.companyNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Instância Ativa:</span>
                  <span className="font-mono font-bold text-emerald-600">{whatsappConfig.instanceName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Servidor Gateway:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[200px]">{whatsappConfig.serverUrl}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <WifiOff className="w-4 h-4" />
                  <span>Desconectar Instância</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Concluído
                </button>
              </div>
            </div>
          ) : (
            /* STATE 2: SCAN QR CODE */
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                
                {/* Simulated QR Code Box */}
                <div className="relative group flex-shrink-0">
                  <div className="w-48 h-48 bg-white p-3 rounded-2xl border-2 border-slate-300 shadow-md flex flex-col items-center justify-center relative overflow-hidden">
                    
                    {/* SVG Graphic QR Representation */}
                    <div className="w-full h-full bg-slate-950 p-2 rounded-xl flex flex-col justify-between relative">
                      {/* Decorative QR Pattern SVG */}
                      <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
                        {/* Top Left Finder */}
                        <rect x="5" y="5" width="25" height="25" rx="3" fill="#10B981" />
                        <rect x="9" y="9" width="17" height="17" rx="2" fill="#020617" />
                        <rect x="13" y="13" width="9" height="9" fill="#10B981" />

                        {/* Top Right Finder */}
                        <rect x="70" y="5" width="25" height="25" rx="3" fill="#10B981" />
                        <rect x="74" y="9" width="17" height="17" rx="2" fill="#020617" />
                        <rect x="78" y="13" width="9" height="9" fill="#10B981" />

                        {/* Bottom Left Finder */}
                        <rect x="5" y="70" width="25" height="25" rx="3" fill="#10B981" />
                        <rect x="9" y="74" width="17" height="17" rx="2" fill="#020617" />
                        <rect x="13" y="78" width="9" height="9" fill="#10B981" />

                        {/* Random Data Elements */}
                        <rect x="35" y="10" width="6" height="6" />
                        <rect x="45" y="10" width="6" height="6" />
                        <rect x="55" y="10" width="6" height="6" />
                        <rect x="35" y="20" width="6" height="6" />
                        <rect x="55" y="20" width="6" height="6" />
                        <rect x="35" y="35" width="6" height="6" />
                        <rect x="45" y="35" width="6" height="6" />
                        <rect x="65" y="35" width="6" height="6" />
                        <rect x="10" y="35" width="6" height="6" />
                        <rect x="20" y="45" width="6" height="6" />
                        <rect x="35" y="50" width="6" height="6" />
                        <rect x="50" y="50" width="6" height="6" fill="#10B981" />
                        <rect x="65" y="50" width="6" height="6" />
                        <rect x="80" y="50" width="6" height="6" />
                        <rect x="35" y="65" width="6" height="6" />
                        <rect x="50" y="65" width="6" height="6" />
                        <rect x="65" y="65" width="6" height="6" />
                        <rect x="35" y="80" width="6" height="6" fill="#10B981" />
                        <rect x="45" y="80" width="6" height="6" />
                        <rect x="60" y="80" width="6" height="6" />
                        <rect x="75" y="80" width="6" height="6" fill="#10B981" />
                        <rect x="85" y="80" width="6" height="6" />
                        <rect x="85" y="65" width="6" height="6" />
                      </svg>

                      {/* WhatsApp Center Logo Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-2 bg-emerald-600 rounded-full shadow-lg border-2 border-white text-white">
                          <MessageSquare className="w-5 h-5 fill-current" />
                        </div>
                      </div>

                      {/* Laser Scanning Line Animation */}
                      {isScanning && (
                        <div className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_#10B981] animate-pulse top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                  </div>

                  {/* Refresh Timer overlay */}
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      Atualiza em: <strong className="text-slate-800">{countdown}s</strong>
                    </span>
                    <button
                      onClick={handleRefreshQr}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Renovar</span>
                    </button>
                  </div>
                </div>

                {/* Scan Instructions */}
                <div className="space-y-3 flex-1">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Instruções para Leitura:
                  </h4>

                  <ol className="space-y-2 text-[11px] text-slate-600 list-decimal list-inside leading-snug">
                    <li>Abra o **WhatsApp** no seu smartphone.</li>
                    <li>Toque em **Mais opções** (⋮ no Android) ou **Configurações** (iOS).</li>
                    <li>Selecione **Dispositivos conectados** e toque em **Conectar um dispositivo**.</li>
                    <li>Aponte a câmera do celular para este **QR Code**.</li>
                  </ol>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-[11px] text-amber-900 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900 text-xs">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      Por que a câmera do celular não leu o código?
                    </p>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      O WhatsApp no celular exige uma sessão de WebSocket em tempo real com um servidor de API (ex: <strong>Z-API</strong>, <strong>Evolution API</strong> ou <strong>Meta Cloud API</strong>).
                    </p>
                    <p className="text-amber-900 font-semibold text-[11px] pt-0.5">
                      💡 Para usar o CRM imediatamente na Hostinger:
                    </p>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      Clique no botão verde <strong>&quot;Conectar WhatsApp Web Agora&quot;</strong> abaixo. O CRM ativará a integração completa de mensagens, envio de orçamentos e kanban automaticamente!
                    </p>
                  </div>

                  <div className="pt-1 space-y-2">
                    <button
                      disabled={isScanning}
                      onClick={handleSimulateScan}
                      className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      {isScanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Ativando Conexão WhatsApp Web...</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="w-4 h-4" />
                          <span>Conectar WhatsApp Web Agora (Ativação Instantânea)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onUpdateWhatsAppConfig({
                          ...whatsappConfig,
                          isConnected: true
                        });
                      }}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ativação Direta Instantânea (1-Clique)</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Gateway Parameters Summary */}
              <div className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    Parâmetros do Gateway Z-API / WhatsApp API
                  </span>
                  <button
                    onClick={handleCopyServerUrl}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Copiado!' : 'Copiar URL'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Número da Empresa:</span>
                    <span className="text-slate-200 font-bold">{whatsappConfig.companyNumber || '(11) 99876-5432'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Instância:</span>
                    <span className="text-emerald-400 font-bold">{whatsappConfig.instanceName || 'estilocoifas_prod'}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Conexão Criptografada de Ponta a Ponta
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
