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
  vatRegistered: boolean | null;
  registeredInBusinessRegistry: boolean | null;
  scoreColor: ScoreColor;
  scoreReasons: string[];
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
}

export interface CompanyDetails extends CompanySummary {
  status: string;
  address: string | null;
  postalCode: string | null;
  postalPlace: string | null;
  foundationDate: string | null;
  website: string | null;
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
  };
  roles: Array<{
    type: string;
    name: string;
    title: string | null;
  }>;
  announcements: Announcement[];
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
  lastSeenAt: string;
}

export interface NetworkActor {
  actorKey: string;
  actorName: string;
  roleTypesInSelectedCompany: string[];
  riskLevel: ScoreColor;
  totalCompanyCount: number;
  redCompanyCount: number;
  yellowCompanyCount: number;
  greenCompanyCount: number;
  relatedCompanies: NetworkCompanyLink[];
}
