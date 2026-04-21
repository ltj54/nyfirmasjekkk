export type TrafficLight = "GREEN" | "YELLOW" | "RED";
export type ScoreColor = "GREEN" | "YELLOW" | "RED";

export interface CompanySummary {
  orgNumber: string;
  name: string;
  organizationForm: string | null;
  registrationDate: string | null;
  municipality: string | null;
  county: string | null;
  naceCode: string | null;
  naceDescription: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  contactPersonName: string | null;
  contactPersonRole: string | null;
  vatRegistered: boolean | null;
  registeredInBusinessRegistry: boolean | null;
  scoreColor: ScoreColor;
  scoreReasons: string[];
  events: CompanyEvent[];
  structureSignals: StructureSignal[];
  flags: string[];
}

export interface CompanySearchResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  items: CompanySummary[];
}

export interface MetadataFiltersResponse {
  organizationForms: string[];
  counties: string[];
  scores: ScoreColor[];
  structureSignals: string[];
}

export interface CompanyDetails extends CompanySummary {
  status: string;
  address: string | null;
  postalCode: string | null;
  postalPlace: string | null;
  foundationDate: string | null;
  vatRegistered: boolean | null;
  registeredInBusinessRegistry: boolean | null;
  employeeCount: number | null;
  employeeCountRegistered: boolean | null;
  latestAnnualAccountsYear: string | null;
  score: {
    orgNumber: string;
    color: ScoreColor;
    label: string;
    reasons: string[];
    rulesTriggered: string[];
    evidence: Array<{
      label: string;
      detail: string;
      source: string;
    }>;
  };
  roles: Array<{
    type: string;
    name: string;
    title: string | null;
  }>;
  events: CompanyEvent[];
  structureSignals: StructureSignal[];
  announcements: Announcement[];
}

export interface CompanyEvent {
  type: string;
  title: string;
  date: string | null;
  source: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
}

export interface Announcement {
  type: string;
  title: string;
  date: string | null;
  source: string;
}

export interface CompanyHistoryEntry {
  capturedAt: string;
  orgNumber: string;
  name: string;
  organizationForm: string | null;
  scoreColor: ScoreColor;
  summary: string;
  municipality: string | null;
  county: string | null;
  naceCode: string | null;
  latestAnnualAccountsYear: string | null;
  vatRegistered: boolean | null;
  registeredInBusinessRegistry: boolean | null;
  hasContactData: boolean | null;
  hasRoles: boolean | null;
  hasSeriousSignals: boolean | null;
  registrationDate: string | null;
}

export interface NetworkCompanyLink {
  orgNumber: string;
  companyName: string;
  roleTypes: string[];
  scoreColor: ScoreColor;
  bankruptcySignal: boolean;
  dissolvedSignal: boolean;
  lastSeenAt: string;
}

export interface NetworkActor {
  actorKey: string;
  actorName: string;
  roleTypesInSelectedCompany: string[];
  riskLevel: ScoreColor;
  totalCompanyCount: number;
  bankruptcyCompanyCount: number;
  redCompanyCount: number;
  dissolvedCompanyCount: number;
  yellowCompanyCount: number;
  greenCompanyCount: number;
  relatedCompanies: NetworkCompanyLink[];
}

export interface StructureSignal {
  code: string;
  title: string;
  detail: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
  source: string;
}
