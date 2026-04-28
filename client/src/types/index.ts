// ============================================================================
// types/index.ts — Tipos TypeScript compartidos del cliente HorasPRO
// ============================================================================

// --- Auth -------------------------------------------------------------------

export type UserRole   = 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'VIEWER';
export type TenantPlan = 'STARTER' | 'GROWTH' | 'EMPIRE';

export interface AuthUser {
  id:       string;
  email:    string;
  fullName: string;
  role:     UserRole;
  hourlyCost?: string | number | null;
}

export interface AuthTenant {
  id:   string;
  name: string;
  slug: string;
}

export interface AuthResponse {
  user:         AuthUser;
  tenant:       AuthTenant;
  accessToken:  string;
  refreshToken: string;
}

// --- Proyectos --------------------------------------------------------------

export type ProjectStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

/** Modo de facturación (incluye SUBSCRIPTION) */
export type BillingMode = 'FIXED' | 'HOURLY' | 'HYBRID' | 'SUBSCRIPTION';

export type ExtendedBillingMode = BillingMode;

export interface Project {
  id:                     string;
  tenantId:               string;
  clientId:               string;
  client:                 { id: string; name: string; taxId: string | null };
  name:                   string;
  description:            string | null;
  status:                 ProjectStatus;
  billingMode:            BillingMode;
  budgetHours:            number | null;
  budgetAmount:           string | null;
  hourlyRate:             string | null;
  partsMarkupPct:         string | null;
  productMaintenanceCost: string | null;
  startDate:              string | null;
  endDate:                string | null;
  createdAt:              string;
  updatedAt:              string;
  _count?: {
    timeEntries: number;
    varCosts:    number;
    contracts?:  number;
  };
}

// --- Time Entries -----------------------------------------------------------

export interface TimeEntry {
  id:          string;
  tenantId:    string;
  userId:      string;
  projectId:   string;
  contractId:  string | null;
  issueId:     string | null;
  description: string | null;
  startedAt:   string;
  endedAt:     string | null;
  durationMin: number;
  isBillable:  boolean;
  user?:    { id: string; fullName: string; hourlyCost?: string | number };
  project?: { id: string; name: string };
}

// --- Costes Fijos -----------------------------------------------------------

export type CostFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface FixedCost {
  id:           string;
  tenantId:     string;
  name:         string;
  amount:       string;
  frequency:    CostFrequency;
  category:     string | null;
  isActive:     boolean;
  isInvestment?: boolean;
  isDemo?:       boolean;
  createdAt:    string;
  updatedAt:    string;
}

// --- Costes Variables -------------------------------------------------------

export interface VarCost {
  id:               string;
  tenantId:         string;
  projectId:        string | null;
  contractId:       string | null;
  issueId:          string | null;
  name:             string;
  amount:           string;
  quantity:         string;
  priceIncludesVat: boolean;
  vatRate:          string;
  markupPct:        string | null;
  date:             string;
  category:         string | null;
  isInvestment?:    boolean;
  project?:         { id: string; name: string } | null;
}

// --- Clientes ---------------------------------------------------------------

export interface Client {
  id:        string;
  tenantId:  string;
  name:      string;
  taxId:     string | null;
  email:     string | null;
  phone:     string | null;
  notes:     string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contracts: number;
  };
}

// --- Catálogo de Planes ----------------------------------------------------

export type ContractTier    = 'FREE' | 'PRO' | 'MAX';
export type MaintenanceMode = 'NONE' | 'SHARED' | 'CUSTOM';

export interface Plan {
  id:                  string;
  tenantId:            string;
  name:                string;
  tier:                ContractTier;
  description:         string | null;
  billingMode:         ExtendedBillingMode;
  price:               string;
  setupFee:            string | null;
  hourlyRate:          string | null;
  partsMarkupPct:      string | null;
  maintenanceMode:     MaintenanceMode;
  maintenanceExtraPct: string | null;
  vatRate:             string;
  priceIncludesVat:    boolean;
  features:            string[];
  limits:              Record<string, unknown>;
  isActive:            boolean;
  createdAt:           string;
  updatedAt:           string;
  _count?:             { contracts: number };
}

// --- Contratos --------------------------------------------------------------

export type ContractStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface Contract {
  id:                     string;
  tenantId:               string;
  projectId:              string;
  clientId:               string;
  planId:                 string | null;
  tier:                   ContractTier;
  billingMode:            ExtendedBillingMode;
  price:                  string;
  setupFee:               string | null;
  hourlyRate:             string | null;
  budgetHours:            string | null;
  partsMarkupPct:         string | null;
  maintenanceMode:        MaintenanceMode;
  maintenanceExtraPct:    string | null;
  maintenanceFixedAmount: string | null;
  billingDay:             number | null;
  billingFrequency:       'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  irpfRate:               string | null;
  priceIncludesVat:       boolean;
  vatRate:                string;
  status:                 ContractStatus;
  startedAt:              string;
  endedAt:                string | null;
  notes:                  string | null;
  createdAt:              string;
  updatedAt:              string;
  client?: Pick<Client, 'id' | 'name' | 'taxId'>;
  project?: {
    id:                     string;
    name:                   string;
    productMaintenanceCost?: string | null;
    billingMode?:            BillingMode;
  };
  plan?: { id: string; name: string; tier: ContractTier } | null;
  payments?: Payment[];
  issues?:   Issue[];
  timeEntries?: TimeEntry[];
  varCosts?:    VarCost[];
  _count?: {
    issues:      number;
    payments:    number;
    timeEntries: number;
    varCosts:    number;
  };
}

