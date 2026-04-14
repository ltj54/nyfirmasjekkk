export type TrafficLight = "GREEN" | "YELLOW" | "RED";
export type ScoreColor = "GREEN" | "YELLOW" | "RED";

export interface CompanySummary {
  orgNumber: string;
  name: string;
  organizationFormCode: string | null;
  registrationDate: string | null;
  municipality: string | null;
  county: string | null;
  naceCode: string | null;
  naceDescription: string | null;
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

export interface CompanyDetails extends CompanySummary {
  status: string;
  address: string | null;
  postalCode: string | null;
  postalPlace: string | null;
  hjemmeside: string | null;
  score: {
    orgNumber: string;
    scoreColor: ScoreColor;
    scoreLabel: string;
    scoreReasons: string[];
    rules: string[];
  };
  roles: Array<{
    type: string;
    name: string;
    title: string | null;
  }>;
  announcements: Array<{
    type: string;
    description: string;
    date: string | null;
    source: string;
  }>;
}

export interface CompanyFacts {
  organisasjonsform: string | null;
  registreringsdato: string | null;
  modenhet: string | null;
  naeringskode: string | null;
  aktivitet: string | null;
  hjemmeside: string | null;
  epostadresse: string | null;
  telefon: string | null;
  harKontaktdata: boolean;
  harRoller: boolean;
  harAlvorligeSignal: boolean;
}

export interface CompanyMetrics {
  gronneFunn: number;
  guleFunn: number;
  rodeFunn: number;
}

export interface CheckFinding {
  severity: TrafficLight;
  label: string;
  detail: string;
}

export interface CompanyCheck {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform: string | null;
  status: TrafficLight;
  sammendrag: string;
  fakta?: CompanyFacts;
  statistikk?: CompanyMetrics;
  funn: CheckFinding[];
  kilder: string[];
  begrensninger: string[];
}
