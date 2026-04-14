export type TrafficLight = "GREEN" | "YELLOW" | "RED";

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
