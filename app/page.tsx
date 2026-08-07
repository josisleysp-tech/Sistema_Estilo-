'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Cpu, 
  Database, 
  DollarSign, 
  Layers, 
  Lock, 
  LogOut, 
  Menu, 
  Package, 
  ShieldAlert, 
  ShoppingBag, 
  Sliders, 
  Truck, 
  Users, 
  FileCode,
  FileText,
  Building2,
  Bell,
  Search,
  UserCheck,
  ClipboardList,
  Calendar,
  CreditCard,
  LogIn,
  Fingerprint,
  KeyRound,
  Settings,
  MessageSquare
} from 'lucide-react';

// Import Types
import { 
  InventoryItem, 
  ProductionOrder, 
  SalesOrder, 
  PurchaseOrder, 
  UserAccess, 
  PermissionMatrix,
  Customer,
  Supplier,
  FinancialTransaction,
  CommissionPayout,
  CrmLead,
  WhatsAppConfig
} from '../lib/types';

import { getDeliveryAlertStatus, safeSetItem } from '../lib/utils';

// Import Tab Components
import DashboardTab from '../components/DashboardTab';
import SalesTab from '../components/SalesTab';
import InventoryTab from '../components/InventoryTab';
import ProductionTab from '../components/ProductionTab';
import AccessTab from '../components/AccessTab';
import ReportsTab from '../components/ReportsTab';
import BlueprintTab from '../components/BlueprintTab';
import SupplierTab from '../components/SupplierTab';
import PurchaseTab from '../components/PurchaseTab';
import CustomerTab from '../components/CustomerTab';
import ProductTab from '../components/ProductTab';
import OrderQueryTab from '../components/OrderQueryTab';
import BudgetQueryTab from '../components/BudgetQueryTab';
import ParametersTab from '../components/ParametersTab';
import FinanceTab from '../components/FinanceTab';
import CrmTab from '../components/CrmTab';

// Auxiliar para tratar respostas do servidor e evitar erros de parsing de HTML como JSON no Vercel (ex: 504 Timeout ou 500 Erro)
async function parseResponseJson(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    const errorPrefix = res.status >= 500 ? 'Erro Interno do Servidor (500)' : `Erro ${res.status}`;
    let detail = '';
    
    // Verifica se a resposta é na verdade o código HTML da página inicial ou um fallback de SPA
    const trimmed = text.trim();
    const isHtml = trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || trimmed.includes('<!doctype') || trimmed.includes('<html') || trimmed.includes('<body');
    
    if (isHtml) {
      detail = "A rota da API retornou uma página HTML em vez de JSON. Isso indica que a rota de sincronização (/api/db/sync) não está respondendo corretamente, ou o servidor a redirecionou para a página inicial (SPA fallback). Certifique-se de configurar a variável DATABASE_URL com um Connection Pooler do Supabase nas configurações do projeto.";
    } else {
      if (text.includes("DATABASE_URL")) {
        detail = "DATABASE_URL não configurada ou inválida nas variáveis de ambiente do Vercel.";
      } else if (text.includes("timeout") || text.includes("Timeout") || res.status === 504) {
        detail = "O banco de dados do Supabase demorou muito para responder (Timeout). Verifique se o banco de dados não está pausado ou se o Pooler de Conexão correto foi usado no seu DATABASE_URL.";
      } else if (text.includes("password authentication failed")) {
        detail = "Falha de autenticação: Senha do banco de dados incorreta no DATABASE_URL.";
      } else if (res.status === 404) {
        detail = "A rota de sincronização /api/db/sync não foi encontrada. Certifique-se de que ela está implantada.";
      } else {
        detail = text.substring(0, 150);
      }
    }
    throw new Error(`${errorPrefix}: ${detail}`);
  }
  return res.json();
}

