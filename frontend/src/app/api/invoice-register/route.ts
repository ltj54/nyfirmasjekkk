import { NextResponse } from "next/server";

import { validIssueInvoiceInput } from "@/lib/invoice-register";
import { invoiceRegisterStatus, issueInvoice } from "@/lib/invoice-register-store";
import { isLocalApiRequest } from "@/lib/local-api-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localRequest(request: Request): boolean {
  return isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"));
}

export async function GET(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: "Fakturaregisteret er bare tilgjengelig lokalt." }, { status: 403 });
  try {
    const status = await invoiceRegisterStatus();
    if (new URL(request.url).searchParams.get("download") === "1") {
      return new NextResponse(status.records.map((record) => JSON.stringify(record)).join("\n") + "\n", {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="fakturaregister-${new Date().toISOString().slice(0, 10)}.jsonl"`,
          "Content-Type": "application/x-ndjson; charset=utf-8",
        },
      });
    }
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to read invoice register", error);
    return NextResponse.json({ error: "Kunne ikke lese fakturaregisteret." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!localRequest(request)) return NextResponse.json({ error: "Fakturaer kan bare utstedes lokalt." }, { status: 403 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (!validIssueInvoiceInput(input)) return NextResponse.json({ error: "Kontroller alle obligatoriske fakturaopplysninger." }, { status: 400 });
  try {
    const invoice = await issueInvoice(input);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Failed to issue invoice", error);
    return NextResponse.json({ error: "Fakturaen kunne ikke utstedes." }, { status: 500 });
  }
}