// --- Pagos ------------------------------------------------------------------

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export type PaymentMethod = 'TRANSFER' | 'CARD' | 'CASH' | 'OTHER';

export interface PaymentTransaction {
  id:        string;
  tenantId:  string;
  paymentId: string;
  amount:    string;
  paidAt:    string;
  method:    PaymentMethod;
  reference: string | null;
  notes:     string | null;
  createdAt: string;
}

export interface Payment {
  id:           string;
  tenantId:     string;
  contractId:   string;
  periodStart:  string;
  periodEnd:    string;
  amountNet:    string;
  vatRate:      string;
  amountGross:  string;
  amountDue:    string;
  amountPaid:   string;
  irpfAmount:   string;
  status:       PaymentStatus;
  paidAt:       string | null;
  notes:        string | null;
  createdAt:    string;
  updatedAt:    string;
  contract?: {
    id:          string;
    billingMode: ExtendedBillingMode;
    client:      { id: string; name: string };
    project:     { id: string; name: string };
  };
  transactions?: PaymentTransaction[];
}

// --- Facturación ------------------------------------------------------------

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOIDED';

export interface InvoiceSeries {
  id:         string;
  tenantId:   string;
  code:       string;
  name:       string;
  nextNumber: number;
  isDefault:  boolean;
  createdAt:  string;
  updatedAt:  string;
}

export interface InvoiceLine {
  id:          string;
  invoiceId:   string;
  description: string;
  quantity:    string;
  unitPrice:   string;
  vatRate:     string;
  irpfRate:    string;
  discount:    string;
  lineNet:     string;
  lineGross:   string;
  position:    number;
}

export interface Invoice {
  id:                  string;
  tenantId:            string;
  seriesId:            string;
  number:              number | null;
  status:              InvoiceStatus;
  issueDate:           string;
  dueDate:             string | null;
  contractId:          string | null;
  clientId:            string;
  paymentId:           string | null;
  rectifiesInvoiceId:  string | null;
  subtotalNet:         string;
  totalVat:            string;
  totalIrpf:           string;
  totalGross:          string;
  notes:               string | null;
  createdAt:           string;
  updatedAt:           string;
  series?:             { id?: string; code: string; name: string };
  client?:             { id: string; name: string; taxId: string | null };
  contract?:           { id: string } | null;
  payment?:            { id: string; periodStart: string; periodEnd: string } | null;
  rectifies?:          { id: string; number: number | null; series: { code: string } } | null;
  lines?:              InvoiceLine[];
  _count?:             { lines: number };
}

export interface TenantBillingProfile {
  fullName?:   string | null;
  address?:    string | null;
  postalCode?: string | null;
  city?:       string | null;
  country?:    string | null;
  email?:      string | null;
  phone?:      string | null;
  iban?:       string | null;
}

// --- Inconvenientes (Issues) -----------------------------------------------

export interface Issue {
  id:            string;
  tenantId:      string;
  contractId:    string;
  title:         string;
  description:   string | null;
  isBillable:    boolean;
  internalFault: boolean;
  openedAt:      string;
  closedAt:      string | null;
  createdAt:     string;
  updatedAt:     string;
  _count?: { timeEntries: number; varCosts: number };
}

// --- Dashboard --------------------------------------------------------------

export type CostingMode = 'ABSORPTION' | 'CONTRIBUTION';

export interface BusinessMetrics {
  realHourlyCost:    number | null;
  minimumRate:       number | null;
  overheadPerHour:   number;
  directCostPerHour: number;
  utilizationPct:    number;
  capacityHours:     number;
  isReliable:        boolean;
  unreliableReason:  string | null;
}

export interface ProjectMetrics {
  id:              string;
  name:            string;
  clientName:      string | null;
  revenue:         number;
  directCost:      number;
  indirectCost:    number;
  netMargin:       number;
  profitabilityPct:number;
}

export interface CollectionsHealth {
  /** DSO global = días promedio entre creación de pago y cobro. null si aún no hay pagos PAID. */
  dsoGlobalDays:    number | null;
  invoicesPaid:     number;
  slowestClients:   Array<{
    clientId:     string;
    name:         string;
    avgDays:      number;
    invoicesPaid: number;
  }>;
  pendingByAge: {
    d0_30:    number;
    d30_60:   number;
    d60_90:   number;
    d90_plus: number;
  };
  totalPendingGross: number;
  totalPendingNet:   number;
}

export type DashboardRangeKey = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DashboardSummary {
  activeProjectCount:     number;
  activeContractCount?:   number;
  totalFixedCostsMonthly: number;
  totalBillableHours:     number;
  recurringRevenue?:      number;
  monthsInRange?:         number;
  range?: {
    from:   string;
    to:     string;
    period: DashboardRangeKey;
  };
  monthRange: {
    from: string;
    to:   string;
  };
}

export interface DashboardContract {
  id:               string;
  projectId:        string;
  projectName:      string;
  clientId:         string;
  clientName:       string;
  tier:             ContractTier;
  billingMode:      ExtendedBillingMode;
  status:           ContractStatus;
  price:            number;
  revenue:          number;
  netMargin:        number;
  profitabilityPct: number;
}

export interface DashboardData {
  business:  BusinessMetrics;
  projects:  ProjectMetrics[];
  contracts?: DashboardContract[];
  summary:   DashboardSummary;
}

export interface DashboardProjection {
  months:              number;
  mrr:                 number;
  monthlyCosts:        number;
  projectedRevenue:    number;
  projectedCosts:      number;
  projectedProfit:     number;
  activeSubscriptions: number;
  avgRevenuePerSub:    number;
}

export interface ApiResponse<T> {
  success: boolean;
  data:    T;
}
