export type CrmEventKind = "delivery_confirmed" | "invoice_sent" | "payment_received";

export type CrmEventRecord = {
  projectId: string;
  kind: CrmEventKind;
  date: string;
  recordedAt: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  dueDate?: string;
};

export function crmProjectId(name: string, organizationNumber?: string): string {
  if (organizationNumber) return organizationNumber.replace(/\D/g, "");
  return name.toLocaleLowerCase("nb").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function validNorwegianDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split(".").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function norwegianDateFromIso(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

export function isoDateFromNorwegian(value: string): string {
  const [day, month, year] = value.split(".");
  return `${year}-${month}-${day}`;
}

export function osloToday(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
