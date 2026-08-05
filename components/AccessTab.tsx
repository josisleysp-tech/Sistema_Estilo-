'use client';

import React, { useState } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Check, 
  X, 
  UserPlus, 
  Clock, 
  Lock, 
  Unlock,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Trash2,
  DollarSign
} from 'lucide-react';
import { UserAccess, PermissionMatrix } from '../lib/types';

const ALL_TABS = [
  'Painel Geral',
  'Vendas',
  'Consulta de Pedidos',
  'Consulta de Orçamentos',
  'Cadastro de Clientes',
  'Cadastro de Produtos',
  'Controle de Estoque',
  'Produção',
  'Gestão de Acessos',
  'Parâmetros',
  'Relatórios',
  'Ordens de Compra',
  'Financeiro',
  'Ficha do Fornecedor',
  'Visualizador OP'
];

interface AccessTabProps {
  users: UserAccess[];
  onUpdatePermissions: (name: string, updatedPermissions: PermissionMatrix) => void;
  onUpdateSchedule: (name: string, restrictToWorkHours: boolean, start: string, end: string) => void;
  onUpdateHideOrderValues?: (name: string, hide: boolean) => void;
  onAddUser?: (user: UserAccess) => void;
  onDeleteUser?: (name: string) => void;
  onUpdateUserPin?: (name: string, pin: string) => void;
  onUpdateAllowedTabs?: (name: string, allowedTabs: string[]) => void;
  onUpdateUserStatus?: (name: string, status: 'Ativo' | 'Ausente' | 'Inativo') => void;
  onUpdateCommission?: (name: string, eligible: boolean, percentage: number) => void;
}

