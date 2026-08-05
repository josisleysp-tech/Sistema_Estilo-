export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  stock: number;
  max: number;
  price: number;
  purchasePrice: number;
  salesPrice: number;
  unit: string;
  image: string;
  operator?: string;
  stages?: string[];
  updatedAt?: string;
  active?: boolean;
}

export interface StatusHistoryEntry {
  timestamp: string;
  previousStatus?: string;
  newStatus: string;
  user: string;
  notes?: string;
}

export interface ProductionOrder {
  id: string;
  product: string;
  qty: number;
  line: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status: 'CAD' | 'LASER' | 'CORTE DOBRA' | 'PINTURA' | 'ELÉTRICA FILTROS' | 'CONCLUÍDO';
  supervisor: string;
  progress: number;
  date: string;
  files: string[];
  operator?: string;
  salesOrderId?: string;
  salesOrderClient?: string;
  note?: string;
  updatedAt?: string;
  stageSupervisors?: Record<string, string>;
  history?: StatusHistoryEntry[];
}

export interface ProjectFile {
  name: string;
  type: string;
  data: string;
}

export interface SalesOrder {
  id: string;
  serialNumber?: number;
  client: string;
  clientSegment?: string;
  value: number;
  date: string;
  status: 'Pendente' | 'Faturado' | 'Enviado' | 'Entregue' | 'Cancelado' | 'Orçamento';
  items: string;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryDate?: string;
  projectImages?: string[];
  projectFiles?: ProjectFile[];
  notes?: string;
  discountPercentage?: number;
  products?: Array<{
    sku: string;
    name: string;
    qty: number;
    price: number;
    total: number;
    unit?: string;
    note?: string;
  }>;
  operator?: string;
  lastOperator?: string;
  creditUsed?: number;
  creditGenerated?: number;
  boletoDueDate?: string;
  boletoPaid?: boolean;
  paidAmount?: number;
  boletoInstallmentsCount?: number;
  boletoInstallments?: Array<{
    id: string;
    dueDate: string;
    value: number;
    paid: boolean;
  }>;
  commissionPercentage?: number;
  commissionValue?: number;
  commissionPaid?: boolean;
  commissionPayoutId?: string;
  updatedAt?: string;
  history?: StatusHistoryEntry[];
}

export interface CommissionPayout {
  id: string;
  collaboratorName: string;
  amount: number;
  percentage: number;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  orderCount: number;
  salesOrderIds: string[];
  financialTransactionId?: string;
  notes?: string;
  updatedAt?: string;
}

export interface PurchaseOrder {
  id: string;
  supplier: string;
  value: number;
  status: 'Rascunho' | 'Aguardando Aprovação' | 'Enviado ao Fornecedor' | 'Recebido Parcial' | 'Concluído';
  date: string;
  operator?: string;
  updatedAt?: string;
}

export interface PermissionMatrix {
  sales: { view: boolean; edit: boolean; del: boolean };
  inventory: { view: boolean; edit: boolean; del: boolean };
  production: { view: boolean; edit: boolean; del: boolean };
  customers: { view: boolean; edit: boolean; del: boolean };
  settings: { view: boolean; edit: boolean; del: boolean };
}

export interface UserAccess {
  name: string;
  role: string;
  status: 'Ativo' | 'Ausente' | 'Inativo';
  lastLogin: string;
  email: string;
  permissions: PermissionMatrix;
  restrictToWorkHours: boolean;
  accessWindowStart: string;
  accessWindowEnd: string;
  hideOrderValues?: boolean;
  pin: string;
  allowedTabs?: string[];
  commissionEligible?: boolean;
  commissionPercentage?: number;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  cnpj: string;
  email: string;
  phone: string;
  contactPerson?: string;
  category: string;
  address: string;
  cityState?: string;
  status: 'Ativo' | 'Inativo' | 'Em Homologação';
  reliabilityScore: number;
  leadTime: string;
  rejectionRate?: string;
  paymentTerms?: string;
  certifications?: string[];
  notes?: string;
  suppliedItemsCount?: number;
  operator?: string;
  updatedAt?: string;
}

export interface SupplierProfile {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  location: string;
  reliabilityScore: number; // 0 - 100
  leadTime: string;
  rejectionRate: string;
  certifications: string[];
}

export interface CustomerCreditRecord {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  reason: string;
  date: string;
  time?: string;
  operator?: string;
}

export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  segment: string;
  status: 'Ativo' | 'Inativo';
  totalPurchased: number;
  operator?: string;
  creditBalance?: number;
  creditHistory?: CustomerCreditRecord[];
  updatedAt?: string;
}

export interface FinancialTransaction {
  id: string;
  description: string;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  clientOrSupplier?: string;
  paymentMethod?: string;
  notes?: string;
  salesOrderId?: string;
  purchaseOrderId?: string;
  updatedAt?: string;
}


