import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { isoDateFromNorwegian, osloToday, type CrmEventRecord, validNorwegianDate } from "@/lib/crm-events";
import { isLocalApiRequest } from "@/lib/local-api-access";

export const runtime = "nodejs";

const eventFile = path.resolve(process.cwd(), "..", "data", "crm-events.jsonl");
const existingInvoiceNumbers = new Set(["2026-001", "2026-002", "2026-003", "2026-004"]);
const outstandingExistingProjects = new Set(["938423334"]);
let pendingWrite: Promise<void> = Promise.resolve();

async function readEvents(): Promise<CrmEventRecord[]> {
  try {
    const content = await readFile(eventFile, "utf8");
    return content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as CrmEventRecord);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function validEvent(value: unknown): value is Omit<CrmEventRecord, "recordedAt"> {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<CrmEventRecord>;
  if (typeof event.projectId !== "string" || !/^[a-z0-9-]{3,80}$/.test(event.projectId)) return false;
  if (!validNorwegianDate(event.date)) return false;
  if (isoDateFromNorwegian(event.date) > osloToday()) return false;
  if (event.kind === "delivery_confirmed" || event.kind === "payment_received") return true;
  return event.kind === "invoice_sent"
    && typeof event.invoiceNumber === "string" && /^\d{4}-\d{3,}$/.test(event.invoiceNumber)
    && typeof event.invoiceAmount === "number" && Number.isFinite(event.invoiceAmount) && event.invoiceAmount > 0
    && validNorwegianDate(event.dueDate)
    && isoDateFromNorwegian(event.dueDate) >= isoDateFromNorwegian(event.date);
}

export async function GET(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return NextResponse.json({ error: "CRM er kun tilgjengelig lokalt." }, { status: 403 });
  }
  try {
    return NextResponse.json({ events: await readEvents() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read CRM events", error);
    return NextResponse.json({ error: "Kunne ikke lese CRM-loggen." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return NextResponse.json({ error: "CRM-endringer krever en lokal forespørsel fra appen." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (!validEvent(body)) return NextResponse.json({ error: "Ugyldige CRM-opplysninger." }, { status: 400 });

  const submitted = body;
  const save = pendingWrite.then(async () => {
    const events = await readEvents();
    const projectEvents = events.filter((event) => event.projectId === submitted.projectId);
    if (submitted.kind === "invoice_sent" && projectEvents.some((event) => event.kind === "invoice_sent")) {
      throw new Error("Faktura er allerede registrert som sendt for dette prosjektet.");
    }
    if (submitted.kind === "invoice_sent" && (existingInvoiceNumbers.has(submitted.invoiceNumber!)
      || events.some((event) => event.kind === "invoice_sent" && event.invoiceNumber === submitted.invoiceNumber))) {
      throw new Error("Fakturanummeret er allerede registrert.");
    }
    if (submitted.kind === "payment_received" && projectEvents.some((event) => event.kind === "payment_received")) {
      throw new Error("Betaling er allerede registrert for dette prosjektet.");
    }
    if (submitted.kind === "payment_received" && !outstandingExistingProjects.has(submitted.projectId)
      && !projectEvents.some((event) => event.kind === "invoice_sent")) {
      throw new Error("En sendt faktura må være registrert før betaling kan registreres.");
    }
    if (submitted.kind === "delivery_confirmed" && projectEvents.some((event) => event.kind === "delivery_confirmed")) {
      throw new Error("Leveransen er allerede registrert som ferdig.");
    }
    const record: CrmEventRecord = {
      projectId: submitted.projectId,
      kind: submitted.kind,
      date: submitted.date,
      recordedAt: new Date().toISOString(),
      ...(submitted.kind === "invoice_sent" ? {
        invoiceNumber: submitted.invoiceNumber,
        invoiceAmount: submitted.invoiceAmount,
        dueDate: submitted.dueDate,
      } : {}),
    };
    await mkdir(path.dirname(eventFile), { recursive: true });
    await appendFile(eventFile, `${JSON.stringify(record)}\n`, "utf8");
    return record;
  });
  pendingWrite = save.then(() => undefined, () => undefined);
  try {
    return NextResponse.json({ event: await save }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("allerede registrert")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to save CRM event", error);
    return NextResponse.json({ error: "Kunne ikke lagre CRM-hendelsen." }, { status: 500 });
  }
}
