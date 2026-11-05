import "server-only";

import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { InvoiceRegisterRecord, InvoiceRegisterStatus, IssueInvoiceInput } from "@/lib/invoice-register";

const registerFile = path.resolve(process.cwd(), "..", "data", "invoice-register.jsonl");
const FIRST_AUTOMATIC_NUMBER = "2026-006";
const LEGACY_REGISTER_HASH = "legacy-2026-001-to-2026-005";
const LEGACY_LAST_SEQUENCE_BY_YEAR = new Map([[2026, 5]]);
const LINE_FEED = String.fromCodePoint(10);
const CARRIAGE_RETURN = String.fromCodePoint(13);
let pendingIssue: Promise<unknown> = Promise.resolve();

function osloDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(isoDate + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function readInvoiceRegister(): Promise<InvoiceRegisterRecord[]> {
  try {
    const content = await readFile(registerFile, "utf8");
    return content
      .split(LINE_FEED)
      .map((line) => line.endsWith(CARRIAGE_RETURN) ? line.slice(0, -1) : line)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as InvoiceRegisterRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function nextInvoiceNumber(records: InvoiceRegisterRecord[], today = osloDate()): string {
  const year = Number(today.slice(0, 4));
  const registeredSequences = records
    .map((record) => invoiceSequenceForYear(record.invoiceNumber, year))
    .filter((sequence): sequence is number => sequence !== null);
  const lastSequence = Math.max(LEGACY_LAST_SEQUENCE_BY_YEAR.get(year) ?? 0, ...registeredSequences);
  return `${year}-${String(lastSequence + 1).padStart(3, "0")}`;
}

function invoiceSequenceForYear(invoiceNumber: string, year: number): number | null {
  const parts = invoiceNumber.split("-");
  if (parts.length !== 2 || parts[0] !== String(year) || parts[1].length === 0) return null;
  if (![...parts[1]].every((character) => character >= "0" && character <= "9")) return null;
  return Number(parts[1]);
}

export async function invoiceRegisterStatus(): Promise<InvoiceRegisterStatus> {
  const records = await readInvoiceRegister();
  return {
    ready: registerIntegrityValid(records),
    nextInvoiceNumber: nextInvoiceNumber(records),
    issuedCount: records.length,
    firstAutomaticNumber: FIRST_AUTOMATIC_NUMBER,
    records,
  };
}

function recordHash(record: Omit<InvoiceRegisterRecord, "hash">): string {
  return createHash("sha256").update(JSON.stringify(record), "utf8").digest("hex");
}

function registerIntegrityValid(records: InvoiceRegisterRecord[]): boolean {
  let expectedPreviousHash = LEGACY_REGISTER_HASH;
  for (const record of records) {
    const { hash, ...content } = record;
    if (content.previousHash !== expectedPreviousHash || recordHash(content) !== hash) return false;
    expectedPreviousHash = hash;
  }
  return true;
}

async function appendIssuedInvoice(input: IssueInvoiceInput): Promise<InvoiceRegisterRecord> {
  const records = await readInvoiceRegister();
  if (!registerIntegrityValid(records)) throw new Error("Fakturaregisterets kontrollkjede er brutt.");
  const invoiceDate = osloDate();
  const draft: Omit<InvoiceRegisterRecord, "hash"> = {
    invoiceNumber: nextInvoiceNumber(records, invoiceDate),
    invoiceDate,
    dueDate: addDays(invoiceDate, 14),
    deliveryDate: input.deliveryDate,
    deliveryPlace: input.deliveryPlace.trim(),
    customerName: input.customerName.trim(),
    customerAddress: input.customerAddress.trim(),
    customerOrgNumber: input.customerOrgNumber.trim(),
    customerEmail: input.customerEmail.trim(),
    description: input.description.trim(),
    amount: input.amount,
    vatAmount: 0,
    totalAmount: input.amount,
    issuedAt: new Date().toISOString(),
    previousHash: records.at(-1)?.hash ?? LEGACY_REGISTER_HASH,
  };
  const record = { ...draft, hash: recordHash(draft) };
  await mkdir(path.dirname(registerFile), { recursive: true });
  await appendFile(registerFile, JSON.stringify(record) + LINE_FEED, { encoding: "utf8", flag: "a" });
  return record;
}

export function issueInvoice(input: IssueInvoiceInput): Promise<InvoiceRegisterRecord> {
  const operation = pendingIssue.then(() => appendIssuedInvoice(input));
  pendingIssue = operation.then(() => undefined, () => undefined);
  return operation;
}

export async function findIssuedInvoice(invoiceNumber: string): Promise<InvoiceRegisterRecord | undefined> {
  const records = await readInvoiceRegister();
  return records.find((record) => record.invoiceNumber === invoiceNumber);
}

