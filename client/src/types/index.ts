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
}

export interface AuthTenant {
  id:   string;
  name: string;
  slug: string;
}

/** Respuesta directa de /api/auth/login y /api/auth/register */
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

export type BillingMode = 'FIXED' | 'HOURLY' | 'HYBRID';

export interface Project {
  id:             string;
  tenantId:       string;
  clientName:     string | null;
  clientTaxId:    string | null;
  name:           string;
  description:    string | null;
  status:         ProjectStatus;
  billingMode:    BillingMode;
  budgetHours:    number | null;
  budgetAmount:   string | null;   // Prisma Decimal → string en JSON
  hourlyRate:     string | null;   // Prisma Decimal → string en JSON
  partsMarkupPct: string | null;   // Prisma Decimal → string en JSON
  startDate:      string | null;
  endDate:        string | null;
  createdAt:      string;
  updatedAt:      string;
  _count?: {
    timeEntries: number;
    varCosts:    number;
  };
}

// --- Time Entries -----------------------------------------------------------

export interface TimeEntry {
  id:          string;
  tenantId:    string;
  userId:      string;
  projectId:   string;
  description: string | null;
  startedAt:   string;
  endedAt:     string | null;
  durationMin: number;
  isBillable:  boolean;
  user?:    { id: string; fullName: string };
  project?: { id: string; name: string };
}

// --- Costes Fijos -----------------------------------------------------------

export type CostFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface FixedCost {
  id:        string;
  tenantId:  string;
  name:      string;
  amount:    string;          // Prisma Decimal → string en JSON
  frequency: CostFrequency;
  category:  string | null;
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Costes Variables -------------------------------------------------------

export interface VarCost {
  id:               string;
  tenantId:         string;
  projectId:        string | null;
  name:             string;
  amount:           string;          // Prisma Decimal → string en JSON
  quantity:         string;          // Decimal → string
  priceIncludesVat: boolean;
  vatRate:          string;          // Decimal → string
  markupPct:        string | null;   // Decimal → string (nullable)
  date:             string;
  category:         string | null;
  project?:         { id: string; name: string } | null;
}

// --- Dashboard --------------------------------------------------------------

export interface BusinessMetrics {
  realHourlyCost: number;
  minimumRate:    number;
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

export interface DashboardSummary {
  activeProjectCount:     number;
  totalFixedCostsMonthly: number;
  totalBillableHours:     number;
  monthRange: {
    from: string;
    to:   string;
  };
}

export interface DashboardData {
  business: BusinessMetrics;
  projects: ProjectMetrics[];
  summary:  DashboardSummary;
}

/** Respuesta envuelta de /api/v1/dashboard */
export interface ApiResponse<T> {
  success: boolean;
  data:    T;
}
