import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

export type SwedishOutreachRecord = {
  id: string;
  companyName: string;
  companyType: "E" | "AB";
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
  recordedAt: string;
};

export type SwedishOutreachInput = Omit<SwedishOutreachRecord, "id" | "recordedAt"> & {
  requestId: string;
  confirmedSent: true;
};

const defaultLogPath = path.resolve(process.cwd(), "..", "data", "scb", "swedish-outreach-log.jsonl");

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`Oppgi ${label}.`);
  const text = value.trim();
  if (!text || text.length > maxLength || text.includes("\0")) throw new Error(`Ugyldig ${label}.`);
  return text;
}

function isUuid(value: string): boolean {
  const parts = value.toLowerCase().split("-");
  const lengths = [8, 4, 4, 4, 12];
  return parts.length === lengths.length && parts.every((part, index) =>
    part.length === lengths[index] && Array.from(part).every((character) => "0123456789abcdef".includes(character)));
}

export function validateSwedishOutreachInput(value: unknown): SwedishOutreachInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ugyldig kontaktregistrering.");
  const row = value as Record<string, unknown>;
  const requestId = requiredText(row.requestId, "forespørsels-ID", 36);
  if (!isUuid(requestId)) {
    throw new Error("Ugyldig forespørsels-ID.");
  }
  if (row.confirmedSent !== true) throw new Error("Bekreft at e-posten allerede er sendt.");
  if (row.companyType !== "E" && row.companyType !== "AB") throw new Error("Ugyldig virksomhetstype.");
  const companyName = requiredText(row.companyName, "virksomhetsnavn", 250);
  const recipient = requiredText(row.recipient, "mottaker", 320);
  const at = recipient.indexOf("@");
  const domain = recipient.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const containsWhitespace = Array.from(recipient).some((character) => character.trim().length === 0);
  if (at < 1 || at !== recipient.lastIndexOf("@") || dot < 1 || dot === domain.length - 1 || containsWhitespace) {
    throw new Error("Ugyldig e-postadresse.");
  }
  const subject = requiredText(row.subject, "emne", 500);
  const body = requiredText(row.body, "e-posttekst", 20_000);
  const sentAt = requiredText(row.sentAt, "sendetidspunkt", 40);
  const sentTime = Date.parse(sentAt);
  if (!Number.isFinite(sentTime) || new Date(sentTime).toISOString() !== sentAt
    || sentTime > Date.now() + 60_000) throw new Error("Ugyldig sendetidspunkt.");
  return { requestId, confirmedSent: true, companyName, companyType: row.companyType,
    recipient, subject, body, sentAt };
}

export async function readSwedishOutreachLog(file = defaultLogPath): Promise<SwedishOutreachRecord[]> {
  let content: string;
  try {
    content = await readFile(/* turbopackIgnore: true */ file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return content.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line) as SwedishOutreachRecord);
}

export async function recordSwedishOutreach(value: unknown, file = defaultLogPath): Promise<SwedishOutreachRecord> {
  const input = validateSwedishOutreachInput(value);
  const existing = (await readSwedishOutreachLog(file)).find((entry) => entry.id === input.requestId);
  if (existing) {
    if (existing.companyName !== input.companyName || existing.companyType !== input.companyType
      || existing.recipient !== input.recipient || existing.subject !== input.subject
      || existing.body !== input.body || existing.sentAt !== input.sentAt) {
      throw new Error("Ugyldig forespørsel: ID er allerede brukt for en annen registrering.");
    }
    return existing;
  }
  const record: SwedishOutreachRecord = {
    id: input.requestId, companyName: input.companyName, companyType: input.companyType,
    recipient: input.recipient, subject: input.subject, body: input.body,
    sentAt: input.sentAt, recordedAt: new Date().toISOString(),
  };
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}
