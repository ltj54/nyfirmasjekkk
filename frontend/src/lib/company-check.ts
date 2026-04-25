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
  websiteDiscovery: WebsiteDiscovery | null;
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
}

export interface CompanyEvent {
  type: string;
  title: string;
  date: string | null;
  source: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
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
  registrationDate: string | null;
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
  lastRedSeenAt: string | null;
  lastBankruptcySeenAt: string | null;
  lastDissolvedSeenAt: string | null;
  relatedCompanies: NetworkCompanyLink[];
}

export interface StructureSignal {
  code: string;
  title: string;
  detail: string;
  severity: "HIGH" | "MEDIUM" | "INFO";
  source: string;
}

export interface WebsiteDiscovery {
  status: "REGISTERED" | "POSSIBLE_MATCH" | "NONE";
  confidence: "HIGH" | "LOW" | "MEDIUM";
  candidates: string[];
  verifiedCandidate: string | null;
  verifiedReachable: boolean | null;
  contentMatched: boolean | null;
  contentMatchReason: string | null;
  pageTitle: string | null;
  reason: string;
  source: string;
}

export interface OutreachStatus {
  orgNumber: string;
  sent: boolean;
  status: "sent" | "reverted" | "not_relevant" | null;
  companyName: string | null;
  price: number | null;
  channel: string | null;
  offerType: string | null;
  sentAt: string | null;
  note: string | null;
}
