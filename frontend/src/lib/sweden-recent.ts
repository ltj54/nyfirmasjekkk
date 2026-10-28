import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import csvParser from "csv-parser";
import unzipper from "unzipper";

const BULK_URL = "https://vardefulla-datamangder.bolagsverket.se/bolagsverket/bolagsverket_bulkfil.zip";
const MAX_DOWNLOAD_BYTES = 400_000_000;

export type SwedishRecentCompany = {
  id: string;
  orgNumber: string;
  name: string;
  registrationDate: string;
  businessDescription: string;
  postalCity: string;
};

export type SwedishRecentResult = {
  companies: SwedishRecentCompany[];
  soleProprietorships: SwedishRecentSoleProprietorship[];
  fetchedAt: string;
  cutoffDate: string;
  sourceFileModifiedAt: string;
};

export type SwedishRecentSoleProprietorship = {
  id: string;
  name: string;
  registrationDate: string;
  businessDescription: string;
  postalCity: string;
};

type RecentCache = SwedishRecentResult & { archiveSize: number };

function dataPaths() {
  const directory = path.resolve(process.cwd(), "..", "data", "scb");
  return {
    directory,
    archive: path.join(directory, "bolagsverket_bulkfil.zip"),
    partialArchive: path.join(directory, "bolagsverket_bulkfil.zip.part"),
    cache: path.join(directory, "recent-companies.json"),
  };
}

async function downloadBulkFile(archive: string, partialArchive: string) {
  const response = await fetch(BULK_URL, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(300_000) });
  if (!response.ok || !response.body) throw new Error(`Bolagsverket svarte med HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("Bolagsverkets bulkfil hadde en uventet størrelse.");
  }
  try {
    await pipeline(Readable.from(response.body as AsyncIterable<Uint8Array>), createWriteStream(partialArchive, { flags: "wx" }));
  } catch (error) {
    await unlink(partialArchive).catch(() => undefined);
    throw error;
  }
  const downloaded = await stat(partialArchive);
  if (downloaded.size !== contentLength) {
    await unlink(partialArchive).catch(() => undefined);
    throw new Error("Nedlastingen av Bolagsverkets bulkfil ble ikke komplett.");
  }
  try {
    await rename(partialArchive, archive);
  } catch (error) {
    await unlink(partialArchive).catch(() => undefined);
    throw error;
  }
}

export async function ensureSwedishBulkFile(): Promise<{ archive: string; modifiedAt: string }> {
  const paths = dataPaths();
  await mkdir(paths.directory, { recursive: true });
  let file;
  try {
    file = await stat(/* turbopackIgnore: true */ paths.archive);
  } catch {
    await downloadBulkFile(paths.archive, paths.partialArchive);
    file = await stat(/* turbopackIgnore: true */ paths.archive);
  }
  return { archive: paths.archive, modifiedAt: file.mtime.toISOString() };
}

function plainValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function beforeMarker(value: unknown): string {
  return plainValue(value).split("$", 1)[0].trim();
}

function validIsoDate(value: unknown): string | null {
  const date = plainValue(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00Z`);
  return parsed.toISOString().slice(0, 10) === date ? date : null;
}

function postalCity(value: unknown): string {
  const parts = plainValue(value).split("$");
  return parts.length >= 3 ? parts[2].trim() : "";
}

export async function scanRecentSwedishCompanies(archive: string, cutoffDate: string): Promise<Pick<SwedishRecentResult, "companies" | "soleProprietorships">> {
  const directory = await unzipper.Open.file(archive);
  const entry = directory.files.find((file) => file.type === "File" && file.path.endsWith(".txt"));
  if (!entry) throw new Error("Bolagsverkets arkiv mangler den forventede datafilen.");
  const parser = entry.stream().pipe(csvParser({
    separator: ";",
    mapHeaders: ({ header }) => header.replace(/^\uFEFF/, ""),
  }));
  const companies: SwedishRecentCompany[] = [];
  const soleProprietorships: SwedishRecentSoleProprietorship[] = [];
  for await (const rawRow of parser) {
    const row = rawRow as Record<string, unknown>;
    const registrationDate = validIsoDate(row.registreringsdatum);
    if (!registrationDate || registrationDate < cutoffDate) continue;
    const form = plainValue(row.organisationsform);
    if (form !== "AB-ORGFO" && form !== "E-ORGFO") continue;
    const name = beforeMarker(row.organisationsnamn);
    if (!name) continue;
    if (form === "E-ORGFO") {
      soleProprietorships.push({
        id: `E:${soleProprietorships.length + 1}`,
        name,
        registrationDate,
        businessDescription: plainValue(row.verksamhetsbeskrivning),
        postalCity: postalCity(row.postadress),
      });
      continue;
    }
    const orgNumber = beforeMarker(row.organisationsidentitet);
    if (!/^\d{10}$/.test(orgNumber)) continue;
    companies.push({
      id: `SE:${orgNumber}`,
      orgNumber,
      name,
      registrationDate,
      businessDescription: plainValue(row.verksamhetsbeskrivning),
      postalCity: postalCity(row.postadress),
    });
  }
  const newestFirst = (left: { registrationDate: string; name: string }, right: { registrationDate: string; name: string }) =>
    right.registrationDate.localeCompare(left.registrationDate) || left.name.localeCompare(right.name, "sv");
  return { companies: companies.toSorted(newestFirst), soleProprietorships: soleProprietorships.toSorted(newestFirst) };
}

export function sevenDayCutoff(now = new Date()): string {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  return cutoff.toISOString().slice(0, 10);
}

export async function loadRecentSwedishCompanies(now = new Date()): Promise<SwedishRecentResult> {
  const paths = dataPaths();
  const source = await ensureSwedishBulkFile();
  const sourceStat = await stat(/* turbopackIgnore: true */ source.archive);
  const cutoffDate = sevenDayCutoff(now);
  try {
    const cached = JSON.parse(await readFile(/* turbopackIgnore: true */ paths.cache, "utf8")) as RecentCache;
    if (cached.cutoffDate === cutoffDate
      && cached.sourceFileModifiedAt === source.modifiedAt
      && cached.archiveSize === sourceStat.size
      && Array.isArray(cached.companies)
      && Array.isArray(cached.soleProprietorships)) {
      return cached;
    }
  } catch {
    // A missing or stale cache is rebuilt from the local official bulk file.
  }
  const records = await scanRecentSwedishCompanies(source.archive, cutoffDate);
  const result: RecentCache = {
    ...records,
    cutoffDate,
    sourceFileModifiedAt: source.modifiedAt,
    fetchedAt: now.toISOString(),
    archiveSize: sourceStat.size,
  };
  await writeFile(/* turbopackIgnore: true */ paths.cache, JSON.stringify(result), { encoding: "utf8", flag: "w" });
  return result;
}
