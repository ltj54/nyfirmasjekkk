import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  defaultEnkComplianceState,
  isComplianceStatus,
  validIsoDate,
  type ComplianceTaskId,
  type ComplianceTaskState,
  type EnkComplianceState,
} from "@/lib/enk-compliance";
import { isLocalApiRequest } from "@/lib/local-api-access";

export const runtime = "nodejs";

const stateFile = path.resolve(process.cwd(), "..", "data", "enk-compliance.json");
const taskIds: ComplianceTaskId[] = [
  "invoice_system",
  "website_information",
  "advance_tax_2026_q4",
  "tax_return_2026",
];
let pendingWrite: Promise<void> = Promise.resolve();

async function readState(): Promise<EnkComplianceState> {
  try {
    return JSON.parse(await readFile(stateFile, "utf8")) as EnkComplianceState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return defaultEnkComplianceState();
    throw error;
  }
}

function validOptionalDate(value: unknown): value is string {
  return value === "" || validIsoDate(value);
}

function validNullableAmount(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100_000_000);
}

function validTask(value: unknown): value is ComplianceTaskState {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Partial<ComplianceTaskState>;
  return isComplianceStatus(task.status)
    && validOptionalDate(task.completedDate)
    && typeof task.note === "string" && task.note.length <= 500;
}

function validState(value: unknown): value is EnkComplianceState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<EnkComplianceState>;
  if (state.version !== 1
    || typeof state.vatRegistered !== "boolean"
    || !validOptionalDate(state.vatRegistrationDate)
    || typeof state.hasEmployees !== "boolean"
    || typeof state.hasCashSales !== "boolean"
    || typeof state.hasAnnualAccountsObligation !== "boolean"
    || !validNullableAmount(state.expectedAnnualProfit)
    || !validNullableAmount(state.taxReserved)
    || !validOptionalDate(state.lastBookkeepingReconciled)
    || typeof state.tasks !== "object" || state.tasks === null) return false;
  return taskIds.every((taskId) => validTask(state.tasks?.[taskId]));
}

function localRequest(request: Request): boolean {
  return isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"));
}

export async function GET(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: "ENK-oversikten er kun tilgjengelig lokalt." }, { status: 403 });
  try {
    return NextResponse.json({ state: await readState() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read ENK compliance state", error);
    return NextResponse.json({ error: "Kunne ikke lese ENK-oversikten." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: "ENK-endringer krever en lokal forespørsel." }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (!validState(body)) return NextResponse.json({ error: "Ugyldige ENK-opplysninger." }, { status: 400 });

  const state: EnkComplianceState = { ...body, updatedAt: new Date().toISOString() };
  const save = pendingWrite.then(async () => {
    await mkdir(path.dirname(stateFile), { recursive: true });
    const temporaryFile = `${stateFile}.tmp`;
    await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryFile, stateFile);
  });
  pendingWrite = save.then(() => undefined, () => undefined);
  try {
    await save;
    return NextResponse.json({ state });
  } catch (error) {
    console.error("Failed to save ENK compliance state", error);
    return NextResponse.json({ error: "Kunne ikke lagre ENK-oversikten." }, { status: 500 });
  }
}