export default function AccessTab({
  users,
  onUpdatePermissions,
  onUpdateSchedule,
  onUpdateHideOrderValues,
  onAddUser,
  onDeleteUser,
  onUpdateUserPin,
  onUpdateAllowedTabs,
  onUpdateUserStatus,
  onUpdateCommission
}: AccessTabProps) {
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Derive selectedUser directly from users prop to guarantee freshness
  const selectedUser = users.find(u => u.name === selectedUserName) || null;

  const filteredUsers = users.filter(user => showInactive || user.status !== 'Inativo');

  // States for collaborator creation form
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCollabName, setNewCollabName] = useState('');
  const [newCollabRole, setNewCollabRole] = useState('');
  const [newCollabEmail, setNewCollabEmail] = useState('');
  const [newCollabStatus, setNewCollabStatus] = useState<'Ativo' | 'Ausente' | 'Inativo'>('Ativo');
  const [newCollabPin, setNewCollabPin] = useState('1234');
  const [newCollabCommissionEligible, setNewCollabCommissionEligible] = useState(false);
  const [newCollabCommissionPct, setNewCollabCommissionPct] = useState<number>(5);
  
  // Access levels for new collaborator
  const [allowSales, setAllowSales] = useState(true);
  const [allowOrders, setAllowOrders] = useState(true);
  const [hideOrderPrices, setHideOrderPrices] = useState(false);
  const [allowProducts, setAllowProducts] = useState(true);
  const [allowCustomers, setAllowCustomers] = useState(true);

  // Allowed tabs for the new collaborator
  const [newCollabAllowedTabs, setNewCollabAllowedTabs] = useState<string[]>([
    'Painel Geral',
    'Vendas',
    'Consulta de Pedidos',
    'Consulta de Orçamentos',
    'Cadastro de Clientes',
    'Cadastro de Produtos',
    'Controle de Estoque',
    'Produção',
    'Relatórios',
    'Ordens de Compra',
    'Financeiro',
    'Ficha do Fornecedor',
    'Visualizador OP'
  ]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollabName.trim() || !newCollabEmail.trim() || !newCollabRole.trim() || !newCollabPin.trim()) {
      return;
    }

    const newUser: UserAccess = {
      name: newCollabName.trim(),
      role: newCollabRole.trim(),
      status: newCollabStatus,
      lastLogin: 'Nunca logou',
      email: newCollabEmail.trim(),
      restrictToWorkHours: false,
      accessWindowStart: '08:00',
      accessWindowEnd: '18:00',
      hideOrderValues: hideOrderPrices,
      pin: newCollabPin.trim(),
      commissionEligible: newCollabCommissionEligible,
      commissionPercentage: newCollabCommissionEligible ? Number(newCollabCommissionPct || 0) : 0,
      permissions: {
        sales: { view: allowSales, edit: allowSales, del: false },
        inventory: { view: allowProducts, edit: allowProducts, del: false },
        production: { view: allowOrders, edit: allowOrders, del: false },
        customers: { view: allowCustomers, edit: allowCustomers, del: false },
        settings: { view: false, edit: false, del: false }
      },
      allowedTabs: newCollabAllowedTabs
    };

    onAddUser?.(newUser);
    
    // Reset form fields
    setNewCollabName('');
    setNewCollabRole('');
    setNewCollabEmail('');
    setNewCollabStatus('Ativo');
    setNewCollabPin('1234');
    setNewCollabCommissionEligible(false);
    setNewCollabCommissionPct(5);
    setAllowSales(true);
    setAllowOrders(true);
    setHideOrderPrices(false);
    setAllowProducts(true);
    setAllowCustomers(true);
    setNewCollabAllowedTabs([
      'Painel Geral',
      'Vendas',
      'Consulta de Pedidos',
      'Consulta de Orçamentos',
      'Cadastro de Clientes',
      'Cadastro de Produtos',
      'Controle de Estoque',
      'Produção',
      'Relatórios',
      'Ordens de Compra',
      'Financeiro',
      'Ficha do Fornecedor',
      'Visualizador OP'
    ]);
    setIsAddModalOpen(false);
  };

  const handleTogglePermission = (
    module: keyof PermissionMatrix,
    action: 'view' | 'edit' | 'del'
  ) => {
    if (!selectedUser) return;

    // Deep clone permissions
    const updatedPermissions = {
      ...selectedUser.permissions,
      [module]: {
        ...selectedUser.permissions[module],
        [action]: !selectedUser.permissions[module][action]
      }
    };

    // Bubble up to parent
    onUpdatePermissions(selectedUser.name, updatedPermissions);
  };

  const handleToggleScheduleRestriction = () => {
    if (!selectedUser) return;
    const nextVal = !selectedUser.restrictToWorkHours;

    onUpdateSchedule(
      selectedUser.name, 
      nextVal, 
      selectedUser.accessWindowStart, 
      selectedUser.accessWindowEnd
    );
  };

  const handleTimeChange = (type: 'start' | 'end', value: string) => {
    if (!selectedUser) return;

    const start = type === 'start' ? value : selectedUser.accessWindowStart;
    const end = type === 'end' ? value : selectedUser.accessWindowEnd;

    onUpdateSchedule(selectedUser.name, selectedUser.restrictToWorkHours, start, end);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users directory table on left */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="access-management-heading" className="text-xl font-bold text-slate-800 tracking-tight">Gerenciamento de Acessos & TI</h2>
              <p className="text-xs text-slate-500 mt-1">Controle de acessos, privilégios de login e perfis de segurança</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Colaborador
            </button>
          </div>

          {/* Dense user cards list */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 flex flex-wrap gap-4 items-center justify-between">
              <span>Diretório de Funcionários Autenticados</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 select-none">
                  <input 
                    type="checkbox" 
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Mostrar inativos</span>
                </label>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                  {filteredUsers.length} Contas
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/85 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3.5">Nome do Usuário</th>
                    <th className="px-5 py-3.5">Perfil / Função</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Último Acesso</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUser?.name === user.name;
                    return (
                      <tr 
                        key={user.name} 
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50/30 font-medium' : ''
                        }`}
                        onClick={() => setSelectedUserName(user.name)}
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">{user.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">{user.role}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            user.status === 'Ausente' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${
                              user.status === 'Ativo' ? 'bg-emerald-500' :
                              user.status === 'Ausente' ? 'bg-amber-500' :
                              'bg-slate-400'
                            }`}></span>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-500">{user.lastLogin}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedUserName(user.name); }}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                            >
                              Configurar Matriz
                            </button>
                            {onDeleteUser && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Tem certeza que deseja excluir o colaborador "${user.name}"?`)) {
                                    onDeleteUser(user.name);
                                    if (selectedUserName === user.name) {
                                      setSelectedUserName(null);
                                    }
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Excluir Colaborador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center bg-slate-50 border-t border-slate-100">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Nenhum colaborador cadastrado</p>
                  <p className="text-xs text-slate-500 mt-1">Clique no botão &quot;Cadastrar Colaborador&quot; acima para adicionar um novo funcionário ao sistema.</p>
                </div>
              )}
            </div>
          </div>

          {/* Policy block banner */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase">Segurança Cibernética & Auditoria</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Alterações nesta matriz de permissões geram logs de auditoria automáticos e revogam as sessões correspondentes instantaneamente. Recomenda-se cautela ao remover permissões de administradores.
              </p>
            </div>
          </div>
        </div>

        {/* Role permission and schedule editor panel on right */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col h-full justify-between">
          {selectedUser ? (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  Editor de Segurança Ativo
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-2">{selectedUser.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{selectedUser.role}</p>
              </div>

              {/* Password / PIN Section */}
              <div className="bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/60 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-700">Senha / PIN de Acesso (numérico)</p>
                  <span className="text-[9px] text-slate-400 font-mono">Acesso do operador</span>
                </div>
                <input 
                  type="text"
                  maxLength={6}
                  value={selectedUser.pin || ''}
                  onChange={(e) => {
                    const nextPin = e.target.value.replace(/\D/g, '');
                    onUpdateUserPin?.(selectedUser.name, nextPin);
                  }}
                  className="w-full text-xs font-mono font-bold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  placeholder="Ex: 1234"
                />
              </div>

              {/* Status do Colaborador Section */}
              <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200/60 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Status do Colaborador</p>
                  <span className="text-[9px] text-slate-400 font-mono">Situação do cadastro</span>
                </div>
                <select
                  value={selectedUser.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as 'Ativo' | 'Ausente' | 'Inativo';
                    onUpdateUserStatus?.(selectedUser.name, nextStatus);
                  }}
                  className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"
                >
                  <option value="Ativo">🟢 Ativo (Acesso Liberado)</option>
                  <option value="Ausente">🟡 Ausente (Acesso Temporário)</option>
                  <option value="Inativo">🔴 Inativo (Acesso Bloqueado / Em Desuso)</option>
                </select>
              </div>

              {/* Permissions list Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Matriz de Controle de Recursos</h4>
                
                <div className="space-y-3">
                  {(['sales', 'inventory', 'production', 'customers', 'settings'] as Array<keyof PermissionMatrix>).map((module) => {
                    const val = selectedUser.permissions[module];
                    const displayModuleName = 
                      module === 'sales' ? 'Vendas Comerciais' :
                      module === 'inventory' ? 'Inventário e Estoque' :
                      module === 'production' ? 'Chão de Fábrica' :
                      module === 'customers' ? 'Clientes e Contratos' :
                      'Parâmetros e Configurações';

                    return (
                      <div key={module} className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex flex-col gap-2">
                        <p className="text-xs font-bold text-slate-700">{displayModuleName}</p>
                        
                        <div className="flex gap-2 text-[10px] font-semibold">
                          <button 
                            onClick={() => handleTogglePermission(module, 'view')}
                            className={`flex-1 py-1 px-1.5 border rounded text-center transition-colors ${
                              val.view ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            LER
                          </button>
                          <button 
                            onClick={() => handleTogglePermission(module, 'edit')}
                            className={`flex-1 py-1 px-1.5 border rounded text-center transition-colors ${
                              val.edit ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            EDITAR
                          </button>
                          <button 
                            onClick={() => handleTogglePermission(module, 'del')}
                            className={`flex-1 py-1 px-1.5 border rounded text-center transition-colors ${
                              val.del ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            EXCLUIR
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Restriction Toggle */}
              <div className="bg-rose-50/40 p-3.5 rounded-xl border border-rose-100 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex-1">
                  <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">Restrição de Valores</p>
                  <p className="text-[10px] text-rose-600 mt-0.5 leading-relaxed">
                    Ocultar preços unitários, subtotais e faturamentos globais na consulta de pedidos deste colaborador.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedUser) return;
                    const nextVal = !selectedUser.hideOrderValues;
                    onUpdateHideOrderValues?.(selectedUser.name, nextVal);
                  }}
                  className="text-rose-600 hover:text-rose-800 transition-colors flex-shrink-0"
                  title="Alternar Ocultação de Valores"
                >
                  {selectedUser.hideOrderValues ? (
                    <ToggleRight className="w-8 h-8 text-rose-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Commission Settings Section */}
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Comissão sobre Pedidos
                    </p>
                    <p className="text-[10px] text-emerald-700 mt-0.5 leading-relaxed">
                      Calculada exclusivamente em vendas para <strong>Cliente Final</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedUser) return;
                      const nextEligible = !selectedUser.commissionEligible;
                      const currentPct = selectedUser.commissionPercentage !== undefined ? selectedUser.commissionPercentage : 5;
                      onUpdateCommission?.(selectedUser.name, nextEligible, currentPct);
                    }}
                    className="text-emerald-600 hover:text-emerald-800 transition-colors flex-shrink-0"
                    title="Alternar Habilitação de Comissão"
                  >
                    {selectedUser.commissionEligible ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {selectedUser.commissionEligible && (
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">
                        Porcentagem de Comissão (%)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={selectedUser.commissionPercentage !== undefined ? selectedUser.commissionPercentage : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            onUpdateCommission?.(selectedUser.name, true, val);
                          }}
                          className="w-24 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-emerald-800 bg-white"
                        />
                        <span className="text-xs font-bold text-emerald-700">% sobre o pedido</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Authorized Menu Tabs Selection */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Abas do Menu Autorizadas</h4>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Marque as abas que este colaborador poderá visualizar e acessar no menu lateral do sistema.
                </p>
                <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                  {ALL_TABS.map((tab) => {
                    const isAllowed = selectedUser.allowedTabs ? selectedUser.allowedTabs.includes(tab) : true;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          const currentAllowed = selectedUser.allowedTabs || ALL_TABS;
                          let nextAllowed: string[];
                          if (currentAllowed.includes(tab)) {
                            nextAllowed = currentAllowed.filter((t) => t !== tab);
                          } else {
                            nextAllowed = [...currentAllowed, tab];
                          }
                          onUpdateAllowedTabs?.(selectedUser.name, nextAllowed);
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all text-left truncate cursor-pointer ${
                          isAllowed
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                            : 'bg-slate-50/50 border-slate-150 text-slate-400 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAllowed ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></span>
                        <span className="truncate">{tab}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Access window clock schedule */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Escala de Horários</h4>
                  </div>
                  <button 
                    onClick={handleToggleScheduleRestriction}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Ativar/Desativar Janela de Horário"
                  >
                    {selectedUser.restrictToWorkHours ? (
                      <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-semibold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Restrito</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Irrestrito</span>
                      </div>
                    )}
                  </button>
                </div>

                {selectedUser.restrictToWorkHours && (
                  <div className="bg-slate-50 p-3 border border-slate-100 rounded-lg space-y-3 animate-in fade-in duration-200">
                    <p className="text-[10px] text-slate-500">Impedir acesso fora das janelas comerciais:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[9px] text-slate-400 uppercase font-mono">Entrada</label>
                        <input 
                          type="time" 
                          value={selectedUser.accessWindowStart}
                          onChange={(e) => handleTimeChange('start', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none"
                        />
                      </div>
                      <span className="text-slate-400 self-end mb-1">-</span>
                      <div className="flex-1">
                        <label className="block text-[9px] text-slate-400 uppercase font-mono">Saída</label>
                        <input 
                          type="time" 
                          value={selectedUser.accessWindowEnd}
                          onChange={(e) => handleTimeChange('end', e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-24 text-slate-400 space-y-3">
              <ShieldCheck className="w-12 h-12 text-slate-300" />
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Selecione uma conta</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto">Selecione uma conta no diretório de funcionários para editar a matriz de segurança.</p>
              </div>
            </div>
          )}

          {/* Footer info lock indicator */}
          <div className="border-t border-slate-100 pt-4 mt-6 text-[10px] text-slate-400 flex items-center justify-center gap-1 font-medium font-mono">
            <Lock className="w-3.5 h-3.5 text-slate-300" />
            <span>Controle de acessos criptografado SHA-256</span>
          </div>
        </div>
      </div>

      {/* Cadastro de Colaborador Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Ficha de Cadastro de Colaborador</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Módulo Gerencial • Novo Usuário</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* Basic Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Nome Completo *</label>
                    <input 
                      type="text" 
                      required
                      value={newCollabName}
                      onChange={(e) => setNewCollabName(e.target.value)}
                      placeholder="Ex: Roberto Carlos"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Corporativo *</label>
                    <input 
                      type="email" 
                      required
                      value={newCollabEmail}
                      onChange={(e) => setNewCollabEmail(e.target.value)}
                      placeholder="Ex: roberto.carlos@kineticerp.com"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Cargo / Função *</label>
                    <input 
                      type="text" 
                      required
                      value={newCollabRole}
                      onChange={(e) => setNewCollabRole(e.target.value)}
                      placeholder="Ex: Analista de Faturamento"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Status Inicial</label>
                    <select
                      value={newCollabStatus}
                      onChange={(e) => setNewCollabStatus(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Ausente">Ausente</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Senha / PIN de Acesso (numérico) *</label>
                    <input 
                      type="text" 
                      required
                      maxLength={6}
                      pattern="\d*"
                      value={newCollabPin}
                      onChange={(e) => setNewCollabPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 1234"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-indigo-600"
                    />
                  </div>
                </div>

                {/* Permissions Toggles Panel */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Níveis de Acesso Autorizados</h4>
                  
                  <div className="space-y-2.5">
                    {/* Acesso a vendas */}
                    <label className="flex items-start gap-3 bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-150 transition-colors cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowSales}
                        onChange={(e) => setAllowSales(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-slate-700">Acesso a Vendas Comerciais</span>
                      </div>
                    </label>

                    {/* Acesso ao pedido */}
                    <label className="flex items-start gap-3 bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-150 transition-colors cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowOrders}
                        onChange={(e) => setAllowOrders(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-slate-700">Acesso à Consulta de Pedidos</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Permite consultar e buscar pedidos de venda por cliente e SKU.</span>
                      </div>
                    </label>

                    {/* Ocultar valor nos pedidos */}
                    {allowOrders && (
                      <label className="flex items-start gap-3 bg-rose-50/40 hover:bg-rose-50/60 p-2.5 rounded-lg border border-rose-100 transition-colors cursor-pointer ml-6 animate-in slide-in-from-left-2 duration-200">
                        <input 
                          type="checkbox" 
                          checked={hideOrderPrices}
                          onChange={(e) => setHideOrderPrices(e.target.checked)}
                          className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500/20 mt-0.5"
                        />
                        <div>
                          <span className="font-semibold text-rose-800">Sem visualizar valores dos pedidos</span>
                          <span className="block text-[10px] text-rose-600 mt-0.5">Oculta totalmente os preços dos itens, totais de pedidos e KPIs de faturamento.</span>
                        </div>
                      </label>
                    )}

                    {/* Acesso a cadastro de produtos */}
                    <label className="flex items-start gap-3 bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-150 transition-colors cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowProducts}
                        onChange={(e) => setAllowProducts(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-slate-700">Acesso a Cadastro de Produtos & Estoque</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Permite cadastrar insumos, atualizar estoques e alterar fichas técnicas.</span>
                      </div>
                    </label>

                    {/* Acesso a cadastro de clientes */}
                    <label className="flex items-start gap-3 bg-slate-50 hover:bg-slate-100/50 p-2.5 rounded-lg border border-slate-150 transition-colors cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={allowCustomers}
                        onChange={(e) => setAllowCustomers(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-slate-700">Acesso a Cadastro de Clientes</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">Permite visualizar e cadastrar novas empresas e CNPJs no ERP.</span>
                      </div>
                    </label>

                    {/* Benefício de Comissão */}
                    <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            Comissão por Pedido
                          </span>
                          <span className="block text-[10px] text-emerald-700 mt-0.5">
                            Habilita comissão sobre pedidos de <strong>Cliente Final</strong>.
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newCollabCommissionEligible}
                          onChange={(e) => setNewCollabCommissionEligible(e.target.checked)}
                          className="w-4 h-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500/20"
                        />
                      </div>

                      {newCollabCommissionEligible && (
                        <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">
                              Porcentagem de Comissão (%)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                required={newCollabCommissionEligible}
                                value={newCollabCommissionPct}
                                onChange={(e) => setNewCollabCommissionPct(Number(e.target.value))}
                                className="w-full text-xs px-3 py-1.5 rounded-lg border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono font-bold text-emerald-800 bg-white"
                              />
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-700 flex-1 leading-tight">
                            Apenas pedidos de clientes do tipo <strong>Cliente Final</strong> acumularão créditos.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu Tabs authorized for new collaborator */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Abas do Menu Habilitadas</h4>
                  <p className="text-[10px] text-slate-400">Selecione as telas que o novo colaborador poderá abrir no menu lateral.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {ALL_TABS.map((tab) => {
                      const isAllowed = newCollabAllowedTabs.includes(tab);
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            if (isAllowed) {
                              setNewCollabAllowedTabs(prev => prev.filter(t => t !== tab));
                            } else {
                              setNewCollabAllowedTabs(prev => [...prev, tab]);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all text-left truncate cursor-pointer ${
                            isAllowed
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                              : 'bg-slate-50 border-slate-150 text-slate-400 hover:bg-slate-100/50'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isAllowed ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></span>
                          <span className="truncate">{tab}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
