import { readFile } from "node:fs/promises";
import path from "node:path";

import type { CrmManualCase } from "@/lib/crm-manual-cases";

export const runtime = "nodejs";

const caseDirectory = path.resolve(process.cwd(), "..", "data", "crm");

async function readCaseWithEmail(manualCase: CrmManualCase) {
  if (!/^[a-z0-9-]+\.txt$/.test(manualCase.sourceFile)) {
    throw new Error("Ugyldig kildefil for CRM-sak.");
  }
  const originalEmail = await readFile(path.join(caseDirectory, "manual-emails", manualCase.sourceFile), "utf8");
  return { ...manualCase, originalEmail };
}

export async function GET(request: Request) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) {
    return Response.json({ error: "Manuelle CRM-saker er kun tilgjengelige lokalt." }, { status: 403 });
  }
  try {
    const content = await readFile(path.join(caseDirectory, "manual-cases.json"), "utf8");
    const cases = JSON.parse(content) as CrmManualCase[];
    return Response.json({ cases: await Promise.all(cases.map((manualCase) => readCaseWithEmail(manualCase))) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Kunne ikke lese manuelle CRM-saker og original e-post." }, { status: 500 });
  }
}
