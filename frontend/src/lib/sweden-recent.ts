import { createWriteStream, type Stats } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import csvParser from "csv-parser";
import unzipper from "unzipper";

const BULK_URL = "https://vardefulla-datamangder.bolagsverket.se/bolagsverket/bolagsverket_bulkfil.zip";
const MAX_DOWNLOAD_BYTES = 400_000_000;
const SOURCE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type SwedishRecentCompany = {
  id: string;
  orgNumber: string;
  name: string;
  registrationDate: string;
  businessDescription: string;
  postalCity: string;
  deregistrationDate: string | null;
  deregistrationReason: string;
  ongoingProceedings: SwedishProceeding[];
};

export type SwedishProceeding = { code: string; label: string; since: string | null };

const PROCEEDING_LABELS: Readonly<Record<string, string>> = {
  "AC-AVOMFO": "Akkordforhandling",
  "DEOL-AVOMFO": "Deling – overdragende selskap",
  "DEOT-AVOMFO": "Deling – overtakende selskap",
  "FR-AVOMFO": "Foretaksrekonstruksjon",
  "FUOL-AVOMFO": "Fusjon – overdragende selskap",
  "FUOT-AVOMFO": "Fusjon – overtakende selskap",
  "GROM-AVOMFO": "Grenseoverskridende omdanning",
  "KK-AVOMFO": "Konkurs",
  "LI-AVOMFO": "Likvidasjon",
  "OM-AVOMFO": "Omdanning",
  "RES-AVOMFO": "Resolusjon",
};

const DEREGISTRATION_LABELS: Readonly<Record<string, string>> = {
  "KKAV-AVORG": "Konkurs",
  "LIAV-AVORG": "Likvidasjon",
  "FUAV-AVORG": "Fusjon",
  "VERKUPP-AVORG": "Virksomheten har opphørt",
  "ARSEED-AVORG": "Årsregnskap mangler",
};

export type SwedishRecentResult = {
  companies: SwedishRecentCompany[];
  soleProprietorships: SwedishRecentSoleProprietorship[];
  fetchedAt: string;
  cutoffDate: string;
  sourceFileModifiedAt: string;
  sourceCheckedAt?: string;
  sourceWarning?: string;
};

export type SwedishRecentSoleProprietorship = {
  id: string;
  name: string;
  registrationDate: string;
  businessDescription: string;
  postalCity: string;
};

type RecentCache = SwedishRecentResult & { archiveSize: number; schemaVersion: number };
const RECENT_CACHE_SCHEMA_VERSION = 2;
type SourceCheck = { checkedAt: string; archiveSize: number };
type BulkFileOptions = { now?: Date; fetcher?: typeof fetch; directory?: string };

function dataPaths(directory = path.resolve(process.cwd(), "..", "data", "scb")) {
  return {
    directory,
    archive: path.join(directory, "bolagsverket_bulkfil.zip"),
    partialArchive: path.join(directory, "bolagsverket_bulkfil.zip.part"),
    cache: path.join(directory, "recent-companies.json"),
    sourceCheck: path.join(directory, "bulk-source-check.json"),
  };
}

async function downloadBulkFile(archive: string, partialArchive: string, fetcher: typeof fetch) {
  await unlink(partialArchive).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  const response = await fetcher(BULK_URL, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(300_000) });
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

async function readSourceCheck(file: string): Promise<SourceCheck | null> {
  try {
    const value = JSON.parse(await readFile(file, "utf8")) as Partial<SourceCheck>;
    if (typeof value.checkedAt === "string" && Number.isFinite(value.archiveSize)) {
      return { checkedAt: value.checkedAt, archiveSize: value.archiveSize as number };
    }
  } catch {
    // A missing or invalid marker forces a fresh source check.
  }
  return null;
}

function recentLocalSource(file: Stats | null, previousCheck: SourceCheck | null, now: Date, archive: string) {
  if (!file || !previousCheck || previousCheck.archiveSize !== file.size) return null;
  const elapsed = now.getTime() - Date.parse(previousCheck.checkedAt);
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed >= SOURCE_CHECK_INTERVAL_MS) return null;
  return { archive, modifiedAt: file.mtime.toISOString(), checkedAt: previousCheck.checkedAt };
}

