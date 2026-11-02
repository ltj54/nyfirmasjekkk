import { readFile } from "node:fs/promises";
import path from "node:path";

import { isLocalApiRequest } from "@/lib/local-api-access";
import type { PreparedSwedishRecentResult } from "@/lib/sweden-prepared";
import { discoverSwedishWebsiteSuggestions } from "@/lib/sweden-website-suggestions";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = { ids?: unknown; cutoffDate?: unknown; sourceFileModifiedAt?: unknown };

function validIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 25
    && value.every((id) => typeof id === "string" && /^E:\d+$/.test(id))
    && new Set(value).size === value.length;
}

function preparedFile(): string {
  return path.resolve(process.cwd(), "..", "data", "scb", "prepared-recent.json");
}

export async function POST(request: Request) {
  if (!isLocalApiRequest(request.headers.get("host"), request.method, request.headers.get("origin"))) {
    return Response.json({ error: "Nettsidesøket må startes fra den lokale appen." }, { status: 403 });
  }
  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return Response.json({ error: "Ugyldig forespørsel." }, { status: 400 });
  }
  if (!validIds(body.ids) || typeof body.cutoffDate !== "string" || typeof body.sourceFileModifiedAt !== "string") {
    return Response.json({ error: "Velg 1–25 E-virksomheter fra listen." }, { status: 400 });
  }
  let prepared: PreparedSwedishRecentResult;
  try {
    prepared = JSON.parse(await readFile(preparedFile(), "utf8")) as PreparedSwedishRecentResult;
  } catch {
    return Response.json({ error: "Den klargjorte listen er ikke tilgjengelig. Hent den på nytt." }, { status: 409 });
  }
  if (prepared.cutoffDate !== body.cutoffDate || prepared.sourceFileModifiedAt !== body.sourceFileModifiedAt) {
    return Response.json({ error: "Listen er endret. Hent virksomhetene på nytt." }, { status: 409 });
  }
  const candidates = new Map(prepared.soleProprietorships.map((company) => [company.id, company]));
  const details = new Map(prepared.enrichment.soleProprietorships.map((company) => [company.id, company]));
  const selected: Array<{ id: string; name: string; email: string }> = [];
  for (const id of body.ids) {
    const candidate = candidates.get(id);
    const detail = details.get(id);
    if (!candidate || !detail?.email.trim()) {
      return Response.json({ error: "En E-virksomhet ble ikke funnet i den klargjorte listen. Hent den på nytt." }, { status: 409 });
    }
    selected.push({ id, name: candidate.name, email: detail.email });
  }
  const groups = Array.from({ length: Math.ceil(selected.length / 5) }, (_, index) =>
    selected.slice(index * 5, (index + 1) * 5));
  const entries = await groups.reduce<Promise<Array<readonly [string, Awaited<ReturnType<typeof discoverSwedishWebsiteSuggestions>>]>>>(
    async (pending, group) => [
      ...await pending,
      ...await Promise.all(group.map(async ({ id, name, email }) => [
        id,
        await discoverSwedishWebsiteSuggestions(name, email),
      ] as const)),
    ],
    Promise.resolve([]),
  );
  return Response.json({ websiteSuggestions: Object.fromEntries(entries) },
    { headers: { "Cache-Control": "no-store" } });
}