function areItemsEqual<T>(a: T, b: T, idKey: keyof T): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Array.from(new Set([...Object.keys(a as any), ...Object.keys(b as any)]));
  for (const k of keys) {
    if (k === 'updatedAt' || k === 'lastUpdated' || k === 'last_updated') continue;
    
    const valA = (a as any)[k];
    const valB = (b as any)[k];

    if (valA === valB) continue;

    // Deep comparison for non-null objects/arrays
    if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

function areListsEqual<T>(listA: T[], listB: T[], idKey: keyof T): boolean {
  if (!listA || !listB) return false;
  if (listA.length !== listB.length) return false;
  const mapB = new Map(listB.map(item => [item[idKey], item]));
  for (const itemA of listA) {
    const itemB = mapB.get(itemA[idKey]);
    if (!itemB) return false;
    if (!areItemsEqual(itemA, itemB, idKey)) return false;
  }
  return true;
}

function mergeStates<T extends { updatedAt?: string }>(
  localList: T[],
  serverList: T[],
  lastSyncedList: T[],
  idKey: keyof T
): { merged: T[], changed: boolean } {
  let changed = false;
  const merged: T[] = [];
  const localMap = new Map(localList.map(item => [item[idKey], item]));
  const serverMap = new Map(serverList.map(item => [item[idKey], item]));
  const lastSyncedMap = new Map(lastSyncedList.map(item => [item[idKey], item]));

  // 1. Process all items that exist on the server
  for (const [id, serverItem] of serverMap.entries()) {
    const localItem = localMap.get(id);
    const lastSyncedItem = lastSyncedMap.get(id);

    if (localItem) {
      // Check if local item is dirty (has unsaved edits since last sync)
      const isLocalDirty = lastSyncedItem 
        ? !areItemsEqual(localItem, lastSyncedItem, idKey)
        : true; // if not in lastSynced, it's newly created locally and unsaved

      if (isLocalDirty) {
        // Keep local item since the current user edited it and it hasn't synced yet
        merged.push(localItem);
      } else {
        // Local is not dirty. Use the server's version.
        if (!areItemsEqual(localItem, serverItem, idKey)) {
          merged.push(serverItem);
          changed = true;
        } else {
          merged.push(localItem);
        }
      }
    } else {
      // Item does not exist locally. Was it deleted locally?
      const wasDeletedLocally = lastSyncedMap.has(id);
      if (wasDeletedLocally) {
        // Don't restore it; the deletion will be synced shortly.
      } else {
        // It is a new item from another user! Add it.
        merged.push(serverItem);
        changed = true;
      }
    }
  }

  // 2. Process items that exist locally but not on the server
  for (const [id, localItem] of localMap.entries()) {
    if (!serverMap.has(id)) {
      const wasCreatedLocally = !lastSyncedMap.has(id);
      if (wasCreatedLocally) {
        merged.push(localItem);
      } else {
        // It existed but was deleted by another user on the server!
        changed = true;
      }
    }
  }

  return { merged, changed };
}

// Helper to safely generate the next OP ID based on existing production orders
const getNextOPId = (currentOPs: ProductionOrder[], offset: number = 0): string => {
  let maxNum = 4200;
  currentOPs.forEach(op => {
    const match = op.id.match(/^OP-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  });
  return `OP-${maxNum + 1 + offset}`;
};

// System Fallback Admin User when no collaborators exist
const DEFAULT_ADMIN_USER: UserAccess = {
  name: 'Administrador',
  role: 'Administrador',
  status: 'Ativo',
  lastLogin: 'Hoje',
  email: 'admin@estilocoifas.com.br',
  restrictToWorkHours: false,
  accessWindowStart: '00:00',
  accessWindowEnd: '23:59',
  pin: '3040',
  permissions: {
    sales: { view: true, edit: true, del: true },
    inventory: { view: true, edit: true, del: true },
    production: { view: true, edit: true, del: true },
    customers: { view: true, edit: true, del: true },
    settings: { view: true, edit: true, del: true }
  },
  allowedTabs: [
    'Painel Geral', 'CRM & WhatsApp', 'Vendas', 'Consulta de Pedidos', 'Consulta de Orçamentos',
    'Cadastro de Clientes', 'Cadastro de Fornecedores', 'Cadastro de Produtos', 'Controle de Estoque',
    'Produção', 'Gestão de Acessos', 'Parâmetros', 'Relatórios',
    'Ordens de Compra', 'Financeiro', 'Ficha do Fornecedor', 'Visualizador OP'
  ]
};

export default function Page() {
  const [activeTab, setActiveTab] = useState<string>('Painel Geral');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  
  // Shared Dynamic States
  
  // 1. Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      sku: 'ST-2041',
      name: 'Eixo de Transmissão Principal',
      category: 'Mecânica',
      stock: 72,
      max: 100,
      price: 1250,
      purchasePrice: 540,
      salesPrice: 1250,
      unit: 'UN',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&h=300&q=80',
      stages: ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA']
    },
    {
      sku: 'ST-9012',
      name: 'Placa Servo Controladora C3',
      category: 'Eletrônica',
      stock: 15,
      max: 80,
      price: 840,
      purchasePrice: 320,
      salesPrice: 840,
      unit: 'UN',
      image: 'https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?auto=format&fit=crop&w=300&h=300&q=80',
      stages: ['CAD', 'LASER', 'ELÉTRICA FILTROS']
    },
    {
      sku: 'ST-4082',
      name: 'Sensor Indutivo de Presença IP67',
      category: 'Automação',
      stock: 120,
      max: 150,
      price: 190,
      purchasePrice: 75,
      salesPrice: 190,
      unit: 'UN',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&h=300&q=80',
      stages: ['ELÉTRICA FILTROS']
    },
    {
      sku: 'ST-3022',
      name: 'Válvula Hidráulica Direcional',
      category: 'Pneumática',
      stock: 8,
      max: 50,
      price: 2100,
      purchasePrice: 950,
      salesPrice: 2100,
      unit: 'UN',
      image: 'https://images.unsplash.com/photo-1617791160536-598cf32026fb?auto=format&fit=crop&w=300&h=300&q=80',
      stages: ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS']
    },
    {
      sku: 'ST-5091',
      name: 'Aço Laminado G-42 (Bobina)',
      category: 'Massa Corrente',
      stock: 45,
      max: 50,
      price: 4200,
      purchasePrice: 1800,
      salesPrice: 4200,
      unit: 'KG',
      image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=300&h=300&q=80',
      stages: ['CAD', 'LASER', 'CORTE DOBRA']
    }
  ]);

  // 2. Production Orders (OPs) State
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([
    {
      id: 'OP-4291',
      product: 'Eixo de Transmissão Principal',
      qty: 20,
      line: 'Linha A',
      priority: 'Alta',
      status: 'CORTE DOBRA',
      supervisor: 'Carlos Eduardo',
      progress: 65,
      date: '2026-06-22',
      files: ['Desenho_Tecnico_Turbina.dwg', 'Especificacoes_Montagem.pdf'],
      salesOrderId: 'VD-1092',
      salesOrderClient: 'Siderúrgica Gerdau S.A.',
      stageSupervisors: {
        'CAD': 'Carlos Eduardo',
        'LASER': 'Ana Paula',
        'CORTE DOBRA': 'Carlos Eduardo'
      }
    },
    {
      id: 'OP-4292',
      product: 'Placa Servo Controladora C3',
      qty: 50,
      line: 'Linha B',
      priority: 'Crítica',
      status: 'ELÉTRICA FILTROS',
      supervisor: 'Ana Paula',
      progress: 90,
      date: '2026-06-25',
      files: ['Placa_Esquematico.dwg'],
      salesOrderId: 'VD-1093',
      salesOrderClient: 'WEG Motores Elétricos',
      stageSupervisors: {
        'CAD': 'Ana Paula',
        'LASER': 'Fernanda Souza',
        'CORTE DOBRA': 'Carlos Eduardo',
        'PINTURA': 'Marcos Silva',
        'ELÉTRICA FILTROS': 'Ana Paula'
      }
    },
    {
      id: 'OP-4293',
      product: 'Válvula Hidráulica Direcional',
      qty: 15,
      line: 'Linha A',
      priority: 'Média',
      status: 'CAD',
      supervisor: 'Fernanda Souza',
      progress: 0,
      date: '2026-06-26',
      files: [],
      salesOrderId: 'VD-1094',
      salesOrderClient: 'Petrobras Refinaria Replan',
      stageSupervisors: {
        'CAD': 'Fernanda Souza'
      }
    },
    {
      id: 'OP-4294',
      product: 'Sensor Indutivo de Presença IP67',
      qty: 100,
      line: 'Linha C',
      priority: 'Baixa',
      status: 'CONCLUÍDO',
      supervisor: 'Marcos Silva',
      progress: 100,
      date: '2026-06-20',
      files: ['Certificado_Calibracao.pdf'],
      stageSupervisors: {
        'CAD': 'Carlos Eduardo',
        'LASER': 'Ana Paula',
        'CORTE DOBRA': 'Fernanda Souza',
        'PINTURA': 'Marcos Silva',
        'ELÉTRICA FILTROS': 'Marcos Silva',
        'CONCLUÍDO': 'Marcos Silva'
      }
    }
  ]);

  // 3. Sales Orders State
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([
    {
      id: 'VD-1092',
      serialNumber: 1092,
      client: 'Siderúrgica Gerdau S.A.',
      value: 85200,
      date: '2026-06-20',
      status: 'Enviado',
      deliveryDate: '2026-07-02',
      items: 'Eixo de Transmissão Principal (x40), Sensor IP67 (x100)',
      operator: 'Eduardo Fontes'
    },
    {
      id: 'VD-1093',
      serialNumber: 1093,
      client: 'WEG Motores Elétricos',
      value: 42000,
      date: '2026-06-24',
      status: 'Faturado',
      deliveryDate: '2026-06-29',
      items: 'Placa Servo Controladora C3 (x50)',
      operator: 'Eduardo Fontes'
    },
    {
      id: 'VD-1094',
      serialNumber: 1094,
      client: 'Petrobras Refinaria Replan',
      value: 125000,
      date: '2026-06-25',
      status: 'Pendente',
      deliveryDate: '2026-06-25',
      items: 'Válvula Hidráulica (x20), Eixo de Transmissão (x10)',
      operator: 'Eduardo Fontes'
    },
    {
      id: 'VD-1095',
      serialNumber: 1095,
      client: 'Klabin Celulose',
      value: 18900,
      date: '2026-06-18',
      status: 'Entregue',
      deliveryDate: '2026-06-24',
      items: 'Sensor Indutivo IP67 (x40)',
      operator: 'Ana Paula'
    }
  ]);

  // 4. Purchase Orders (POs) State
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'OC-2021',
      supplier: 'Metalúrgica Alfa S.A.',
      value: 35000,
      status: 'Enviado ao Fornecedor',
      date: '2026-06-22'
    },
    {
      id: 'OC-2022',
      supplier: 'Eletrônicos China Import',
      value: 18400,
      status: 'Aguardando Aprovação',
      date: '2026-06-25'
    },
    {
      id: 'OC-2023',
      supplier: 'Usiminas Chapas',
      value: 54000,
      status: 'Recebido Parcial',
      date: '2026-06-18'
    },
    {
      id: 'OC-2024',
      supplier: 'Nippon Hidráulica',
      value: 28000,
      status: 'Concluído',
      date: '2026-06-15'
    },
    {
      id: 'OC-2025',
      supplier: 'Siemens Brasil',
      value: 15200,
      status: 'Rascunho',
      date: '2026-06-26'
    }
  ]);

  // 5. Users and Access Control list (empty by default; user can register custom collaborators)
  const [users, setUsers] = useState<UserAccess[]>([]);

  // Current active simulated user state and lookup
  const [currentUserName, setCurrentUserName] = useState<string>('Administrador');

  // Compute available users for login: active users from database, plus DEFAULT_ADMIN_USER if not present
  const availableLoginUsers = useMemo(() => {
    const activeUsers = users.filter(u => u.status !== 'Inativo');
    const hasAdminInUsers = activeUsers.some(u => u.name === DEFAULT_ADMIN_USER.name);
    if (hasAdminInUsers) {
      return activeUsers;
    }
    return [DEFAULT_ADMIN_USER, ...activeUsers];
  }, [users]);

  const effectiveUserName = availableLoginUsers.some(u => u.name === currentUserName)
    ? currentUserName
    : (availableLoginUsers[0]?.name || DEFAULT_ADMIN_USER.name);

  const currentUser = availableLoginUsers.find(u => u.name === effectiveUserName) || DEFAULT_ADMIN_USER;

  // System Authentication/User Control States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginPin, setLoginPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const menuItems = useMemo(() => [
    { label: 'Painel Geral', icon: Sliders },
    { label: 'CRM & WhatsApp', icon: MessageSquare },
    { label: 'Vendas', icon: ShoppingBag },
    { label: 'Consulta de Pedidos', icon: Search },
    { label: 'Consulta de Orçamentos', icon: FileText },
    { label: 'Cadastro de Clientes', icon: Users },
    { label: 'Cadastro de Fornecedores', icon: Building2 },
    { label: 'Cadastro de Produtos', icon: ClipboardList },
    { label: 'Controle de Estoque', icon: Package },
    { label: 'Produção', icon: Cpu },
    { label: 'Gestão de Acessos', icon: Lock },
    { label: 'Parâmetros', icon: Settings },
    { label: 'Relatórios', icon: BarChart3 },
    { label: 'Ordens de Compra', icon: Truck },
    { label: 'Financeiro', icon: DollarSign },
    { label: 'Ficha do Fornecedor', icon: Building2 },
    { label: 'Visualizador OP', icon: FileCode }
  ], []);

  // Helper function to dynamically check if the simulated user can access a tab
  const checkTabPermission = (user: UserAccess, tab: string): boolean => {
    if (!user) return true;
    // CRM & WhatsApp module is a core feature accessible to all users
    if (tab === 'CRM & WhatsApp') return true;

    // Admin has full permissions
    if (user.role === 'Diretor de Operações' || user.role === 'Administrador' || user.name === 'Eduardo Fontes') return true;
    if (users.length === 0) return true;

    // Enforce tab-level allowedTabs if configured
    if (user.allowedTabs) {
      if (user.allowedTabs.includes(tab)) return true;
      return false;
    }

    switch (tab) {
      case 'Painel Geral':
        return !!(
          user.permissions?.sales?.view ||
          user.permissions?.inventory?.view ||
          user.permissions?.production?.view ||
          user.permissions?.customers?.view
        );
      case 'CRM & WhatsApp':
        return !!(user.permissions?.customers?.view || user.permissions?.sales?.view);
      case 'Cadastro de Clientes':
        return !!user.permissions?.customers?.view;
      case 'Vendas':
      case 'Consulta de Pedidos':
      case 'Consulta de Orçamentos':
      case 'Relatórios':
        return !!user.permissions?.sales?.view;
      case 'Cadastro de Fornecedores':
      case 'Ficha do Fornecedor':
      case 'Cadastro de Produtos':
      case 'Controle de Estoque':
      case 'Ordens de Compra':
        return !!user.permissions?.inventory?.view;
      case 'Produção':
      case 'Visualizador OP':
        return !!user.permissions?.production?.view;
      case 'Gestão de Acessos':
      case 'Parâmetros':
        // Prevent privilege escalation - only administrators can manage access
        return user.role === 'Diretor de Operações' || user.name === 'Eduardo Fontes';
      default:
        return true;
    }
  };

  // Compute effective active tab ensuring user has permission to access it
  const isCurrentTabAllowed = checkTabPermission(currentUser, activeTab);
  const effectiveActiveTab = isCurrentTabAllowed
    ? activeTab
    : (menuItems.find(item => checkTabPermission(currentUser, item.label))?.label || 'Painel Geral');

  // 6. Registered Customers State
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 'CLI-001',
      name: 'Siderúrgica Gerdau S.A.',
      cnpj: '34.567.890/0001-12',
      email: 'comercial@gerdau.com.br',
      phone: '(51) 3323-2000',
      address: 'Porto Alegre - RS',
      segment: 'Cliente Final',
      status: 'Ativo',
      totalPurchased: 85200
    },
    {
      id: 'CLI-002',
      name: 'WEG Motores Elétricos',
      cnpj: '12.987.654/0001-32',
      email: 'vendas@weg.net',
      phone: '(47) 3276-4000',
      address: 'Jaraguá do Sul - SC',
      segment: 'Cliente Final',
      status: 'Ativo',
      totalPurchased: 42000
    },
    {
      id: 'CLI-003',
      name: 'Petrobras Refinaria Replan',
      cnpj: '45.123.456/0001-78',
      email: 'suprimentos@petrobras.com.br',
      phone: '(19) 3874-1000',
      address: 'Paulínia - SP',
      segment: 'Lojista',
      status: 'Ativo',
      totalPurchased: 125000
    },
    {
      id: 'CLI-004',
      name: 'Klabin Celulose',
      cnpj: '67.890.123/0001-45',
      email: 'compras@klabin.com.br',
      phone: '(11) 3049-2000',
      address: 'Ortigueira - PR',
      segment: 'Cliente Final',
      status: 'Ativo',
      totalPurchased: 18900
    }
  ]);

  // 6.1. Registered Suppliers State
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 'FORN-001',
      name: 'Metalúrgica Alfa S.A.',
      tradeName: 'Alfa Metalurgia',
      cnpj: '12.345.678/0001-90',
      email: 'comercial@metalurgicaalfa.com.br',
      phone: '(11) 3456-7890',
      contactPerson: 'Ricardo Silveira (Vendas)',
      category: 'Matéria-Prima',
      address: 'Av. das Indústrias, 1200 - Distrito Industrial',
      cityState: 'Sorocaba / SP',
      status: 'Ativo',
      reliabilityScore: 94,
      leadTime: '4.2 dias',
      rejectionRate: '0.8%',
      paymentTerms: '30/60 dias',
      certifications: ['ISO 9001', 'ISO 14001', 'AS9100D'],
      notes: 'Fornecedor chave para bobinas e chapas de aço inoxidável.',
      suppliedItemsCount: 12,
      operator: 'Administrador'
    },
    {
      id: 'FORN-002',
      name: 'Usiminas Chapas Industriais Ltda',
      tradeName: 'Usiminas Chapas',
      cnpj: '98.765.432/0001-21',
      email: 'vendas@usiminaschapas.com.br',
      phone: '(31) 3891-2000',
      contactPerson: 'Mariana Costa',
      category: 'Matéria-Prima',
      address: 'Rodovia dos Metalúrgicos, Km 45',
      cityState: 'Ipatinga / MG',
      status: 'Ativo',
      reliabilityScore: 98,
      leadTime: '3.0 dias',
      rejectionRate: '0.3%',
      paymentTerms: '28 ddl',
      certifications: ['ISO 9001', 'IATF 16949'],
      notes: 'Chapas laminadas de alta resistência mecânica.',
      suppliedItemsCount: 8,
      operator: 'Administrador'
    },
    {
      id: 'FORN-003',
      name: 'Siemens Brasil Eletrônica S.A.',
      tradeName: 'Siemens Brasil',
      cnpj: '45.123.890/0001-55',
      email: 'suporte.br@siemens.com',
      phone: '(11) 4004-0000',
      contactPerson: 'Eng. Fernando Mendes',
      category: 'Componentes Elétricos',
      address: 'Rua Siemens, 100 - Anhanguera',
      cityState: 'São Paulo / SP',
      status: 'Ativo',
      reliabilityScore: 96,
      leadTime: '2.5 dias',
      rejectionRate: '0.1%',
      paymentTerms: '30 dias',
      certifications: ['ISO 9001', 'ISO 50001', 'CE'],
      notes: 'Controladores lógicos, contatores e inversores de frequência.',
      suppliedItemsCount: 24,
      operator: 'Administrador'
    },
    {
      id: 'FORN-004',
      name: 'Pintura & Acabamentos Eletrostáticos Eireli',
      tradeName: 'Pintura & Acabamentos',
      cnpj: '23.890.112/0001-44',
      email: 'atendimento@pinturaacabamentos.com.br',
      phone: '(11) 98765-4321',
      contactPerson: 'Marcos Roberto',
      category: 'Serviços de Pintura',
      address: 'Rua dos Galvanizadores, 80 - Jd. Industrial',
      cityState: 'Guarulhos / SP',
      status: 'Em Homologação',
      reliabilityScore: 82,
      leadTime: '5.0 dias',
      rejectionRate: '1.5%',
      paymentTerms: 'A combinar',
      certifications: ['ISO 9001'],
      notes: 'Prestador de pintura em pó eletrostática terceirizada em teste de lote.',
      suppliedItemsCount: 3,
      operator: 'Carlos Eduardo'
    },
    {
      id: 'FORN-005',
      name: 'Eletrônicos China Import Ltda',
      tradeName: 'China Import Direct',
      cnpj: '67.432.109/0001-88',
      email: 'compras@chinadirect.com.br',
      phone: '(11) 2233-4455',
      contactPerson: 'Lin Chen',
      category: 'Componentes Elétricos',
      address: 'Av. Paulista, 1500 - Cj 82',
      cityState: 'São Paulo / SP',
      status: 'Inativo',
      reliabilityScore: 65,
      leadTime: '15.0 dias',
      rejectionRate: '4.2%',
      paymentTerms: 'À vista / Pix',
      certifications: [],
      notes: 'Inativado por atrasos recorrentes no desembaraço alfandegário.',
      suppliedItemsCount: 5,
      operator: 'Administrador'
    }
  ]);

  // 6.2. Manual Transactions State
  const [manualTransactions, setManualTransactions] = useState<FinancialTransaction[]>([
    {
      id: 'FTX-001',
      description: 'Pagamento de Salários da Produção',
      type: 'DESPESA',
      category: 'Salários',
      amount: 24500,
      dueDate: '2026-07-05',
      paymentDate: '2026-07-05',
      status: 'PAGO',
      clientOrSupplier: 'Operadores de Produção',
      paymentMethod: 'Pix'
    },
    {
      id: 'FTX-002',
      description: 'Conta de Energia Elétrica Industrial',
      type: 'DESPESA',
      category: 'Infraestrutura',
      amount: 4850,
      dueDate: '2026-07-10',
      paymentDate: '2026-07-09',
      status: 'PAGO',
      clientOrSupplier: 'Enel Distribuição',
      paymentMethod: 'Boleto Bancário'
    },
    {
      id: 'FTX-003',
      description: 'Venda de Sucata de Aço Inox (Lote #41)',
      type: 'RECEITA',
      category: 'Sucatas / Outros',
      amount: 6800,
      dueDate: '2026-07-15',
      status: 'PENDENTE',
      clientOrSupplier: 'Recicla Metais Ltda'
    },
    {
      id: 'FTX-004',
      description: 'Manutenção Preventiva de Corte e Dobra',
      type: 'DESPESA',
      category: 'Infraestrutura',
      amount: 3200,
      dueDate: '2026-07-01',
      paymentDate: '2026-07-01',
      status: 'PAGO',
      clientOrSupplier: 'DobraSul Máquinas',
      paymentMethod: 'Pix'
    },
    {
      id: 'FTX-005',
      description: 'Serviço Integrado de Frete Logístico',
      type: 'DESPESA',
      category: 'Logística',
      amount: 1950,
      dueDate: '2026-07-08',
      status: 'ATRASADO',
      clientOrSupplier: 'Rapidez Transportes'
    }
  ]);

  // 6.3. Commission Payouts Historical State
  const [commissionPayouts, setCommissionPayouts] = useState<CommissionPayout[]>([]);

  const handleAddCommissionPayout = (payout: Omit<CommissionPayout, 'id'>) => {
    const nextId = `COM-PAY-${String(commissionPayouts.length + 1).padStart(3, '0')}`;
    const newPayout: CommissionPayout = {
      id: nextId,
      ...payout,
    };
    setCommissionPayouts(prev => [newPayout, ...prev]);

    // Also persist sync if database connection exists
    fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableName: 'commission_payouts',
        data: newPayout
      })
    }).catch(() => {});
  };

  // Industrial segments list state
  const [industrialSegments, setIndustrialSegments] = useState<string[]>([
    "Cliente Final", "Lojista", "Metalurgia", "Siderurgia", "Automobilístico", "Celulose / Papel", "Petroquímico", "Eletroeletrônica", "Mineração", "Energia"
  ]);

  // CRM Leads State
  const [leads, setLeads] = useState<CrmLead[]>([
    {
      id: 'LEAD-001',
      name: 'Roberto Madero',
      company: 'Madero Gastronomia S.A.',
      phone: '(11) 99876-5432',
      email: 'roberto@madero.com.br',
      segment: 'Restaurante / Gastronomia',
      estimatedValue: 48500,
      stage: 'Em Negociação',
      priority: 'Alta',
      assignedTo: 'Eduardo Fontes',
      notes: 'Projeto de exaustão industrial de alta vazão para cozinha comercial.',
      createdAt: '2026-06-15',
      lastContactDate: '2026-06-25',
      history: [
        {
          id: 'INT-1',
          timestamp: '2026-06-15 10:30',
          user: 'Eduardo Fontes',
          channel: 'WhatsApp',
          type: 'Enviada',
          notes: 'Enviado orçamento prévio de coifa centro em inox 304.'
        }
      ]
    },
    {
      id: 'LEAD-002',
      name: 'Eng. Fernando Mendes',
      company: 'Galpão Logístico DHL',
      phone: '(11) 98765-4321',
      email: 'fernando.mendes@dhl.com',
      segment: 'Metalurgia',
      estimatedValue: 92000,
      stage: 'Proposta Enviada',
      priority: 'Alta',
      assignedTo: 'Eduardo Fontes',
      notes: 'Sistema de ventilação e renovação de ar para galpão industrial.',
      createdAt: '2026-06-18',
      lastContactDate: '2026-06-24',
      history: []
    },
    {
      id: 'LEAD-003',
      name: 'Carla Silveira',
      company: 'Shopping Center Norte',
      phone: '(11) 97654-3210',
      email: 'carla.silveira@centrenorte.com.br',
      segment: 'Cliente Final',
      estimatedValue: 35000,
      stage: 'Qualificação',
      priority: 'Média',
      assignedTo: 'Ana Paula',
      notes: 'Aguardando envio das plantas técnicas de exaustão.',
      createdAt: '2026-06-20',
      lastContactDate: '2026-06-22',
      history: []
    }
  ]);

  // WhatsApp Gateway Config State
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    companyNumber: '(11) 99876-5432',
    instanceName: 'estilocoifas_prod',
    apiKey: 'api_key_estilo_coifas_prod_2026',
    serverUrl: 'https://api.z-api.io/instances/estilocoifas',
    isConnected: true,
    autoSendOrderUpdates: true
  });

  // System parameters state
  const [systemParams, setSystemParams] = useState({
    companyName: 'Estilo Coifas',
    companyCnpj: '12.345.678/0001-90',
    companyEmail: 'comercial@estilocoifas.com.br',
    companyPhone: '(11) 4002-8922',
    companyAddress: 'Rua Industrial, 1000 - São Paulo, SP',
    companyLogo: '',
    defaultCurrency: 'BRL R$',
    targetProfitMargin: 35,
    defaultDeliveryLeadTime: 15,
    maxDiscountAllowed: 10,
    alertRiskDays: 3,
    enableDelayAlerts: true,
    enableLowStockAlerts: true,
    enableAutoBackup: true,
  });

  const [logoError, setLogoError] = useState(false);

  // Load from localStorage on mount to prevent Next.js hydration mismatches
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSegments = localStorage.getItem('industrial_segments');
      const savedParams = localStorage.getItem('system_parameters');
      const savedSuppliers = localStorage.getItem('erpf_suppliers');
      const savedWaConfig = localStorage.getItem('erpf_whatsapp_config');

      // Defer state updates to avoid synchronous cascading renders during hydration
      setTimeout(() => {
        if (savedWaConfig) {
          try {
            setWhatsappConfig(JSON.parse(savedWaConfig));
          } catch (e) {}
        }
        if (savedSegments) {
          try {
            const parsed = JSON.parse(savedSegments);
            if (Array.isArray(parsed)) {
              const required = ["Cliente Final", "Lojista"];
              const missing = required.filter(r => !parsed.some(p => p.toLowerCase() === r.toLowerCase()));
              if (missing.length > 0) {
                const merged = [...required, ...parsed.filter(p => !required.some(r => r.toLowerCase() === p.toLowerCase()))];
                setIndustrialSegments(merged);
                safeSetItem('industrial_segments', JSON.stringify(merged));
              } else {
                setIndustrialSegments(parsed);
              }
            }
          } catch (e) {
            // ignore
          }
        }
        
        if (savedParams) {
          try {
            setSystemParams(JSON.parse(savedParams));
          } catch (e) {
            // ignore
          }
        }

        if (savedSuppliers) {
          try {
            setSuppliers(JSON.parse(savedSuppliers));
          } catch (e) {
            // ignore
          }
        }
      }, 0);
    }
  }, []);

  const handleUpdateSystemParams = (params: any) => {
    setSystemParams(params);
    setLogoError(false);
    if (typeof window !== 'undefined') {
      safeSetItem('system_parameters', JSON.stringify(params));
    }
  };

  const handleUpdateSegments = (
    newSegments: string[],
    renameMapping?: { old: string; new: string },
    deletedSegment?: string
  ) => {
    setIndustrialSegments(newSegments);
    if (typeof window !== 'undefined') {
      safeSetItem('industrial_segments', JSON.stringify(newSegments));
    }
    
    // Auto-update customers if their segment was renamed or deleted
    if (renameMapping) {
      setCustomers(prev =>
        prev.map(c => (c.segment === renameMapping.old ? { ...c, segment: renameMapping.new } : c))
      );
    } else if (deletedSegment) {
      setCustomers(prev =>
        prev.map(c =>
          c.segment === deletedSegment
            ? { ...c, segment: newSegments[0] || 'Metalurgia' }
            : c
        )
      );
    }
  };

  // Active OP focused by technical CAD viewer
  const [selectedOPForViewer, setSelectedOPForViewer] = useState<ProductionOrder | null>(null);

  // Modals state controllers
  const [isNewOPModalOpen, setIsNewOPModalOpen] = useState<boolean>(false);
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState<boolean>(false);

  // Supabase Integration States
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [migrationRequired, setMigrationRequired] = useState<boolean>(false);
  const [migrationSql, setMigrationSql] = useState<string>('');
  const [sqlCopied, setSqlCopied] = useState<boolean>(false);

  const hasLoadedInitialData = React.useRef<boolean>(false);
  const lastSyncedState = React.useRef<{
    inventory: InventoryItem[];
    productionOrders: ProductionOrder[];
    salesOrders: SalesOrder[];
    customers: Customer[];
    collaborators: UserAccess[];
    purchaseOrders: PurchaseOrder[];
    financialTransactions: FinancialTransaction[];
  }>({
    inventory: [],
    productionOrders: [],
    salesOrders: [],
    customers: [],
    collaborators: [],
    purchaseOrders: [],
    financialTransactions: []
  });

  const stateRef = React.useRef({
    inventory,
    productionOrders,
    salesOrders,
    customers,
    users,
    purchaseOrders,
    manualTransactions,
    systemParams,
    industrialSegments,
  });

  React.useEffect(() => {
    stateRef.current = {
      inventory,
      productionOrders,
      salesOrders,
      customers,
      users,
      purchaseOrders,
      manualTransactions,
      systemParams,
      industrialSegments,
    };
  }, [inventory, productionOrders, salesOrders, customers, users, purchaseOrders, manualTransactions, systemParams, industrialSegments]);

  // Load data from Supabase or localStorage on mount
  React.useEffect(() => {
    async function loadSupabaseData() {
      if (typeof window === 'undefined') return;
      const loadLocalStorageFallback = () => {
        const localInventory = localStorage.getItem('erpf_inventory');
        const localProduction = localStorage.getItem('erpf_production_orders');
        const localSales = localStorage.getItem('erpf_sales_orders');
        const localCustomers = localStorage.getItem('erpf_customers');
        const localUsers = localStorage.getItem('erpf_users');
        const localPurchaseOrders = localStorage.getItem('erpf_purchase_orders');
        const localManualTransactions = localStorage.getItem('erpf_manual_transactions');
        
        if (localInventory) {
          try {
            const parsed = JSON.parse(localInventory);
            if (Array.isArray(parsed)) {
              setInventory(parsed.map((item: any) => ({
                ...item,
                name: String(item?.name || 'Item Sem Nome'),
                sku: String(item?.sku || 'SKU-TEMP'),
                category: String(item?.category || 'Geral'),
                stock: Number(item?.stock || 0)
              })));
            }
          } catch (e) {}
        }
        if (localProduction) {
          try {
            const parsed = JSON.parse(localProduction);
            if (Array.isArray(parsed)) {
              setProductionOrders(parsed.map((op: any) => ({
                ...op,
                id: String(op?.id || `OP-${Date.now()}`),
                product: String(op?.product || 'Produto N/A'),
                supervisor: String(op?.supervisor || 'Não Definido')
              })));
            }
          } catch (e) {}
        }
        if (localSales) {
          try {
            const parsed = JSON.parse(localSales);
            if (Array.isArray(parsed)) {
              setSalesOrders(parsed.map((so: any) => ({
                ...so,
                id: String(so?.id || `VD-${Date.now()}`),
                client: String(so?.client || 'Cliente Não Informado'),
                items: String(so?.items || ''),
                status: so?.status || 'Orçamento'
              })));
            }
          } catch (e) {}
        }
        if (localCustomers) {
          try {
            const parsed = JSON.parse(localCustomers);
            if (Array.isArray(parsed)) {
              setCustomers(parsed.map((c: any) => ({
                ...c,
                name: String(c?.name || 'Cliente Sem Nome'),
                cnpj: String(c?.cnpj || ''),
                email: String(c?.email || ''),
                address: String(c?.address || '')
              })));
            }
          } catch (e) {}
        }
        if (localUsers) {
          try {
            const defaultNamesToFilter = ['Eduardo Fontes', 'Ana Paula', 'Carlos Eduardo', 'Fernanda Souza', 'Marcos Silva'];
            const parsed = JSON.parse(localUsers);
            if (Array.isArray(parsed)) {
              setUsers(parsed.filter((u: any) => u && u.name && !defaultNamesToFilter.includes(u.name)));
            }
          } catch (e) {}
        }
        if (localPurchaseOrders) {
          try {
            const parsed = JSON.parse(localPurchaseOrders);
            if (Array.isArray(parsed)) {
              setPurchaseOrders(parsed);
            }
          } catch (e) {}
        }
        if (localManualTransactions) {
          try {
            const parsed = JSON.parse(localManualTransactions);
            if (Array.isArray(parsed)) {
              setManualTransactions(parsed.map((tx: any) => ({
                ...tx,
                id: String(tx?.id || `FTX-${Date.now()}`),
                description: String(tx?.description || 'Lançamento'),
                amount: Number(tx?.amount || 0)
              })));
            }
          } catch (e) {}
        }
      };

      try {
        const res = await fetch(`/api/db/sync?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        const result = await parseResponseJson(res);
        
        if (result.success && result.isConfigured) {
          setSupabaseConfigured(true);
          setSupabaseConnected(true);
          setMigrationRequired(false);
          const data = result.data;
          let loadedSalesOrders: any[] = [];
          
          if (data.inventory && data.inventory.length > 0) {
            setInventory(data.inventory.map((item: any) => ({
              sku: item.sku,
              name: item.name,
              category: item.category,
              stock: item.qty,
              minQty: item.minQty,
              unit: item.unit,
              location: item.location,
              price: item.price,
              purchasePrice: item.purchasePrice ?? item.price * 0.45,
              salesPrice: item.salesPrice ?? item.price,
              status: item.status,
              image: item.imageUrl || undefined,
              stages: Array.isArray(item.stages) ? item.stages : ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS'],
              active: item.active !== undefined ? Boolean(item.active) : true,
              operator: item.operator || undefined
            })));
          } else {
            const local = localStorage.getItem('erpf_inventory');
            if (local) {
              try { setInventory(JSON.parse(local)); } catch (e) {}
            }
          }

          if (data.productionOrders && data.productionOrders.length > 0) {
            setProductionOrders(data.productionOrders);
          } else {
            const local = localStorage.getItem('erpf_production_orders');
            if (local) {
              try { setProductionOrders(JSON.parse(local)); } catch (e) {}
            }
          }

          if (data.salesOrders && data.salesOrders.length > 0) {
            const seenIds = new Set<string>();
            const uniqueSalesOrders: any[] = [];
            data.salesOrders.forEach((so: any) => {
              if (!so.id || seenIds.has(so.id)) return;
              seenIds.add(so.id);
              let serial = so.serialNumber;
              if (!serial && so.id && so.id.startsWith('VD-')) {
                const parsed = parseInt(so.id.replace('VD-', ''), 10);
                if (!isNaN(parsed)) {
                  serial = parsed;
                }
              }
              uniqueSalesOrders.push({
                id: so.id,
                serialNumber: serial || undefined,
                client: so.client,
                clientDocument: so.clientDocument || undefined,
                date: so.date,
                deliveryDate: so.deliveryDate || undefined,
                items: so.items,
                value: so.total,
                total: so.total,
                status: so.status,
                paymentMethod: so.paymentMethod,
                paymentStatus: so.paymentStatus,
                operator: so.operator,
                lastOperator: so.lastOperator || undefined,
                notes: so.notes || undefined,
                products: so.products || undefined,
                projectFiles: so.projectFiles || so.project_files || undefined,
                projectImages: so.projectImages || so.project_images || undefined,
                boletoPaid: so.boletoPaid ?? so.boleto_paid ?? false,
                boletoDueDate: so.boletoDueDate || so.boleto_due_date || undefined,
                paidAmount: so.paidAmount ?? so.paid_amount ?? undefined,
                boletoInstallments: so.boletoInstallments || so.boleto_installments || undefined,
                clientSegment: so.clientSegment || so.client_segment || undefined,
                commissionPercentage: so.commissionPercentage !== undefined && so.commissionPercentage !== null ? Number(so.commissionPercentage) : (so.commission_percentage !== undefined && so.commission_percentage !== null ? Number(so.commission_percentage) : undefined),
                commissionValue: so.commissionValue !== undefined && so.commissionValue !== null ? Number(so.commissionValue) : (so.commission_value !== undefined && so.commission_value !== null ? Number(so.commission_value) : undefined),
                commissionPaid: so.commissionPaid ?? so.commission_paid ?? false,
                commissionPayoutId: so.commissionPayoutId || so.commission_payout_id || undefined,
              });
            });
            setSalesOrders(uniqueSalesOrders);
            loadedSalesOrders = uniqueSalesOrders;
          } else {
            const local = localStorage.getItem('erpf_sales_orders');
            if (local) {
              try {
                const parsed = JSON.parse(local);
                setSalesOrders(parsed);
                loadedSalesOrders = parsed;
              } catch (e) {}
            }
          }

          if (data.customers && data.customers.length > 0) {
            setCustomers(data.customers.map((c: any) => ({
              id: c.id,
              name: c.name,
              cnpj: c.document || c.cnpj || '',
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              segment: c.segment || 'Industrial',
              status: c.status || 'Ativo',
              totalPurchased: 0,
              nickname: c.nickname || '',
              creditBalance: Number(c.creditBalance ?? c.credit_balance ?? 0),
              creditHistory: Array.isArray(c.creditHistory || c.credit_history) ? (c.creditHistory || c.credit_history) : []
            })));
          } else {
            const local = localStorage.getItem('erpf_customers');
            if (local) {
              try { setCustomers(JSON.parse(local)); } catch (e) {}
            }
          }

          let loadedUsers: UserAccess[] = [];
          if (data.collaborators && data.collaborators.length > 0) {
            try {
              const defaultNamesToFilter = ['Eduardo Fontes', 'Ana Paula', 'Carlos Eduardo', 'Fernanda Souza', 'Marcos Silva'];
              const filteredCollabs = data.collaborators.filter((u: any) => !defaultNamesToFilter.includes(u.name));
              loadedUsers = filteredCollabs.map((u: any) => {
                let parsedPermissions = {
                  sales: { view: true, edit: false, del: false },
                  inventory: { view: true, edit: false, del: false },
                  production: { view: true, edit: false, del: false },
                  customers: { view: true, edit: false, del: false },
                  settings: { view: false, edit: false, del: false }
                };
                try {
                  if (u.permissions) {
                    parsedPermissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions;
                  }
                } catch (e) {
                  console.error("Error parsing permissions for user:", u.name, e);
                }

                let parsedTabs: string[] = [];
                try {
                  if (u.allowedTabs || u.allowed_tabs) {
                    const tabs = u.allowedTabs || u.allowed_tabs;
                    parsedTabs = typeof tabs === 'string' ? JSON.parse(tabs) : tabs;
                  }
                } catch (e) {
                  console.error("Error parsing allowedTabs for user:", u.name, e);
                }

                return {
                  name: u.name,
                  role: u.role || '',
                  status: u.status || 'Ativo',
                  lastLogin: u.lastLogin || u.last_login || '',
                  email: u.email || '',
                  restrictToWorkHours: u.restrictToWorkHours ?? u.restrict_to_work_hours ?? false,
                  accessWindowStart: u.accessWindowStart || u.access_window_start || '08:00',
                  accessWindowEnd: u.accessWindowEnd || u.access_window_end || '18:00',
                  pin: u.name === 'Administrador' ? (u.pin && u.pin !== '1234' ? u.pin : '3040') : (u.pin || '1234'),
                  permissions: parsedPermissions,
                  allowedTabs: Array.isArray(parsedTabs) ? parsedTabs : [],
                  hideOrderValues: u.hideOrderValues ?? u.hide_order_values ?? false,
                  commissionEligible: Boolean(u.commissionEligible ?? u.commission_eligible ?? false),
                  commissionPercentage: Number(u.commissionPercentage ?? u.commission_percentage ?? 0),
                };
              });
              setUsers(loadedUsers);
            } catch (err) {
              console.error("Error mapping collaborators from server:", err);
            }
          } else {
            const local = localStorage.getItem('erpf_users');
            if (local) {
              try {
                const defaultNamesToFilter = ['Eduardo Fontes', 'Ana Paula', 'Carlos Eduardo', 'Fernanda Souza', 'Marcos Silva'];
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed)) {
                  loadedUsers = parsed.filter((u: any) => !defaultNamesToFilter.includes(u.name));
                  setUsers(loadedUsers);
                }
              } catch (e) {}
            }
          }

          if (data.purchaseOrders && data.purchaseOrders.length > 0) {
            setPurchaseOrders(data.purchaseOrders);
          } else {
            const local = localStorage.getItem('erpf_purchase_orders');
            if (local) {
              try { setPurchaseOrders(JSON.parse(local)); } catch (e) {}
            }
          }

          if (data.financialTransactions && data.financialTransactions.length > 0) {
            setManualTransactions(data.financialTransactions);
          } else {
            const local = localStorage.getItem('erpf_manual_transactions');
            if (local) {
              try { setManualTransactions(JSON.parse(local)); } catch (e) {}
            }
          }

          if (data.systemParameters && data.systemParameters.length > 0) {
            const p = data.systemParameters[0];
            setSystemParams({
              companyName: p.companyName || p.company_name || 'Estilo Coifas',
              companyCnpj: p.companyCnpj || p.company_cnpj || '12.345.678/0001-90',
              companyEmail: p.companyEmail || p.company_email || 'comercial@estilocoifas.com.br',
              companyPhone: p.companyPhone || p.company_phone || '(11) 4002-8922',
              companyAddress: p.companyAddress || p.company_address || 'Rua Industrial, 1000 - São Paulo, SP',
              companyLogo: p.companyLogo || p.company_logo || '',
              defaultCurrency: p.defaultCurrency || p.default_currency || 'BRL',
              targetProfitMargin: Number(p.targetProfitMargin ?? p.target_profit_margin ?? 20),
              defaultDeliveryLeadTime: Number(p.defaultDeliveryLeadTime ?? p.default_delivery_lead_time ?? 15),
              maxDiscountAllowed: Number(p.maxDiscountAllowed ?? p.max_discount_allowed ?? 10),
              alertRiskDays: Number(p.alertRiskDays ?? p.alert_risk_days ?? 3),
              enableDelayAlerts: Boolean(p.enableDelayAlerts ?? p.enable_delay_alerts ?? true),
              enableLowStockAlerts: Boolean(p.enableLowStockAlerts ?? p.enable_low_stock_alerts ?? true),
              enableAutoBackup: Boolean(p.enableAutoBackup ?? p.enable_auto_backup ?? false)
            });
            if (Array.isArray(p.industrialSegments || p.industrial_segments)) {
              setIndustrialSegments(p.industrialSegments || p.industrial_segments);
            }
          }

          // Update lastSyncedState with initial values loaded from server
          lastSyncedState.current = {
            inventory: data.inventory ? data.inventory.map((item: any) => ({
              sku: item.sku,
              name: item.name,
              category: item.category,
              stock: item.qty,
              minQty: item.minQty,
              unit: item.unit,
              location: item.location,
              price: item.price,
              purchasePrice: item.purchasePrice ?? item.price * 0.45,
              salesPrice: item.salesPrice ?? item.price,
              status: item.status,
              image: item.imageUrl || undefined,
              stages: Array.isArray(item.stages) ? item.stages : ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS'],
              active: item.active !== undefined ? Boolean(item.active) : true,
              operator: item.operator || undefined
            })) : [],
            productionOrders: data.productionOrders || [],
            salesOrders: loadedSalesOrders || [],
            customers: data.customers ? data.customers.map((c: any) => ({
              id: c.id,
              name: c.name,
              cnpj: c.document || c.cnpj || '',
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              segment: c.segment || 'Industrial',
              status: c.status || 'Ativo',
              totalPurchased: 0,
              nickname: c.nickname || '',
              creditBalance: Number(c.creditBalance ?? c.credit_balance ?? 0),
              creditHistory: Array.isArray(c.creditHistory || c.credit_history) ? (c.creditHistory || c.credit_history) : []
            })) : [],
            collaborators: loadedUsers || [],
            purchaseOrders: data.purchaseOrders || [],
            financialTransactions: data.financialTransactions || []
          };
        } else {
          setSupabaseConfigured(result.isConfigured);
          setSupabaseConnected(false);
          
          loadLocalStorageFallback();

          if (result.migrationRequired) {
            setMigrationRequired(true);
            setMigrationSql(result.sql || '');
          }
          if (result.error && result.isConfigured) {
            setSyncMessage({
              type: 'error',
              text: `Aviso do Banco de Dados: ${result.error}`
            });
          }
        }
      } catch (err: any) {
        console.warn('Aviso ao carregar dados do Supabase (utilizando dados locais do navegador):', err?.message || err);
        setSupabaseConfigured(false);
        setSupabaseConnected(false);
        
        loadLocalStorageFallback();
      } finally {
        hasLoadedInitialData.current = true;
      }
    }
    loadSupabaseData();
  }, []);

  // Salva no localStorage como fallback toda vez que os dados mudam localmente
  React.useEffect(() => {
    if (hasLoadedInitialData.current && typeof window !== 'undefined') {
      safeSetItem('erpf_inventory', JSON.stringify(inventory));
      safeSetItem('erpf_production_orders', JSON.stringify(productionOrders));
      safeSetItem('erpf_sales_orders', JSON.stringify(salesOrders));
      safeSetItem('erpf_customers', JSON.stringify(customers));
      safeSetItem('erpf_users', JSON.stringify(users));
      safeSetItem('erpf_purchase_orders', JSON.stringify(purchaseOrders));
      safeSetItem('erpf_manual_transactions', JSON.stringify(manualTransactions));
    }
  }, [inventory, productionOrders, salesOrders, customers, users, purchaseOrders, manualTransactions]);

  // Sincronização Automática em Segundo Plano quando os dados mudam
  React.useEffect(() => {
    // Evita sincronização automática antes de carregar dados iniciais, se Supabase não está configurado, se está desconectado, ou se há migrações pendentes
    if (!hasLoadedInitialData.current || supabaseConfigured !== true || !supabaseConnected || migrationRequired) {
      return;
    }

    const timer = setTimeout(() => {
      const autoSync = async () => {
        // Only trigger network request if there are actual unsaved/dirty local modifications compared to the last synced state
        const invEqual = areListsEqual(inventory, lastSyncedState.current.inventory, 'sku');
        const prodEqual = areListsEqual(productionOrders, lastSyncedState.current.productionOrders, 'id');
        const salesEqual = areListsEqual(salesOrders, lastSyncedState.current.salesOrders, 'id');
        const custEqual = areListsEqual(customers, lastSyncedState.current.customers, 'id');
        const collabEqual = areListsEqual(users, lastSyncedState.current.collaborators, 'name');
        const poEqual = areListsEqual(purchaseOrders, lastSyncedState.current.purchaseOrders, 'id');
        const ftxEqual = areListsEqual(manualTransactions, lastSyncedState.current.financialTransactions, 'id');
        
        if (invEqual && prodEqual && salesEqual && custEqual && collabEqual && poEqual && ftxEqual) {
          // No changes since the last sync. Skip the server request to preserve network and pooler efficiency.
          return;
        }

        setIsSyncing(true);
        try {
          const res = await fetch('/api/db/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inventory,
              productionOrders,
              salesOrders,
              customers,
              collaborators: users,
              purchaseOrders,
              financialTransactions: manualTransactions,
              systemParameters: {
                ...systemParams,
                industrialSegments
              }
            })
          });
          const result = await parseResponseJson(res);
          if (result.success) {
            setSupabaseConfigured(true);
            setSupabaseConnected(true);
            setMigrationRequired(false);
            setSyncMessage(null); // Limpa avisos se a sincronização automática for bem-sucedida
            
            // Update lastSyncedState tracking to avoid redundant requests and facilitate merges
            lastSyncedState.current = {
              inventory: [...inventory],
              productionOrders: [...productionOrders],
              salesOrders: [...salesOrders],
              customers: [...customers],
              collaborators: [...users],
              purchaseOrders: [...purchaseOrders],
              financialTransactions: [...manualTransactions]
            };
          } else {
            setSupabaseConnected(false); // Pausa auto-sync ao falhar
            if (result.migrationRequired) {
              setMigrationRequired(true);
              setMigrationSql(result.sql || '');
              setSyncMessage({
                type: 'error',
                text: 'Tabelas ausentes no Supabase. Clique em "Sincronizar Supabase" para criar a estrutura do banco de dados.'
              });
            } else {
              setSyncMessage({
                type: 'error',
                text: `Sincronização Automática Falhou: ${result.error || 'Erro inesperado.'}`
              });
            }
          }
        } catch (err: any) {
          const errMsg = err?.message || '';
          const isNetworkError = errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed') || errMsg.includes('NetworkError') || err?.name === 'TypeError';
          if (isNetworkError) {
            console.warn('Auto-sync network warning (will retry automatically on changes):', err);
            setSyncMessage({
              type: 'info',
              text: 'Sincronização temporariamente em segundo plano offline (reconectando...). Seus dados continuam salvos de forma segura no navegador.'
            });
          } else {
            console.error('Erro na sincronização automática em segundo plano:', err);
            setSupabaseConnected(false); // Pausa auto-sync se houver erro real de banco de dados
            setSyncMessage({
              type: 'error',
              text: `Erro de rede ao auto-sincronizar: ${err?.message || 'Verifique sua conexão.'}`
            });
          }
        } finally {
          setIsSyncing(false);
        }
      };

      autoSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [inventory, productionOrders, salesOrders, customers, users, purchaseOrders, manualTransactions, systemParams, industrialSegments, supabaseConfigured, supabaseConnected, migrationRequired]);

  // Periodic polling to fetch new products/updates for other logged in users
  React.useEffect(() => {
    if (supabaseConfigured !== true || !supabaseConnected || migrationRequired) return;

    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      try {
        const res = await fetch(`/api/db/sync?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        // Silently skip if server is temporarily restarting or gateway is waiting (502/503/504)
        if (res.status >= 500 || res.status === 404 || !res.ok) {
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return;
        }

        const result = await res.json();
        if (result.success && result.data) {
          const data = result.data;
          const current = stateRef.current;

          // 1. Sync/Merge Inventory
          if (data.inventory && data.inventory.length > 0) {
            const mapped = data.inventory.map((item: any) => ({
              sku: item.sku,
              name: item.name,
              category: item.category,
              stock: item.qty,
              minQty: item.minQty,
              unit: item.unit,
              location: item.location,
              price: item.price,
              purchasePrice: item.purchasePrice ?? item.price * 0.45,
              salesPrice: item.salesPrice ?? item.price,
              status: item.status,
              image: item.imageUrl || undefined,
              stages: Array.isArray(item.stages) ? item.stages : ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS'],
              active: item.active !== undefined ? Boolean(item.active) : true,
              operator: item.operator || undefined
            }));

            const { merged, changed } = mergeStates(
              current.inventory,
              mapped,
              lastSyncedState.current.inventory,
              'sku'
            );
            if (changed) {
              setInventory(merged);
              lastSyncedState.current.inventory = merged;
            }
          }

          // 2. Sync/Merge Production Orders
          if (data.productionOrders && data.productionOrders.length > 0) {
            const { merged, changed } = mergeStates(
              current.productionOrders,
              data.productionOrders,
              lastSyncedState.current.productionOrders,
              'id'
            );
            if (changed) {
              setProductionOrders(merged);
              lastSyncedState.current.productionOrders = merged;
            }
          }

          // 3. Sync/Merge Sales Orders
          if (data.salesOrders && data.salesOrders.length > 0) {
            const seenIds = new Set<string>();
            const uniqueSalesOrders: any[] = [];
            data.salesOrders.forEach((so: any) => {
              if (!so.id || seenIds.has(so.id)) return;
              seenIds.add(so.id);
              let serial = so.serialNumber;
              if (!serial && so.id && so.id.startsWith('VD-')) {
                const parsed = parseInt(so.id.replace('VD-', ''), 10);
                if (!isNaN(parsed)) {
                  serial = parsed;
                }
              }
              uniqueSalesOrders.push({
                id: so.id,
                serialNumber: serial || undefined,
                client: so.client,
                clientDocument: so.clientDocument || undefined,
                date: so.date,
                deliveryDate: so.deliveryDate || undefined,
                items: so.items,
                value: so.total,
                total: so.total,
                status: so.status,
                paymentMethod: so.paymentMethod,
                paymentStatus: so.paymentStatus,
                operator: so.operator,
                lastOperator: so.lastOperator || undefined,
                notes: so.notes || undefined,
                products: so.products || undefined,
                projectFiles: so.projectFiles || so.project_files || undefined,
                projectImages: so.projectImages || so.project_images || undefined,
                boletoPaid: so.boletoPaid ?? so.boleto_paid ?? false,
                boletoDueDate: so.boletoDueDate || so.boleto_due_date || undefined,
                paidAmount: so.paidAmount ?? so.paid_amount ?? undefined,
                boletoInstallments: so.boletoInstallments || so.boleto_installments || undefined,
                clientSegment: so.clientSegment || so.client_segment || undefined,
                commissionPercentage: so.commissionPercentage !== undefined && so.commissionPercentage !== null ? Number(so.commissionPercentage) : (so.commission_percentage !== undefined && so.commission_percentage !== null ? Number(so.commission_percentage) : undefined),
                commissionValue: so.commissionValue !== undefined && so.commissionValue !== null ? Number(so.commissionValue) : (so.commission_value !== undefined && so.commission_value !== null ? Number(so.commission_value) : undefined),
                commissionPaid: so.commissionPaid ?? so.commission_paid ?? false,
                commissionPayoutId: so.commissionPayoutId || so.commission_payout_id || undefined,
              });
            });

            const { merged, changed } = mergeStates(
              current.salesOrders,
              uniqueSalesOrders,
              lastSyncedState.current.salesOrders,
              'id'
            );
            if (changed) {
              setSalesOrders(merged);
              lastSyncedState.current.salesOrders = merged;
            }
          }

          // 4. Sync/Merge Customers
          if (data.customers && data.customers.length > 0) {
            const mappedCustomers = data.customers.map((c: any) => ({
              id: c.id,
              name: c.name,
              cnpj: c.document || c.cnpj || '',
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              segment: c.segment || 'Industrial',
              status: c.status || 'Ativo',
              totalPurchased: 0,
              nickname: c.nickname || '',
              creditBalance: Number(c.creditBalance ?? c.credit_balance ?? 0),
              creditHistory: Array.isArray(c.creditHistory || c.credit_history) ? (c.creditHistory || c.credit_history) : []
            }));

            const { merged, changed } = mergeStates(
              current.customers,
              mappedCustomers,
              lastSyncedState.current.customers,
              'id'
            );
            if (changed) {
              setCustomers(merged);
              lastSyncedState.current.customers = merged;
            }
          }

          // 5. Sync/Merge Collaborators
          if (data.collaborators && data.collaborators.length > 0) {
            const defaultNamesToFilter = ['Eduardo Fontes', 'Ana Paula', 'Carlos Eduardo', 'Fernanda Souza', 'Marcos Silva'];
            const filteredCollabs = data.collaborators.filter((u: any) => !defaultNamesToFilter.includes(u.name));
            const mappedUsers = filteredCollabs.map((u: any) => {
              let parsedPermissions = {
                sales: { view: true, edit: false, del: false },
                inventory: { view: true, edit: false, del: false },
                production: { view: true, edit: false, del: false },
                customers: { view: true, edit: false, del: false },
                settings: { view: false, edit: false, del: false }
              };
              try { if (u.permissions) parsedPermissions = typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions; } catch (e) {}
              let parsedTabs: string[] = [];
              try { if (u.allowedTabs || u.allowed_tabs) { const tabs = u.allowedTabs || u.allowed_tabs; parsedTabs = typeof tabs === 'string' ? JSON.parse(tabs) : tabs; } } catch (e) {}
              return {
                name: u.name,
                role: u.role || '',
                status: u.status || 'Ativo',
                lastLogin: u.lastLogin || u.last_login || '',
                email: u.email || '',
                restrictToWorkHours: u.restrictToWorkHours ?? u.restrict_to_work_hours ?? false,
                accessWindowStart: u.accessWindowStart || u.access_window_start || '08:00',
                accessWindowEnd: u.accessWindowEnd || u.access_window_end || '18:00',
                pin: u.name === 'Administrador' ? (u.pin && u.pin !== '1234' ? u.pin : '3040') : (u.pin ?? '1234'),
                permissions: parsedPermissions,
                allowedTabs: Array.isArray(parsedTabs) ? parsedTabs : [],
                hideOrderValues: u.hideOrderValues ?? u.hide_order_values ?? false,
                commissionEligible: Boolean(u.commissionEligible ?? u.commission_eligible ?? false),
                commissionPercentage: Number(u.commissionPercentage ?? u.commission_percentage ?? 0),
              };
            });

            const { merged, changed } = mergeStates(
              current.users,
              mappedUsers,
              lastSyncedState.current.collaborators,
              'name'
            );
            if (changed) {
              setUsers(merged);
              lastSyncedState.current.collaborators = merged;
            }
          }

          // 6. Sync/Merge Purchase Orders
          if (data.purchaseOrders && data.purchaseOrders.length > 0) {
            const { merged, changed } = mergeStates(
              current.purchaseOrders,
              data.purchaseOrders,
              lastSyncedState.current.purchaseOrders,
              'id'
            );
            if (changed) {
              setPurchaseOrders(merged);
              lastSyncedState.current.purchaseOrders = merged;
            }
          }

          // 7. Sync/Merge Financial Transactions (Manual)
          if (data.financialTransactions && data.financialTransactions.length > 0) {
            const { merged, changed } = mergeStates(
              current.manualTransactions,
              data.financialTransactions,
              lastSyncedState.current.financialTransactions,
              'id'
            );
            if (changed) {
              setManualTransactions(merged);
              lastSyncedState.current.financialTransactions = merged;
            }
          }
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        const isNetworkError = errMsg.includes('Failed to fetch') || errMsg.includes('fetch failed') || errMsg.includes('NetworkError') || err?.name === 'TypeError';
        if (isNetworkError) {
          console.warn('Sincronização temporariamente indisponível (servidor reconectando...).');
        } else {
          console.warn('Polling sync status warning:', err?.message || err);
        }
      }
    }, 8000); // Poll every 8 seconds for efficiency and low CPU overhead

    return () => clearInterval(interval);
  }, [supabaseConfigured, supabaseConnected, migrationRequired]);

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory,
          productionOrders,
          salesOrders,
          customers,
          collaborators: users,
          purchaseOrders,
          financialTransactions: manualTransactions,
          systemParameters: {
            ...systemParams,
            industrialSegments
          }
        })
      });
      const result = await parseResponseJson(res);
      if (result.success) {
        setSupabaseConfigured(true);
        setSupabaseConnected(true);
        setMigrationRequired(false);
        setSyncMessage({ type: 'success', text: 'Dados persistidos com sucesso no Supabase!' });
        setTimeout(() => setSyncMessage(null), 6000);

        // Update lastSyncedState tracking to keep in sync
        lastSyncedState.current = {
          inventory: [...inventory],
          productionOrders: [...productionOrders],
          salesOrders: [...salesOrders],
          customers: [...customers],
          collaborators: [...users],
          purchaseOrders: [...purchaseOrders],
          financialTransactions: [...manualTransactions]
        };
      } else {
        setSupabaseConnected(false);
        if (result.migrationRequired) {
          setMigrationRequired(true);
          setMigrationSql(result.sql || '');
          setSyncMessage({ 
            type: 'error', 
            text: 'Tabelas não encontradas no Supabase. Clique em "Sincronização Supabase" no rodapé para ver as instruções de criação!' 
          });
          setIsSupabaseModalOpen(true);
        } else {
          setSyncMessage({ type: 'error', text: result.error || 'Erro ao sincronizar dados.' });
        }
      }
    } catch (err: any) {
      setSupabaseConnected(false);
      setSyncMessage({ type: 'error', text: err?.message || 'Erro de rede ao conectar com o servidor.' });
    } finally {
      setIsSyncing(false);
    }
  };


  // Global State Mutators

  // Inventory Update
  const handleUpdateStock = (sku: string, newQuantity: number) => {
    setInventory(prev => prev.map(item => {
      if (item.sku === sku) {
        return { ...item, stock: newQuantity, operator: currentUser.name };
      }
      return item;
    }));
  };

  // Generate OPs dynamically for a sales order if not present
  const handleGenerateOPsFromOrder = (order: SalesOrder) => {
    if (order.status === 'Orçamento' || order.status === 'Entregue' || order.status === 'Cancelado') {
      return;
    }
    setProductionOrders(prev => {
      // Avoid duplicate OPs for the same order
      const alreadyExists = prev.some(op => op.salesOrderId === order.id);
      if (alreadyExists) return prev;

      const newOPs: ProductionOrder[] = [];
      let generatedCount = 0;
      if (order.products && order.products.length > 0) {
        order.products.forEach((prod) => {
          // Try to find the product in the inventory to get its configured stages
          const invItem = inventory.find(item => item.sku === prod.sku || item.name === prod.name);
          
          // Skip OP generation if the item is marked as an INSUMO
          if (invItem && invItem.stages && invItem.stages.includes('INSUMO')) {
            return;
          }

          const opId = getNextOPId(prev, generatedCount);
          generatedCount++;
          let initialStatus: ProductionOrder['status'] = 'CAD';
          if (invItem && invItem.stages && invItem.stages.length > 0) {
            initialStatus = invItem.stages[0] as ProductionOrder['status'];
          }

          newOPs.push({
            id: opId,
            product: prod.name,
            qty: prod.qty,
            line: 'Linha A',
            priority: 'Média',
            status: initialStatus,
            supervisor: 'Carlos Eduardo',
            progress: 0,
            date: order.date || new Date().toISOString().split('T')[0],
            files: [`Desenho_${prod.sku || 'CUSTOM'}.dwg`],
            operator: currentUser.name,
            salesOrderId: order.id,
            salesOrderClient: order.client,
            note: prod.note
          });
        });
      } else {
        const prodName = order.items || 'Componente Coifa Customizada';
        
        // Try to find the product in the inventory
        const invItem = inventory.find(item => item.name === prodName);
        if (invItem && invItem.stages && invItem.stages.includes('INSUMO')) {
          return prev; // Skip generation entirely!
        }

        const opId = getNextOPId(prev);
        let initialStatus: ProductionOrder['status'] = 'CAD';
        if (invItem && invItem.stages && invItem.stages.length > 0) {
          initialStatus = invItem.stages[0] as ProductionOrder['status'];
        }

        newOPs.push({
          id: opId,
          product: prodName,
          qty: 1,
          line: 'Linha A',
          priority: 'Média',
          status: initialStatus,
          supervisor: 'Carlos Eduardo',
          progress: 0,
          date: order.date || new Date().toISOString().split('T')[0],
          files: [],
          operator: currentUser.name,
          salesOrderId: order.id,
          salesOrderClient: order.client
        });
      }
      return [...prev, ...newOPs];
    });
  };

  // Stock deduction helpers for INSUMO products
  const decrementInsumosStockForOrder = (order: SalesOrder) => {
    if (order.products && order.products.length > 0) {
      setInventory(prevInv => prevInv.map(item => {
        const orderItem = order.products?.find(p => p.sku === item.sku || p.name === item.name);
        if (orderItem && item.stages?.includes('INSUMO')) {
          const newStock = Math.max(0, item.stock - orderItem.qty);
          return { ...item, stock: newStock };
        }
        return item;
      }));
    } else {
      // Single product order format
      const prodName = order.items;
      if (prodName) {
        setInventory(prevInv => prevInv.map(item => {
          if (item.name === prodName && item.stages?.includes('INSUMO')) {
            const newStock = Math.max(0, item.stock - 1);
            return { ...item, stock: newStock };
          }
          return item;
        }));
      }
    }
  };

  const incrementInsumosStockForOrder = (order: SalesOrder) => {
    if (order.products && order.products.length > 0) {
      setInventory(prevInv => prevInv.map(item => {
        const orderItem = order.products?.find(p => p.sku === item.sku || p.name === item.name);
        if (orderItem && item.stages?.includes('INSUMO')) {
          const newStock = Math.min(item.stock + orderItem.qty, item.max || 100000);
          return { ...item, stock: newStock };
        }
        return item;
      }));
    } else {
      // Single product order format
      const prodName = order.items;
      if (prodName) {
        setInventory(prevInv => prevInv.map(item => {
          if (item.name === prodName && item.stages?.includes('INSUMO')) {
            const newStock = Math.min(item.stock + 1, item.max || 100000);
            return { ...item, stock: newStock };
          }
          return item;
        }));
      }
    }
  };

  // Add Sales Order
  const handleAddSalesOrder = (order: Omit<SalesOrder, 'id'>) => {
    const maxSerial = salesOrders.reduce((max, o) => {
      let num = o.serialNumber || 0;
      if (!num && o.id && o.id.startsWith('VD-')) {
        const parsed = parseInt(o.id.replace('VD-', ''), 10);
        if (!isNaN(parsed)) {
          num = parsed;
        }
      }
      return Math.max(max, num);
    }, 0);
    const nextSerial = maxSerial > 0 ? maxSerial + 1 : 1096;
    const nextId = `VD-${nextSerial}`;
    const newSalesOrderWithId = { id: nextId, serialNumber: nextSerial, ...order, operator: currentUser.name };
    setSalesOrders(prev => [
      newSalesOrderWithId,
      ...prev
    ]);

    // Also update customer purchase volume if they exist in state!
    setCustomers(prev => prev.map(c => {
      if (c.name.toLowerCase() === order.client.toLowerCase() || c.name.toLowerCase().includes(order.client.toLowerCase())) {
        const currentCredit = c.creditBalance || 0;
        const used = order.creditUsed || 0;
        const generated = order.creditGenerated || 0;
        const newCreditBalance = Math.max(0, currentCredit - used + generated);

        const newHistory = [...(c.creditHistory || [])];
        if (used > 0) {
          newHistory.push({
            id: `CRD-USE-${Date.now().toString().slice(-6)}`,
            customerId: c.id,
            customerName: c.name,
            amount: -used,
            reason: `Uso de Crédito no Pedido ${nextId}`,
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            operator: currentUser?.name || 'Sistema'
          });
        }
        if (generated > 0) {
          newHistory.push({
            id: `CRD-GEN-${Date.now().toString().slice(-6)}`,
            customerId: c.id,
            customerName: c.name,
            amount: generated,
            reason: `Crédito Excedente de Pagamento do Pedido ${nextId}`,
            date: new Date().toLocaleDateString('pt-BR'),
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            operator: currentUser?.name || 'Sistema'
          });
        }

        return { 
          ...c, 
          totalPurchased: c.totalPurchased + order.value,
          creditBalance: newCreditBalance,
          creditHistory: newHistory
        };
      }
      return c;
    }));

    // Decrement stock for INSUMO products if the order is active (not Orçamento)
    if (order.status !== 'Orçamento') {
      decrementInsumosStockForOrder(newSalesOrderWithId);
    }

    // Auto-generate Production Orders for the newly created sales order
    handleGenerateOPsFromOrder(newSalesOrderWithId);
  };

  // Add Customer
  const handleAddCustomer = (customer: Omit<Customer, 'id' | 'totalPurchased'>) => {
    const nextId = `CLI-${String(customers.length + 1).padStart(3, '0')}`;
    setCustomers(prev => [
      ...prev,
      { id: nextId, ...customer, totalPurchased: 0, operator: currentUser.name }
    ]);
  };

  // Toggle Customer Status
  const handleToggleCustomerStatus = (id: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'Ativo' ? 'Inativo' : 'Ativo', operator: currentUser.name };
      }
      return c;
    }));
  };

  // Delete Customer
  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  // Update Customer
  const handleUpdateCustomer = (id: string, updatedFields: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, ...updatedFields, operator: currentUser.name };
      }
      return c;
    }));
  };

  // CRM Lead Handlers
  const handleAddLead = (newLead: Omit<CrmLead, 'id' | 'createdAt'>) => {
    const nextId = `LEAD-${String(leads.length + 1).padStart(3, '0')}`;
    const lead: CrmLead = {
      ...newLead,
      id: nextId,
      createdAt: new Date().toISOString().split('T')[0],
      operator: currentUser?.name || 'Sistema'
    };
    setLeads(prev => {
      const updated = [lead, ...prev];
      if (typeof window !== 'undefined') {
        safeSetItem('erpf_leads', JSON.stringify(updated));
      }
      return updated;
    });
    setSyncMessage({ type: 'success', text: `Lead "${lead.name}" cadastrado com sucesso!` });
  };

  const handleUpdateLead = (id: string, updatedFields: Partial<CrmLead>) => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, ...updatedFields, operator: currentUser?.name } : l);
      if (typeof window !== 'undefined') {
        safeSetItem('erpf_leads', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const handleDeleteLead = (id: string) => {
    setLeads(prev => {
      const updated = prev.filter(l => l.id !== id);
      if (typeof window !== 'undefined') {
        safeSetItem('erpf_leads', JSON.stringify(updated));
      }
      return updated;
    });
    setSyncMessage({ type: 'info', text: 'Lead excluído do CRM.' });
  };

  const handleConvertLeadToCustomer = (lead: CrmLead) => {
    handleAddCustomer({
      name: lead.name,
      nickname: lead.company,
      cnpj: '',
      email: lead.email,
      phone: lead.phone,
      address: 'Endereço a cadastrar',
      segment: lead.segment,
      status: 'Ativo'
    });
    handleUpdateLead(lead.id, { stage: 'Fechado (Ganho)' });
    setSyncMessage({ type: 'success', text: `Lead "${lead.name}" convertido em Cliente no ERP!` });
  };

  const handleUpdateWhatsAppConfig = (config: WhatsAppConfig) => {
    setWhatsappConfig(config);
    if (typeof window !== 'undefined') {
      safeSetItem('erpf_whatsapp_config', JSON.stringify(config));
    }
    setSyncMessage({ type: 'success', text: 'Configurações de WhatsApp salvas!' });
  };

  // 7. Product Registry Mutators
  const handleAddProduct = (product: Omit<InventoryItem, 'stock' | 'image'> & { stock?: number }) => {
    setInventory(prev => [
      ...prev,
      {
        ...product,
        stock: product.stock ?? 0,
        image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=300&h=300&q=80',
        operator: currentUser.name
      }
    ]);
  };

  const handleUpdateProduct = (sku: string, updatedFields: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => {
      if (item.sku === sku) {
        return { ...item, ...updatedFields, operator: currentUser.name };
      }
      return item;
    }));
  };

  const handleDeleteProduct = (sku: string) => {
    setInventory(prev => prev.filter(item => item.sku !== sku));
  };

  // Update Sales Status
  const handleUpdateSalesStatus = (id: string, newStatus: SalesOrder['status']) => {
    setSalesOrders(prev => prev.map(o => {
      if (o.id === id) {
        // Check transition
        const wasActive = o.status !== 'Orçamento' && o.status !== 'Cancelado';
        const isNowActive = newStatus !== 'Orçamento' && newStatus !== 'Cancelado';

        if (!wasActive && isNowActive) {
          decrementInsumosStockForOrder(o);
        } else if (wasActive && newStatus === 'Cancelado') {
          incrementInsumosStockForOrder(o);
        }

        const originalOperator = o.operator || currentUser.name;
        const lastOperator = currentUser.name !== originalOperator ? currentUser.name : o.lastOperator;
        const updatedOrder = { 
          ...o, 
          status: newStatus, 
          operator: originalOperator, 
          lastOperator: lastOperator 
        };

        // Remove production orders if marked as Cancelado or Orçamento
        if (newStatus === 'Cancelado' || newStatus === 'Orçamento') {
          setProductionOrders(prevOPs => prevOPs.filter(op => op.salesOrderId !== id));
        } else if (newStatus === 'Entregue') {
          // Ensure associated production orders are marked as CONCLUÍDO and 100% progress
          setProductionOrders(prevOPs => prevOPs.map(op => {
            if (op.salesOrderId === id) {
              return { ...op, status: 'CONCLUÍDO', progress: 100 };
            }
            return op;
          }));
        } else {
          // Sync & generate OPs when an order is approved/activated (e.g., converted from Orçamento to Pendente)
          setTimeout(() => {
            handleSyncOPsForUpdatedOrder(updatedOrder);
          }, 0);
        }

        return updatedOrder;
      }
      return o;
    }));
  };

  // Update Sales Payment Method
  const handleUpdateSalesPaymentMethod = (id: string, newPaymentMethod: string) => {
    setSalesOrders(prev => prev.map(o => {
      if (o.id === id) {
        const originalOperator = o.operator || currentUser.name;
        const lastOperator = currentUser.name !== originalOperator ? currentUser.name : o.lastOperator;
        return { 
          ...o, 
          paymentMethod: newPaymentMethod, 
          operator: originalOperator, 
          lastOperator: lastOperator 
        };
      }
      return o;
    }));
  };

  // Helper to synchronize and generate new OPs for updated/edited Sales Orders
  const handleSyncOPsForUpdatedOrder = (order: SalesOrder) => {
    setProductionOrders(prev => {
      const otherOPs = prev.filter(op => op.salesOrderId !== order.id);
      if (order.status === 'Orçamento' || order.status === 'Entregue' || order.status === 'Cancelado') {
        return otherOPs;
      }

      const existingOPs = prev.filter(op => op.salesOrderId === order.id);
      
      const updatedOPs = existingOPs.map(op => {
        // Keep existing fields, but sync client name in case it changed
        return {
          ...op,
          salesOrderClient: order.client
        };
      });
      
      let generatedCount = 0;
      if (order.products && order.products.length > 0) {
        order.products.forEach((prod) => {
          // Check if there is already an OP for this product under this order (by name or sku)
          const existingOpForProd = existingOPs.find(op => op.product === prod.name);
          if (existingOpForProd) {
            // Update quantity and note of existing OP to match edited order
            const idx = updatedOPs.findIndex(op => op.product === prod.name);
            if (idx !== -1) {
              updatedOPs[idx].qty = prod.qty;
              if (prod.note) {
                updatedOPs[idx].note = prod.note;
              }
            }
            return;
          }
          
          // Skip OP generation if the item is marked as an INSUMO
          const invItem = inventory.find(item => item.sku === prod.sku || item.name === prod.name);
          if (invItem && invItem.stages && invItem.stages.includes('INSUMO')) {
            return;
          }

          // Generate a new OP for this new product!
          const opId = getNextOPId(prev, generatedCount);
          generatedCount++;
          let initialStatus: ProductionOrder['status'] = 'CAD';
          if (invItem && invItem.stages && invItem.stages.length > 0) {
            initialStatus = invItem.stages[0] as ProductionOrder['status'];
          }

          updatedOPs.push({
            id: opId,
            product: prod.name,
            qty: prod.qty,
            line: 'Linha A',
            priority: 'Média',
            status: initialStatus,
            supervisor: 'Carlos Eduardo',
            progress: 0,
            date: order.date || new Date().toISOString().split('T')[0],
            files: [`Desenho_${prod.sku || 'CUSTOM'}.dwg`],
            operator: currentUser?.name || order.operator || 'Eduardo Fontes',
            salesOrderId: order.id,
            salesOrderClient: order.client,
            note: prod.note || ''
          });
        });
      } else if (order.items) {
        // Single text-based item description
        const prodName = order.items;
        const exists = existingOPs.some(op => op.product === prodName);
        if (!exists) {
          const invItem = inventory.find(item => item.name === prodName);
          if (!(invItem && invItem.stages && invItem.stages.includes('INSUMO'))) {
            const opId = getNextOPId(prev);
            let initialStatus: ProductionOrder['status'] = 'CAD';
            if (invItem && invItem.stages && invItem.stages.length > 0) {
              initialStatus = invItem.stages[0] as ProductionOrder['status'];
            }

            updatedOPs.push({
              id: opId,
              product: prodName,
              qty: 1,
              line: 'Linha A',
              priority: 'Média',
              status: initialStatus,
              supervisor: 'Carlos Eduardo',
              progress: 0,
              date: order.date || new Date().toISOString().split('T')[0],
              files: [],
              operator: currentUser?.name || order.operator || 'Eduardo Fontes',
              salesOrderId: order.id,
              salesOrderClient: order.client,
              note: ''
            });
          }
        }
      }
      
      return [...otherOPs, ...updatedOPs];
    });
  };

  // Update Sales Order (generic edit)
  const handleUpdateSalesOrder = (id: string, updatedFields: Partial<SalesOrder>) => {
    setSalesOrders(prev => prev.map(o => {
      if (o.id === id) {
        let history = o.history || [];
        if (updatedFields.status !== undefined && updatedFields.status !== o.status) {
          const wasActive = o.status !== 'Orçamento' && o.status !== 'Cancelado';
          const isNowActive = updatedFields.status !== 'Orçamento' && updatedFields.status !== 'Cancelado';

          if (!wasActive && isNowActive) {
            decrementInsumosStockForOrder(o);
          } else if (wasActive && updatedFields.status === 'Cancelado') {
            incrementInsumosStockForOrder(o);
          }

          history = [
            ...history,
            {
              timestamp: new Date().toLocaleString('pt-BR'),
              previousStatus: o.status,
              newStatus: updatedFields.status,
              user: currentUser?.name || 'Operador',
              notes: `Status alterado para ${updatedFields.status}`
            }
          ];
        } else if (updatedFields.boletoPaid !== undefined && updatedFields.boletoPaid !== o.boletoPaid) {
          history = [
            ...history,
            {
              timestamp: new Date().toLocaleString('pt-BR'),
              previousStatus: o.boletoPaid ? 'Boleto Baixado' : 'Boleto Pendente',
              newStatus: updatedFields.boletoPaid ? 'Boleto Baixado' : 'Boleto Pendente',
              user: currentUser?.name || 'Operador',
              notes: updatedFields.boletoPaid ? 'Baixa de Boleto Efetuada' : 'Boleto marcado como Pendente'
            }
          ];
        }
        
        const originalOperator = o.operator || currentUser?.name || 'Eduardo Fontes';
        const lastOperator = (currentUser?.name && currentUser.name !== originalOperator) ? currentUser.name : o.lastOperator;
        const updatedOrder = { 
          ...o, 
          ...updatedFields, 
          operator: originalOperator, 
          lastOperator: lastOperator,
          history
        };
        
        // Sync production orders for this order (in a setTimeout to execute after the updated state is ready)
        setTimeout(() => {
          handleSyncOPsForUpdatedOrder(updatedOrder);
        }, 0);

        return updatedOrder;
      }
      return o;
    }));
  };

  // Add Production Order (OP)
  const handleAddOP = (op: Omit<ProductionOrder, 'id'>) => {
    setProductionOrders(prev => {
      const nextId = getNextOPId(prev);
      const initialEntry = {
        timestamp: new Date().toLocaleString('pt-BR'),
        previousStatus: undefined,
        newStatus: op.status || 'CAD',
        user: currentUser.name || 'Operador',
        notes: 'Ordem de Produção criada'
      };
      return [
        ...prev,
        { id: nextId, ...op, operator: currentUser.name, history: [initialEntry] }
      ];
    });
  };

  // Update OP status in Kanban
  const handleUpdateOPStatus = (id: string, newStatus: ProductionOrder['status']) => {
    setProductionOrders(prev => prev.map(op => {
      if (op.id === id) {
        // If OP is marked as CONCLUÍDO, we increase the inventory stock of the item!
        if (newStatus === 'CONCLUÍDO' && op.status !== 'CONCLUÍDO') {
          setInventory(inv => inv.map(item => {
            if (item.name === op.product) {
              const updatedStock = Math.min(item.stock + op.qty, item.max);
              return { ...item, stock: updatedStock };
            }
            return item;
          }));
        }
        const updatedStageSupervisors = {
          ...(op.stageSupervisors || {}),
          [newStatus]: op.stageSupervisors?.[newStatus] || op.supervisor
        };

        const history = [
          ...(op.history || []),
          {
            timestamp: new Date().toLocaleString('pt-BR'),
            previousStatus: op.status,
            newStatus,
            user: currentUser.name || 'Operador',
            notes: `Status alterado de ${op.status} para ${newStatus}`
          }
        ];

        return { 
          ...op, 
          status: newStatus, 
          progress: newStatus === 'CONCLUÍDO' ? 100 : op.progress, 
          operator: currentUser.name,
          stageSupervisors: updatedStageSupervisors,
          history
        };
      }
      return op;
    }));
  };

  // Update OP progress slider
  const handleUpdateOPProgress = (id: string, newProgress: number) => {
    setProductionOrders(prev => prev.map(op => {
      if (op.id === id) {
        const isNowCompleted = newProgress === 100;
        const newStatus = isNowCompleted ? 'CONCLUÍDO' : op.status;
        let history = op.history || [];
        if (newStatus !== op.status) {
          history = [
            ...history,
            {
              timestamp: new Date().toLocaleString('pt-BR'),
              previousStatus: op.status,
              newStatus,
              user: currentUser.name || 'Operador',
              notes: `Concluído via barra de progresso (100%)`
            }
          ];
        }

        return { 
          ...op, 
          progress: newProgress,
          status: newStatus,
          operator: currentUser.name,
          history
        };
      }
      return op;
    }));
  };

  // Update complete details of a production order
  const handleUpdateOPDetails = (id: string, updatedFields: Partial<ProductionOrder>) => {
    setProductionOrders(prev => prev.map(op => {
      if (op.id === id) {
        let newStatus = updatedFields.status !== undefined ? updatedFields.status : op.status;
        let newProgress = updatedFields.progress !== undefined ? updatedFields.progress : op.progress;

        // If newly marked as CONCLUÍDO, increase inventory stock
        if (newStatus === 'CONCLUÍDO' && op.status !== 'CONCLUÍDO') {
          setInventory(inv => inv.map(item => {
            if (item.name === op.product) {
              const qtyToIncrease = updatedFields.qty !== undefined ? updatedFields.qty : op.qty;
              const updatedStock = Math.min(item.stock + qtyToIncrease, item.max);
              return { ...item, stock: updatedStock };
            }
            return item;
          }));
          newProgress = 100;
        }

        // If progress set to 100, make sure status is CONCLUÍDO
        if (newProgress === 100 && newStatus !== 'CONCLUÍDO') {
          newStatus = 'CONCLUÍDO';
          setInventory(inv => inv.map(item => {
            if (item.name === op.product) {
              const qtyToIncrease = updatedFields.qty !== undefined ? updatedFields.qty : op.qty;
              const updatedStock = Math.min(item.stock + qtyToIncrease, item.max);
              return { ...item, stock: updatedStock };
            }
            return item;
          }));
        }

        let history = op.history || [];
        if (newStatus !== op.status) {
          history = [
            ...history,
            {
              timestamp: new Date().toLocaleString('pt-BR'),
              previousStatus: op.status,
              newStatus,
              user: currentUser.name || 'Operador',
              notes: 'Status alterado nos detalhes da OP'
            }
          ];
        }

        return {
          ...op,
          ...updatedFields,
          status: newStatus,
          progress: newProgress,
          operator: currentUser.name,
          history
        };
      }
      return op;
    }));
  };

  // Add Purchase Order
  const handleAddPurchaseOrder = (order: Omit<PurchaseOrder, 'id'>) => {
    const nextId = `OC-${2000 + purchaseOrders.length + 1}`;
    setPurchaseOrders(prev => [
      { id: nextId, ...order, operator: currentUser.name },
      ...prev
    ]);
  };

  // Update Purchase status
  const handleUpdatePurchaseStatus = (id: string, newStatus: PurchaseOrder['status']) => {
    setPurchaseOrders(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, status: newStatus, operator: currentUser.name };
      }
      return o;
    }));
  };

  // Add Supplier
  const handleAddSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newId = `FORN-${String(suppliers.length + 1).padStart(3, '0')}`;
    const newSupplier = { id: newId, ...supplier, operator: currentUser.name };
    setSuppliers(prev => {
      const updated = [newSupplier, ...prev];
      if (typeof window !== 'undefined') {
        safeSetItem('erpf_suppliers', JSON.stringify(updated));
      }
      return updated;
    });
    setSyncMessage({ type: 'success', text: `Fornecedor "${supplier.name}" cadastrado com sucesso!` });
  };

  // Update Supplier
  const handleUpdateSupplier = (updatedSupplier: Supplier) => {
    setSuppliers(prev => {
      const updated = prev.map(s => s.id === updatedSupplier.id ? { ...updatedSupplier, operator: currentUser.name } : s);
      if (typeof window !== 'undefined') {
        safeSetItem('erpf_suppliers', JSON.stringify(updated));
      }
      return updated;
    });
    setSyncMessage({ type: 'success', text: `Cadastro de "${updatedSupplier.name}" atualizado!` });
  };

  // Delete Supplier
  const handleDeleteSupplier = (id: string) => {
    setSuppliers(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (typeof window !== 'undefined') {
        safeSetItem('erpf_suppliers', JSON.stringify(updated));
      }
      return updated;
    });
    setSyncMessage({ type: 'info', text: 'Fornecedor excluído do cadastro.' });
  };

  // Toggle Supplier Status
  const handleToggleSupplierStatus = (id: string, newStatus: Supplier['status']) => {
    setSuppliers(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, status: newStatus, operator: currentUser.name } : s);
      if (typeof window !== 'undefined') {
        safeSetItem('erpf_suppliers', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Add Manual Transaction
  const handleAddManualTransaction = (tx: FinancialTransaction) => {
    setManualTransactions(prev => [tx, ...prev]);
  };

  // Toggle/Update Manual Transaction Status
  const handleToggleManualTransactionStatus = (id: string, newStatus?: 'PAGO' | 'PENDENTE') => {
    setManualTransactions(prev =>
      prev.map(tx => {
        if (tx.id === id) {
          const targetStatus = newStatus || (tx.status === 'PAGO' ? 'PENDENTE' : 'PAGO');
          return {
            ...tx,
            status: targetStatus,
            paymentDate: targetStatus === 'PAGO' ? new Date().toISOString().split('T')[0] : undefined
          };
        }
        return tx;
      })
    );
  };

  // Delete Manual Transaction
  const handleDeleteManualTransaction = (id: string) => {
    setManualTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  // Access control permissions matrix updates
  const handleUpdatePermissions = (name: string, updatedPermissions: PermissionMatrix) => {
    setUsers(prev => prev.map(u => {
      if (u.name === name) {
        return { ...u, permissions: updatedPermissions };
      }
      return u;
    }));
  };

  // Update User Schedule Window
  const handleUpdateSchedule = (name: string, restrict: boolean, start: string, end: string) => {
    setUsers(prev => prev.map(u => {
      if (u.name === name) {
        return { 
          ...u, 
          restrictToWorkHours: restrict,
          accessWindowStart: start,
          accessWindowEnd: end
        };
      }
      return u;
    }));
  };

  // Update user price hidden restriction status
  const handleUpdateHideOrderValues = (name: string, hide: boolean) => {
    setUsers(prev => prev.map(u => {
      if (u.name === name) {
        return { ...u, hideOrderValues: hide };
      }
      return u;
    }));
  };

  // Add a newly registered collaborator account
  const handleAddNewUser = (newUser: UserAccess) => {
    setUsers(prev => [...prev, newUser]);
  };

  // Delete a collaborator account
  const handleDeleteUser = (name: string) => {
    setUsers(prev => {
      const updated = prev.filter(u => u.name !== name);
      safeSetItem('erpf_users', JSON.stringify(updated));
      return updated;
    });
    setSyncMessage({ type: 'info', text: `Colaborador "${name}" excluído com sucesso.` });
  };

  // Update collaborator's personal PIN/Password
  const handleUpdateUserPin = (name: string, pin: string) => {
    setUsers(prev => prev.map(u => {
      if (u.name === name) {
        return { ...u, pin };
      }
      return u;
    }));
  };

  // Update collaborator's allowed menu tabs list
  const handleUpdateAllowedTabs = (name: string, allowedTabs: string[]) => {
    setUsers(prev => prev.map(u => {
      if (u.name === name) {
        return { ...u, allowedTabs };
      }
      return u;
    }));
  };

  // Update collaborator's current status (Active, Absent, Inactive)
  const handleUpdateUserStatus = (name: string, status: 'Ativo' | 'Ausente' | 'Inativo') => {
    setUsers(prev => prev.map(u => {
      if (u.name === name) {
        return { ...u, status };
      }
      return u;
    }));
  };

  // Update collaborator's commission settings
  const handleUpdateCommission = (name: string, eligible: boolean, percentage: number) => {
    setUsers(prev => prev.map(u => {
      if (u.name === name) {
        return { 
          ...u, 
          commissionEligible: eligible,
          commissionPercentage: percentage
        };
      }
      return u;
    }));
  };

  // Select OP file for Technical drawings viewer tab
  const handleSelectOPForViewer = (op: ProductionOrder) => {
    setSelectedOPForViewer(op);
    setActiveTab('Visualizador OP');
  };

  // Calculate delivery warnings dynamically
  const deliveryAlerts = salesOrders
    .map(order => {
      const alertInfo = getDeliveryAlertStatus(order.deliveryDate, order.status, systemParams.alertRiskDays);
      return {
        order,
        ...alertInfo
      };
    })
    .filter(item => item.isWarningActive);

  if (!isLoggedIn) {
    const handleNumpadClick = (num: string) => {
      setLoginError('');
      if (loginPin.length < 6) {
        setLoginPin(prev => prev + num);
      }
    };

    const handleNumpadClear = () => {
      setLoginPin('');
      setLoginError('');
    };

    const handleNumpadBackspace = () => {
      setLoginPin(prev => prev.slice(0, -1));
    };

    const handleLoginSubmit = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      
      if (!loginPin) {
        setLoginError('Por favor, insira seu PIN de acesso.');
        return;
      }

      setIsLoggingIn(true);
      setLoginError('');

      setTimeout(() => {
        const targetUser = availableLoginUsers.find(u => u.name === currentUserName) || currentUser;
        if (targetUser?.status === 'Inativo') {
          setLoginError('Acesso recusado: Este colaborador está Inativo.');
          setIsLoggingIn(false);
          return;
        }
        const correctPin = targetUser?.pin || (targetUser?.name === 'Administrador' ? '3040' : '1234');
        if (loginPin === correctPin) {
          setUsers(prev => prev.map(u => {
            if (u.name === targetUser.name) {
              return { ...u, lastLogin: 'Agora mesmo' };
            }
            return u;
          }));
          setCurrentUserName(targetUser.name);
          setIsLoggedIn(true);
          setLoginPin('');

          // Select the first allowed tab for targetUser upon login
          let initialTab = 'Painel Geral';
          if (!checkTabPermission(targetUser, initialTab)) {
            const allowedItem = menuItems.find(item => checkTabPermission(targetUser, item.label));
            if (allowedItem) {
              initialTab = allowedItem.label;
            }
          }
          setActiveTab(initialTab);
        } else {
          setLoginError(`PIN incorreto. Digite o PIN correto para ${targetUser.name} (Dica: ${correctPin})`);
        }
        setIsLoggingIn(false);
      }, 700);
    };

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Background Grid & Ambient Glows */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>

        {/* Outer Glassmorphism Card Container */}
        <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-850 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px] relative z-10">
          
          {/* BRANDING PANEL (Left Side, 5 Cols) */}
          <div className="md:col-span-5 bg-gradient-to-br from-slate-950 to-slate-900 p-8 flex flex-col justify-between border-r border-slate-850 text-slate-300 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent)]"></div>
            
            {/* Top Brand Header */}
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
                  <Layers className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-base font-black tracking-widest text-white font-mono">ESTILO COIFAS</h1>
                  <span className="text-[10px] text-indigo-400 font-bold font-mono tracking-widest uppercase block">Terminal de Acesso</span>
                </div>
              </div>

              <div className="space-y-2 mt-8">
                <p className="text-xs text-indigo-300/80 font-mono tracking-wider uppercase font-bold">Controle e Segurança</p>
                <h2 className="text-xl font-bold text-white tracking-tight leading-snug">
                  Portal de Autenticação Operacional
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Gerenciamento integrado de manufatura, compras, controle de qualidade, vendas e permissões industriais.
                </p>
              </div>
            </div>

            {/* Middle Stats/Logs indicator */}
            <div className="my-6 p-3.5 bg-slate-950/50 rounded-lg border border-slate-850 space-y-1.5 relative z-10 font-mono">
              <div className="flex justify-between items-center text-[9px] text-slate-500">
                <span>TERMINAL</span>
                <span>SECURE_LINK_OK</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">Canal:</span>
                <span className="text-indigo-400">SSL-256</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">Banco:</span>
                <span className="text-indigo-400">Local-Sync v3</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400">Sincronia:</span>
                <span className="text-emerald-400 font-bold">ATIVA</span>
              </div>
            </div>

            {/* Bottom Version info */}
            <div className="text-[10px] text-slate-500 font-mono flex flex-col gap-1 relative z-10">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span>Base de Dados: Local-Sync v3.1</span>
              </div>
              <p>© 2026 Estilo Coifas Corp.</p>
            </div>
          </div>

          {/* INTERACTIVE FORM PANEL (Right Side, 7 Cols) */}
          <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center bg-slate-900/40 relative">
            
            <div className="max-w-md mx-auto w-full space-y-6">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-bold text-white font-sans flex items-center justify-center md:justify-start gap-2">
                  <Fingerprint className="w-5 h-5 text-indigo-400 animate-pulse" />
                  Controle de Acesso de Operações
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Selecione o seu perfil de colaborador e insira seu PIN para iniciar o terminal.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Select User Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                    Colaborador / Operador
                  </label>
                  <div className="relative">
                    <select
                      value={currentUserName}
                      onChange={(e) => {
                        setCurrentUserName(e.target.value);
                        setLoginError('');
                      }}
                      className="w-full text-xs bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold font-mono cursor-pointer appearance-none shadow-inner"
                    >
                      {availableLoginUsers.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name} — ({u.role})
                        </option>
                      ))}
                    </select>
                    {/* Select Indicator Arrow */}
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      ▼
                    </div>
                  </div>
                </div>

                {/* PIN Input field with visual feedback */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                    <span>PIN de Acesso Pessoal</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={loginPin}
                      readOnly
                      placeholder="••••"
                      className="w-full text-center text-xl tracking-[0.6em] bg-slate-950 border border-slate-850 text-indigo-400 rounded-lg py-2.5 px-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold shadow-inner"
                    />
                    {loginPin && (
                      <button
                        type="button"
                        onClick={handleNumpadClear}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase font-mono"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-300 text-xs font-medium leading-relaxed font-sans">
                    ⚠️ {loginError}
                  </div>
                )}

                {/* Simulated Digital Numpad */}
                <div className="grid grid-cols-3 gap-2 py-2 max-w-[280px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumpadClick(num)}
                      className="h-11 bg-slate-950 hover:bg-slate-900 text-slate-200 hover:text-white font-mono font-bold rounded-lg border border-slate-850/80 hover:border-slate-800 text-sm transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleNumpadBackspace}
                    className="h-11 bg-slate-950 hover:bg-slate-900 text-slate-400 font-mono font-bold rounded-lg border border-slate-850/80 text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                    title="Apagar caractere"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadClick('0')}
                    className="h-11 bg-slate-950 hover:bg-slate-900 text-slate-200 font-mono font-bold rounded-lg border border-slate-850/80 text-sm transition-all active:scale-95 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleNumpadClear}
                    className="h-11 bg-slate-950 hover:bg-slate-900 text-slate-400 font-mono font-bold rounded-lg border border-slate-850/80 text-[10px] transition-all active:scale-95 uppercase cursor-pointer"
                  >
                    CLR
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:shadow-[0_6px_18px_rgba(79,70,229,0.4)] disabled:bg-indigo-800 disabled:opacity-55 transition-all text-xs tracking-wider uppercase font-mono flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Validando Credenciais...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Iniciar Sessão</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex overflow-hidden">
      
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside 
        id="main-sidebar"
        className={`bg-slate-900 text-slate-200 w-64 flex-shrink-0 flex flex-col justify-between border-r border-slate-950 transition-all duration-300 z-30 ${
          isSidebarOpen ? 'translate-x-0 ml-0' : '-translate-x-full -ml-64 md:translate-x-0 md:ml-0'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="p-5 border-b border-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {systemParams?.companyLogo && !logoError ? (
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-0.5 overflow-hidden shadow-inner flex-shrink-0">
                  <img 
                    src={systemParams.companyLogo} 
                    alt="Logo" 
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                </div>
              ) : (
                <div className="p-1.5 bg-indigo-600 rounded-lg text-white flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
              )}
              <div>
                <h1 className="text-sm font-extrabold text-white tracking-wider font-mono uppercase truncate max-w-[130px]">
                  {systemParams?.companyName || 'ESTILO COIFAS'}
                </h1>
                <span className="text-[9px] text-emerald-400 font-mono font-bold tracking-widest block mt-0.5">● OPERACIONAL</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <LogOut className="w-4 h-4 transform rotate-180" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              if (!checkTabPermission(currentUser, item.label)) return null;
              const IconComp = item.icon;
              const isActive = effectiveActiveTab === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveTab(item.label);
                    // Close sidebar on mobile after choosing
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all text-left ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)]' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <IconComp className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile Card */}
        <div className="p-4 border-t border-slate-950 bg-slate-950/40 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 text-slate-300 rounded-lg flex-shrink-0">
              <UserCheck className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-100 font-mono truncate">{currentUser.name}</p>
              <p className="text-[9px] text-slate-500 font-mono truncate">{currentUser.role}</p>
            </div>
            <button 
              onClick={() => setIsLoggedIn(false)}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
              title="Sair do Terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP STATUS BAR */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex items-center justify-between flex-shrink-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              title="Alternar Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Módulo Ativo: <span className="text-slate-800">{effectiveActiveTab}</span></h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {supabaseConfigured ? (
              supabaseConnected ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncToSupabase}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-75"
                    title="Dados sincronizados automaticamente com o Supabase. Clique para forçar sincronização manual."
                  >
                    <Database className={`w-3.5 h-3.5 text-emerald-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="flex items-center gap-1">
                      <span>{isSyncing ? 'Auto-salvando...' : 'Supabase Sincronizado ✓'}</span>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5"></span>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSyncMessage(null);
                      handleSyncToSupabase();
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-2.5 py-1 font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-75"
                    title="Erro de conexão com o Supabase. Clique para tentar reconectar e forçar sincronização."
                  >
                    <Database className={`w-3.5 h-3.5 text-rose-500 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="flex items-center gap-1">
                      <span>{isSyncing ? 'Conectando...' : 'Supabase Desconectado ⚠️'}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setIsSupabaseModalOpen(true)}
                    className="text-slate-400 hover:text-slate-600 font-bold px-1"
                    title="Ver instruções de correção"
                  >
                    ℹ️
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className="flex items-center gap-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1 font-bold cursor-pointer transition-all active:scale-95"
                  title="Configurar conexão com o Supabase"
                >
                  <Database className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>Conectar Supabase ⚠️</span>
                </button>
              </div>
            )}
            
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 relative transition-all duration-200"
                title="Notificações Operacionais"
              >
                <Bell className={`w-4 h-4 ${deliveryAlerts.length > 0 ? 'text-rose-500 animate-swing' : ''}`} />
                {deliveryAlerts.length > 0 ? (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold text-white ring-2 ring-white animate-pulse">
                    {deliveryAlerts.length}
                  </span>
                ) : (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full"></span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden font-sans">
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold tracking-wider uppercase font-mono">Alertas de Entrega</span>
                    </div>
                    <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold">
                      {deliveryAlerts.length} alertas
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {deliveryAlerts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <span>🎉</span>
                        <p className="font-medium text-slate-600">Nenhum alerta de prazo ativo!</p>
                        <p className="text-[10px] text-slate-400 leading-normal">Todos os pedidos pendentes estão dentro do cronograma.</p>
                      </div>
                    ) : (
                      deliveryAlerts.map(({ order, alertLabel, alertColorClass }) => (
                        <div 
                          key={order.id} 
                          onClick={() => {
                            setActiveTab('Consulta de Pedidos');
                            setIsNotificationOpen(false);
                          }}
                          className="p-3 hover:bg-slate-50 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-slate-900 text-xs">{order.id}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${alertColorClass}`}>
                              {alertLabel}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 line-clamp-1">{order.client}</p>
                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-indigo-400" />
                              Prazo: {order.deliveryDate}
                            </span>
                            <span className="font-bold text-indigo-600 hover:underline">Ver Pedido →</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {deliveryAlerts.length > 0 && (
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                      <button 
                        onClick={() => {
                          setActiveTab('Consulta de Pedidos');
                          setIsNotificationOpen(false);
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider block w-full text-center"
                      >
                        Visualizar todos na consulta →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CENTRAL VIEW AREA */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          
          {/* IDENTIFICAÇÃO DO OPERADOR (REQUISITO FUNDAMENTAL) */}
          <div className="mb-6 bg-indigo-50/70 border border-indigo-150/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_1px_2px_rgba(79,70,229,0.03)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-700 shrink-0 animate-pulse">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">Operador Ativo no Terminal</p>
                <p className="text-sm font-extrabold text-slate-800 leading-none mt-1">
                  {currentUser.name} <span className="text-xs font-semibold text-slate-500 font-mono">({currentUser.role})</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono self-start sm:self-center bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Operação Identificada & Auditada</span>
            </div>
          </div>

          {effectiveActiveTab === 'Painel Geral' && (
            <DashboardTab 
              inventory={inventory}
              productionOrders={productionOrders}
              salesOrders={salesOrders}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenNewOP={() => { setActiveTab('Produção'); setIsNewOPModalOpen(true); }}
              onOpenUpdateStock={() => { setActiveTab('Controle de Estoque'); setIsUpdateStockModalOpen(true); }}
              hideOrderValues={currentUser?.hideOrderValues}
              alertRiskDays={systemParams.alertRiskDays}
            />
          )}

          {effectiveActiveTab === 'CRM & WhatsApp' && (
            <CrmTab 
              leads={leads}
              customers={customers}
              salesOrders={salesOrders}
              onAddLead={handleAddLead}
              onUpdateLead={handleUpdateLead}
              onDeleteLead={handleDeleteLead}
              onConvertLeadToCustomer={handleConvertLeadToCustomer}
              industrialSegments={industrialSegments}
              currentUser={currentUser}
              users={users}
              whatsappConfig={whatsappConfig}
              onUpdateWhatsAppConfig={handleUpdateWhatsAppConfig}
            />
          )}

          {effectiveActiveTab === 'Vendas' && (
            <SalesTab 
              salesOrders={salesOrders}
              productionOrders={productionOrders}
              customers={customers}
              inventory={inventory}
              onAddSalesOrder={handleAddSalesOrder}
              onUpdateStatus={handleUpdateSalesStatus}
              onUpdatePaymentMethod={handleUpdateSalesPaymentMethod}
              onGenerateOPsFromOrder={handleGenerateOPsFromOrder}
              onAddCustomer={handleAddCustomer}
              industrialSegments={industrialSegments}
              onUpdateSegments={handleUpdateSegments}
              systemParams={systemParams}
            />
          )}

          {effectiveActiveTab === 'Consulta de Pedidos' && (
            <OrderQueryTab 
              salesOrders={salesOrders}
              productionOrders={productionOrders}
              inventory={inventory}
              customers={customers}
              onUpdatePaymentMethod={handleUpdateSalesPaymentMethod}
              onUpdateStatus={handleUpdateSalesStatus}
              onUpdateSalesOrder={handleUpdateSalesOrder}
              onGenerateOPsFromOrder={handleGenerateOPsFromOrder}
              hideOrderValues={currentUser?.hideOrderValues}
              alertRiskDays={systemParams.alertRiskDays}
              systemParams={systemParams}
            />
          )}

          {effectiveActiveTab === 'Consulta de Orçamentos' && (
            <BudgetQueryTab 
              salesOrders={salesOrders}
              productionOrders={productionOrders}
              onUpdateStatus={handleUpdateSalesStatus}
              onUpdatePaymentMethod={handleUpdateSalesPaymentMethod}
              hideOrderValues={currentUser?.hideOrderValues}
              systemParams={systemParams}
            />
          )}

          {effectiveActiveTab === 'Cadastro de Clientes' && (
            <CustomerTab 
              customers={customers}
              salesOrders={salesOrders}
              onAddCustomer={handleAddCustomer}
              onToggleCustomerStatus={handleToggleCustomerStatus}
              onDeleteCustomer={handleDeleteCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              industrialSegments={industrialSegments}
              onUpdateSegments={handleUpdateSegments}
              currentUser={currentUser}
              users={users}
            />
          )}

          {effectiveActiveTab === 'Cadastro de Produtos' && (
            <ProductTab 
              inventory={inventory}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}

          {effectiveActiveTab === 'Controle de Estoque' && (
            <InventoryTab 
              inventory={inventory}
              users={users}
              onUpdateStock={handleUpdateStock}
              isUpdateOpen={isUpdateStockModalOpen}
              onCloseUpdate={() => setIsUpdateStockModalOpen(false)}
            />
          )}

          {effectiveActiveTab === 'Produção' && (
            <ProductionTab 
              productionOrders={productionOrders}
              salesOrders={salesOrders}
              inventory={inventory}
              customers={customers}
              users={users}
              onAddOP={handleAddOP}
              onUpdateOPStatus={handleUpdateOPStatus}
              onUpdateOPProgress={handleUpdateOPProgress}
              onUpdateOPDetails={handleUpdateOPDetails}
              onSelectOPForViewer={handleSelectOPForViewer}
              isNewOPModalOpen={isNewOPModalOpen}
              onOpenNewOP={() => setIsNewOPModalOpen(true)}
              onCloseNewOP={() => setIsNewOPModalOpen(false)}
              systemParams={systemParams}
            />
          )}

          {effectiveActiveTab === 'Gestão de Acessos' && (
            <AccessTab 
              users={users}
              onUpdatePermissions={handleUpdatePermissions}
              onUpdateSchedule={handleUpdateSchedule}
              onUpdateHideOrderValues={handleUpdateHideOrderValues}
              onAddUser={handleAddNewUser}
              onDeleteUser={handleDeleteUser}
              onUpdateUserPin={handleUpdateUserPin}
              onUpdateAllowedTabs={handleUpdateAllowedTabs}
              onUpdateUserStatus={handleUpdateUserStatus}
              onUpdateCommission={handleUpdateCommission}
            />
          )}

          {effectiveActiveTab === 'Parâmetros' && (
            <ParametersTab 
              params={systemParams}
              onUpdateParams={handleUpdateSystemParams}
              industrialSegments={industrialSegments}
              customers={customers}
              onUpdateSegments={handleUpdateSegments}
            />
          )}

          {effectiveActiveTab === 'Relatórios' && (
            <ReportsTab 
              salesOrders={salesOrders}
              inventory={inventory}
              productionOrders={productionOrders}
              customers={customers}
            />
          )}

          {effectiveActiveTab === 'Ordens de Compra' && (
            <PurchaseTab 
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              onAddPurchaseOrder={handleAddPurchaseOrder}
              onUpdatePurchaseStatus={handleUpdatePurchaseStatus}
            />
          )}

          {effectiveActiveTab === 'Financeiro' && (
            <FinanceTab 
              salesOrders={salesOrders}
              purchaseOrders={purchaseOrders}
              customers={customers}
              manualTransactions={manualTransactions}
              collaborators={users}
              commissionPayouts={commissionPayouts}
              onAddManualTransaction={handleAddManualTransaction}
              onToggleManualTransactionStatus={handleToggleManualTransactionStatus}
              onDeleteManualTransaction={handleDeleteManualTransaction}
              onUpdateSalesOrder={handleUpdateSalesOrder}
              onAddCommissionPayout={handleAddCommissionPayout}
            />
          )}

          {(effectiveActiveTab === 'Cadastro de Fornecedores' || effectiveActiveTab === 'Ficha do Fornecedor') && (
            <SupplierTab 
              suppliers={suppliers}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onToggleSupplierStatus={handleToggleSupplierStatus}
              currentUser={currentUser}
            />
          )}

          {effectiveActiveTab === 'Visualizador OP' && (
            <BlueprintTab 
              selectedOP={selectedOPForViewer}
              salesOrders={salesOrders}
              onBackToProduction={() => setActiveTab('Produção')}
            />
          )}
        </main>
      </div>

      {/* Supabase Status / Error Toasts */}
      {syncMessage && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-xl z-50 border max-w-sm flex items-start gap-3 transition-all duration-300 transform translate-y-0 ${
          syncMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="shrink-0 p-1 rounded-lg bg-white shadow-xs">
            <Database className={`w-4 h-4 ${syncMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold uppercase tracking-wider mb-0.5">{syncMessage.type === 'success' ? 'Sincronizado' : 'Aviso / Erro'}</h4>
            <p className="font-medium leading-relaxed">{syncMessage.text}</p>
          </div>
          <button 
            onClick={() => setSyncMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Supabase Configuration & Onboarding Modal */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Conexão com o Supabase</h3>
              </div>
              <button 
                onClick={() => setIsSupabaseModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 font-sans text-xs text-slate-600 max-h-[70vh] overflow-y-auto">
              <p className="leading-relaxed">
                Esta aplicação está totalmente preparada para salvar e persistir os seus dados diretamente no seu banco de dados <strong>Supabase (PostgreSQL)</strong> usando <strong>Drizzle ORM</strong> e migrações estruturadas!
              </p>

              {migrationRequired ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2 text-rose-800 font-bold">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">Criação de Tabelas Requerida</h4>
                      <p className="text-[10px] font-normal text-rose-700 mt-1 leading-relaxed">
                        Seu banco Supabase foi detectado, mas as tabelas ainda não foram criadas. Isso geralmente acontece porque sua connection string usa a porta de pooler <code className="bg-rose-100 px-1 rounded font-mono font-bold">6543</code>, que bloqueia a criação direta automática de tabelas (DDL) por segurança.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-2 text-[10px] text-slate-700 leading-relaxed">
                    <p className="font-semibold text-rose-800 text-xs">Como criar as tabelas no Supabase (Passo-a-Passo):</p>
                    <ol className="list-decimal list-inside space-y-1.5">
                      <li>Abra o seu painel do projeto em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-bold">supabase.com</a>.</li>
                      <li>Clique no menu <strong>SQL Editor</strong> na barra lateral esquerda (ícone de prompt <code className="font-mono bg-slate-100 p-0.5 rounded">&gt;_</code>).</li>
                      <li>Crie uma nova consulta clicando em <strong>+ New query</strong>.</li>
                      <li>Cole todo o código SQL do campo abaixo e clique no botão verde <strong>Run</strong> no canto inferior direito. Pronto!</li>
                    </ol>
                  </div>

                  <div className="relative mt-2">
                    <textarea
                      readOnly
                      value={migrationSql}
                      className="w-full h-36 p-2.5 font-mono text-[10px] text-slate-100 bg-slate-900 border border-slate-950 rounded-lg resize-none focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(migrationSql);
                        setSqlCopied(true);
                        setTimeout(() => setSqlCopied(false), 2000);
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-md shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1"
                    >
                      {sqlCopied ? 'Copiado!' : 'Copiar SQL'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] font-mono text-indigo-600">Como conectar seu banco Supabase:</h4>
                  <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                    <li>
                      Crie uma conta e um novo projeto em <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">supabase.com</a>.
                    </li>
                    <li>
                      No painel do seu projeto Supabase, navegue até <strong>Project Settings &gt; Database</strong> e copie a sua <strong>URI de conexão (Connection String)</strong>. 
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 my-2 text-[11px] text-amber-900 leading-relaxed font-medium">
                        ⚠️ <strong>ATENÇÃO (IPv6 vs IPv4):</strong> O Supabase utiliza IPv6 por padrão na conexão direta (porta 5432). Como o ambiente do Google AI Studio suporta apenas IPv4, a conexão direta falhará. Você <strong>DEVE copiar a Connection String do &quot;Connection Pooler&quot;</strong> (geralmente com a porta <strong>6543</strong> e host contendo <strong>pooler.supabase.com</strong>). O Pooler suporta IPv4 e conectará com 100% de sucesso!
                      </div>
                      Exemplo do formato correto (Pooler):
                      <code className="block mt-1 p-2 bg-slate-100 rounded border border-slate-200 font-mono text-[10px] overflow-x-auto whitespace-pre">
                        postgresql://postgres.[ID]:[SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
                      </code>
                    </li>
                    <li>
                      No painel do <strong>Google AI Studio</strong>, vá nas configurações do seu projeto (ícone de engrenagem) e adicione a seguinte variável de ambiente:
                      <div className="mt-1.5 p-2 bg-slate-900 text-slate-100 rounded border border-slate-950 font-mono text-[10px]">
                        <span className="text-emerald-400 font-bold">DATABASE_URL</span> = [Sua Connection String]
                      </div>
                    </li>
                    <li>
                      Após adicionar a variável de ambiente, os seus dados locais serão salvos e carregados de forma persistente a cada nova modificação!
                    </li>
                  </ol>
                </div>
              )}

              {/* Status Section */}
              {!supabaseConfigured ? (
                <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-amber-900">Estado Atual: Modo Sandbox Local</p>
                    <p className="text-[10px] text-amber-700 mt-0.5 leading-normal">
                      Os dados estão rodando de forma temporária no navegador. Adicione DATABASE_URL nas variáveis do Vercel/AI Studio para sincronizar.
                    </p>
                  </div>
                </div>
              ) : !supabaseConnected ? (
                <div className="flex items-center gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 animate-pulse"></span>
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-rose-900">Estado Atual: Erro de Conexão (Offline)</p>
                    <p className="text-[10px] text-rose-700 mt-0.5 leading-normal">
                      Sua variável DATABASE_URL está definida, mas a conexão falhou por Timeout ou Recusa. Verifique se o seu banco no Supabase não foi pausado automaticamente por inatividade (basta abrir o painel do Supabase para reativá-lo) ou se o link usa o <strong>Connection Pooler (porta 6543)</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 animate-pulse"></span>
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-emerald-900">Estado Atual: Conectado e Ativo ✓</p>
                    <p className="text-[10px] text-emerald-700 mt-0.5 leading-normal">
                      Seu banco de dados Supabase foi verificado com sucesso e as alterações são auto-salvas em tempo real!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Voltar ao Terminal
              </button>
              <button
                onClick={() => {
                  setIsSupabaseModalOpen(false);
                  handleSyncToSupabase();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Testar Sincronização</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