export async function ensureSwedishBulkFile(options: BulkFileOptions = {}): Promise<{
  archive: string; modifiedAt: string; checkedAt: string; warning?: string;
}> {
  const paths = dataPaths(options.directory);
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetch;
  await mkdir(paths.directory, { recursive: true });
  let file = null;
  try {
    file = await stat(/* turbopackIgnore: true */ paths.archive);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const previousCheck = await readSourceCheck(paths.sourceCheck);
  const storedFileFallback = (storedFile: Stats) => ({
    archive: paths.archive,
    modifiedAt: storedFile.mtime.toISOString(),
    checkedAt: previousCheck?.checkedAt ?? storedFile.mtime.toISOString(),
    warning: "Kunne ikke bekrefte at Bolagsverkets fil er oppdatert. Viser sist lagrede fil.",
  });
  const recentSource = recentLocalSource(file, previousCheck, now, paths.archive);
  if (recentSource) return recentSource;

  try {
    if (file) {
      const response = await fetcher(BULK_URL, {
        method: "HEAD", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return storedFileFallback(file);
      const remoteSize = Number(response.headers.get("content-length"));
      const remoteModified = Date.parse(response.headers.get("last-modified") ?? "");
      if (remoteSize === file.size && Number.isFinite(remoteModified) && remoteModified <= file.mtime.getTime()) {
        const checkedAt = now.toISOString();
        await writeFile(paths.sourceCheck, JSON.stringify({ checkedAt, archiveSize: file.size }), "utf8");
        return { archive: paths.archive, modifiedAt: file.mtime.toISOString(), checkedAt };
      }
    }
    await downloadBulkFile(paths.archive, paths.partialArchive, fetcher);
    file = await stat(/* turbopackIgnore: true */ paths.archive);
    const checkedAt = now.toISOString();
    await writeFile(paths.sourceCheck, JSON.stringify({ checkedAt, archiveSize: file.size }), "utf8");
    return { archive: paths.archive, modifiedAt: file.mtime.toISOString(), checkedAt };
  } catch (error) {
    if (!file) throw error;
    return storedFileFallback(file);
  }
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

function ongoingProceedings(value: unknown): SwedishProceeding[] {
  return plainValue(value).split("|").filter(Boolean).map((item) => {
    const [code, rawDate] = item.split("$");
    const normalizedCode = code.trim();
    return { code: normalizedCode, label: PROCEEDING_LABELS[normalizedCode] ?? `Ukjent statuskode ${normalizedCode}`,
      since: validIsoDate(rawDate) };
  });
}

export function swedishRegistrationStatus(row: Record<string, unknown>): Pick<SwedishRecentCompany,
  "deregistrationDate" | "deregistrationReason" | "ongoingProceedings"> {
  const reasonCode = plainValue(row.avregistreringsorsak);
  return {
    deregistrationDate: validIsoDate(row.avregistreringsdatum),
    deregistrationReason: reasonCode ? DEREGISTRATION_LABELS[reasonCode] ?? `Kode ${reasonCode}` : "",
    ongoingProceedings: ongoingProceedings(row.pagandeAvvecklingsEllerOmstruktureringsforfarande),
  };
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
      ...swedishRegistrationStatus(row),
    });
  }
  const newestFirst = (left: { registrationDate: string; name: string }, right: { registrationDate: string; name: string }) =>
    right.registrationDate.localeCompare(left.registrationDate) || left.name.localeCompare(right.name, "sv");
  return { companies: companies.toSorted(newestFirst), soleProprietorships: soleProprietorships.toSorted(newestFirst) };
}

function verifiedSoleIdentifier(row: Record<string, unknown>, candidate: SwedishRecentSoleProprietorship,
  registrationDate: string, name: string): string | null {
  if (candidate.name !== name || candidate.registrationDate !== registrationDate
    || candidate.postalCity !== postalCity(row.postadress)) {
    throw new Error("Registerfilen endret seg under E-kontrollen. Hent listen på nytt.");
  }
  const [scbId, identityType] = plainValue(row.organisationsidentitet).split("$");
  return /^\d{12}$/.test(scbId) && identityType === "PERSON-IDORG" ? scbId : null;
}

/** Resolves E identifiers only for an explicit SCB check. Personal numbers are never cached or returned to the browser. */
export async function resolveSoleProprietorshipIdentifiers(
  cutoffDate: string,
  candidates: SwedishRecentSoleProprietorship[],
  archive = dataPaths().archive,
  onScanProgress?: (percent: number) => void,
): Promise<Array<{ candidate: SwedishRecentSoleProprietorship; scbId: string }>> {
  const wanted = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const found: Array<{ candidate: SwedishRecentSoleProprietorship; scbId: string }> = [];
  const directory = await unzipper.Open.file(archive);
  const entry = directory.files.find((file) => file.type === "File" && file.path.endsWith(".txt"));
  if (!entry) throw new Error("Bolagsverkets arkiv mangler den forventede datafilen.");
  let source: Readable = entry.stream();
  if (onScanProgress && entry.uncompressedSize > 0) {
    let scannedBytes = 0;
    let lastPercent = -1;
    onScanProgress(0);
    source = source.pipe(new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        scannedBytes += chunk.length;
        const percent = Math.min(99, Math.floor(scannedBytes * 100 / entry.uncompressedSize));
        if (percent > lastPercent) {
          lastPercent = percent;
          onScanProgress(percent);
        }
        callback(null, chunk);
      },
    }));
  }
  const parser = source.pipe(csvParser({
    separator: ";",
    mapHeaders: ({ header }) => header.replace(/^\uFEFF/, ""),
  }));
  let index = 0;
  for await (const rawRow of parser) {
    const row = rawRow as Record<string, unknown>;
    const registrationDate = validIsoDate(row.registreringsdatum);
    if (!registrationDate || registrationDate < cutoffDate || plainValue(row.organisationsform) !== "E-ORGFO") continue;
    const name = beforeMarker(row.organisationsnamn);
    if (!name) continue;
    index += 1;
    const candidate = wanted.get(`E:${index}`);
    if (!candidate) continue;
    const scbId = verifiedSoleIdentifier(row, candidate, registrationDate, name);
    if (scbId) found.push({ candidate, scbId });
    wanted.delete(candidate.id);
    if (wanted.size === 0) break;
  }
  if (wanted.size > 0) throw new Error("Noen E-oppføringer ble ikke funnet i registerfilen. Hent listen på nytt.");
  onScanProgress?.(100);
  return found;
}

