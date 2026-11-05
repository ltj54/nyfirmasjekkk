export type ComplianceStatus = "open" | "completed" | "not_applicable";

export type ComplianceTaskId =
  | "invoice_system"
  | "website_information"
  | "advance_tax_2026_q4"
  | "tax_return_2026";

export type ComplianceTaskState = {
  status: ComplianceStatus;
  completedDate: string;
  note: string;
};

export type EnkComplianceState = {
  version: 1;
  vatRegistered: boolean;
  vatRegistrationDate: string;
  hasEmployees: boolean;
  hasCashSales: boolean;
  hasAnnualAccountsObligation: boolean;
  expectedAnnualProfit: number | null;
  taxReserved: number | null;
  lastBookkeepingReconciled: string;
  tasks: Record<ComplianceTaskId, ComplianceTaskState>;
  updatedAt: string | null;
};

export type ComplianceInvoice = {
  number: string;
  amount: number;
  invoiceDate?: string;
  paymentDate?: string;
};

export const VAT_REGISTRATION_THRESHOLD = 50_000;
export const TAX_RESERVE_GUIDANCE_RATE = 0.4;

const emptyTask = (): ComplianceTaskState => ({ status: "open", completedDate: "", note: "" });

export function defaultEnkComplianceState(): EnkComplianceState {
  return {
    version: 1,
    vatRegistered: false,
    vatRegistrationDate: "",
    hasEmployees: false,
    hasCashSales: false,
    hasAnnualAccountsObligation: false,
    expectedAnnualProfit: null,
    taxReserved: null,
    lastBookkeepingReconciled: "",
    tasks: {
      invoice_system: emptyTask(),
      website_information: emptyTask(),
      advance_tax_2026_q4: emptyTask(),
      tax_return_2026: emptyTask(),
    },
    updatedAt: null,
  };
}

export function crmInvoiceTurnover(invoices: ComplianceInvoice[]): number {
  return invoices.reduce((total, invoice) => total + invoice.amount, 0);
}

export function missingInvoiceDates(invoices: ComplianceInvoice[]): number {
  return invoices.filter((invoice) => !invoice.invoiceDate).length;
}

export function invoiceNumbersAreSequential(invoices: ComplianceInvoice[]): boolean {
  const parsed = invoices.map((invoice) => /^(\d{4})-(\d{3,})$/.exec(invoice.number))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({ year: Number(match[1]), sequence: Number(match[2]) }))
    .sort((first, second) => first.year - second.year || first.sequence - second.sequence);
  if (parsed.length !== invoices.length || parsed.length < 2) return parsed.length === invoices.length;
  return parsed.every((entry, index) => index === 0
    || (entry.year === parsed[index - 1].year && entry.sequence === parsed[index - 1].sequence + 1));
}

export function validIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isComplianceStatus(value: unknown): value is ComplianceStatus {
  return value === "open" || value === "completed" || value === "not_applicable";
}

