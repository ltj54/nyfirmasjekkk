export type InvoiceRegisterRecord = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  deliveryDate: string;
  deliveryPlace: string;
  customerName: string;
  customerAddress: string;
  customerOrgNumber: string;
  customerEmail: string;
  description: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  issuedAt: string;
  previousHash: string;
  hash: string;
};

export type InvoiceRegisterStatus = {
  ready: boolean;
  nextInvoiceNumber: string;
  issuedCount: number;
  firstAutomaticNumber: string;
  records: InvoiceRegisterRecord[];
};

export type IssueInvoiceInput = {
  customerName: string;
  customerAddress: string;
  customerOrgNumber: string;
  customerEmail: string;
  description: string;
  deliveryDate: string;
  deliveryPlace: string;
  amount: number;
};

export function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function validIssueInvoiceInput(value: unknown): value is IssueInvoiceInput {
  if (typeof value !== "object" || value === null) return false;
  const input = value as Partial<IssueInvoiceInput>;
  return typeof input.customerName === "string" && input.customerName.trim().length >= 2 && input.customerName.length <= 160
    && typeof input.customerAddress === "string" && input.customerAddress.trim().length >= 5 && input.customerAddress.length <= 300
    && typeof input.customerOrgNumber === "string" && input.customerOrgNumber.length <= 30
    && typeof input.customerEmail === "string" && input.customerEmail.length <= 160
    && typeof input.description === "string" && input.description.trim().length >= 3 && input.description.length <= 500
    && typeof input.deliveryDate === "string" && validIsoDate(input.deliveryDate)
    && typeof input.deliveryPlace === "string" && input.deliveryPlace.trim().length >= 2 && input.deliveryPlace.length <= 160
    && typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount > 0 && input.amount <= 10_000_000;
}