export function sevenDayCutoff(now = new Date()): string {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  cutoff.setUTCDate(cutoff.getUTCDate() - 7);
  return cutoff.toISOString().slice(0, 10);
}

export function filterRecentByCutoff(
  records: Pick<SwedishRecentResult, "companies" | "soleProprietorships">,
  cutoffDate: string,
): Pick<SwedishRecentResult, "companies" | "soleProprietorships"> {
  return {
    companies: records.companies.filter((company) => company.registrationDate >= cutoffDate),
    soleProprietorships: records.soleProprietorships.filter((company) => company.registrationDate >= cutoffDate),
  };
}

export async function loadRecentSwedishCompanies(now = new Date()): Promise<SwedishRecentResult> {
  const paths = dataPaths();
  const source = await ensureSwedishBulkFile({ now });
  const sourceStat = await stat(/* turbopackIgnore: true */ source.archive);
  const cutoffDate = sevenDayCutoff(now);
  try {
    const cached = JSON.parse(await readFile(/* turbopackIgnore: true */ paths.cache, "utf8")) as RecentCache;
    if (cached.cutoffDate <= cutoffDate
      && cached.schemaVersion === RECENT_CACHE_SCHEMA_VERSION
      && cached.sourceFileModifiedAt === source.modifiedAt
      && cached.archiveSize === sourceStat.size
      && Array.isArray(cached.companies)
      && Array.isArray(cached.soleProprietorships)) {
      return {
        ...cached,
        ...filterRecentByCutoff(cached, cutoffDate),
        cutoffDate,
        fetchedAt: now.toISOString(),
        sourceCheckedAt: source.checkedAt,
        sourceWarning: source.warning,
      };
    }
  } catch {
    // A missing or stale cache is rebuilt from the local official bulk file.
  }
  const records = await scanRecentSwedishCompanies(source.archive, cutoffDate);
  const result: RecentCache = {
    ...records,
    cutoffDate,
    sourceFileModifiedAt: source.modifiedAt,
    sourceCheckedAt: source.checkedAt,
    sourceWarning: source.warning,
    fetchedAt: now.toISOString(),
    archiveSize: sourceStat.size,
    schemaVersion: RECENT_CACHE_SCHEMA_VERSION,
  };
  await writeFile(/* turbopackIgnore: true */ paths.cache, JSON.stringify(result), { encoding: "utf8", flag: "w" });
  return result;
}
