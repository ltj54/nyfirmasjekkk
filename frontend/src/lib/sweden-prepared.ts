import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { enrichRecentSwedishCompanies, enrichRecentSwedishSoleProprietorships, type SwedishPilotCompany } from "./sweden-pilot.ts";
import { resolveSoleProprietorshipIdentifiers, type SwedishRecentResult, type SwedishRecentSoleProprietorship } from "./sweden-recent.ts";

const CACHE_SCHEMA_VERSION = 3;
const AB_BATCH_SIZE = 25;
const SOLE_BATCH_SIZE = 100;

export type PreparedSwedishRecentResult = SwedishRecentResult & {
  prepared: {
    checkedAbCount: number;
    checkedSoleCount: number;
    unavailableAbCount: number;
    unavailableSoleCount: number;
    preparedAt: string;
    reusedCache: boolean;
    summaryIncomplete?: boolean;
  };
  enrichment: {
    companies: SwedishPilotCompany[];
    soleProprietorships: SwedishPilotCompany[];
  };
};

type UnavailableCounts = { ab: number; sole: number };
type PreparedCache = PreparedSwedishRecentResult & {
  schemaVersion: number;
  unavailableByDate?: Record<string, UnavailableCounts>;
};

export type SwedishPreparationProgress = {
  phase: "checking_ab" | "resolving_sole" | "checking_sole" | "saving" | "complete";
  completed: number;
  total: number;
  scanPercent?: number;
};

type PrepareDependencies = {
  directory?: string;
  now?: Date;
  enrichCompanies?: typeof enrichRecentSwedishCompanies;
  resolveSole?: typeof resolveSoleProprietorshipIdentifiers;
  enrichSole?: typeof enrichRecentSwedishSoleProprietorships;
  onProgress?: (progress: SwedishPreparationProgress) => void;
};

function cachePath(directory: string): string {
  return path.join(directory, "prepared-recent.json");
}

function cacheMatches(cache: PreparedCache, recent: SwedishRecentResult): boolean {
  if (cache.sourceFileModifiedAt !== recent.sourceFileModifiedAt
    || !Array.isArray(cache.companies) || !Array.isArray(cache.soleProprietorships)
    || !Number.isInteger(cache.prepared?.unavailableAbCount)
    || !Number.isInteger(cache.prepared?.unavailableSoleCount)
    || !Array.isArray(cache.enrichment?.companies) || !Array.isArray(cache.enrichment?.soleProprietorships)) return false;
  if (cache.cutoffDate > recent.cutoffDate || !Number.isFinite(Date.parse(cache.prepared.preparedAt))) return false;
  if (cache.schemaVersion === CACHE_SCHEMA_VERSION) return Boolean(cache.unavailableByDate);
  return cache.schemaVersion === 2;
}

async function readCache(file: string, recent: SwedishRecentResult): Promise<PreparedCache | null> {
  try {
    const cache = JSON.parse(await readFile(file, "utf8")) as PreparedCache;
    return cacheMatches(cache, recent) ? cache : null;
  } catch {
    return null;
  }
}

function batchesOf<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

function checkCompanies(recent: SwedishRecentResult, apiKey: string,
  enrich: typeof enrichRecentSwedishCompanies,
  onChecked: () => void): Promise<{ details: SwedishPilotCompany[]; unavailableIds: string[] }> {
  const numbers = recent.companies.map((company) => company.orgNumber);
  return batchesOf(numbers, AB_BATCH_SIZE).reduce<Promise<{ details: SwedishPilotCompany[]; unavailableIds: string[] }>>(
    async (pending, batch) => {
      const result = await pending;
      let reported = 0;
      const checked = await enrich(apiKey, batch, { onChecked: () => { reported += 1; onChecked(); } });
      for (; reported < batch.length; reported += 1) onChecked();
      result.details.push(...checked.companies.filter((company) => company.email.trim()));
      result.unavailableIds.push(...(checked.unavailableOrgNumbers ?? []));
      return result;
    }, Promise.resolve({ details: [], unavailableIds: [] }));
}

async function checkSoleProprietorships(recent: SwedishRecentResult, apiKey: string,
  resolve: typeof resolveSoleProprietorshipIdentifiers,
  enrich: typeof enrichRecentSwedishSoleProprietorships,
  onChecked: (count?: number) => void,
  onScanProgress: (percent: number) => void,
  archive?: string): Promise<{ details: SwedishPilotCompany[]; unavailableIds: string[] }> {
  if (recent.soleProprietorships.length === 0) return { details: [], unavailableIds: [] };
  const lookups = await resolve(recent.cutoffDate, recent.soleProprietorships, archive, onScanProgress);
  const foundIds = new Set(lookups.map(({ candidate }) => candidate.id));
  const unavailableIds = recent.soleProprietorships.filter((candidate) => !foundIds.has(candidate.id)).map((candidate) => candidate.id);
  onChecked(unavailableIds.length);
  return batchesOf(lookups, SOLE_BATCH_SIZE).reduce<Promise<{ details: SwedishPilotCompany[]; unavailableIds: string[] }>>(
    async (pending, batch) => {
      const result = await pending;
      let reported = 0;
      const checked = await enrich(apiKey, batch, { onChecked: () => { reported += 1; onChecked(); } });
      for (; reported < batch.length; reported += 1) onChecked();
      result.details.push(...checked.companies.filter((company) => company.email.trim()));
      result.unavailableIds.push(...(checked.unavailableIds ?? []));
      return result;
    }, Promise.resolve({ details: [], unavailableIds }));
}

function countsForDate(counts: Record<string, UnavailableCounts>, date: string): UnavailableCounts {
  let value = counts[date];
  if (!value) {
    value = { ab: 0, sole: 0 };
    counts[date] = value;
  }
  return value;
}

function countUnavailableByDate(recent: SwedishRecentResult, abIds: string[], soleIds: string[]): Record<string, UnavailableCounts> {
  const counts: Record<string, UnavailableCounts> = {};
  const ab = new Set(abIds);
  const sole = new Set(soleIds);
  for (const company of recent.companies) {
    if (ab.has(company.orgNumber)) countsForDate(counts, company.registrationDate).ab += 1;
  }
  for (const company of recent.soleProprietorships) {
    if (sole.has(company.id)) countsForDate(counts, company.registrationDate).sole += 1;
  }
  return counts;
}

function unavailableSince(counts: Record<string, UnavailableCounts>, cutoffDate: string): UnavailableCounts {
  return Object.entries(counts).reduce((total, [date, count]) => {
    if (date >= cutoffDate) {
      total.ab += count.ab;
      total.sole += count.sole;
    }
    return total;
  }, { ab: 0, sole: 0 });
}

function reuseCache(cache: PreparedCache, recent: SwedishRecentResult): PreparedSwedishRecentResult {
  const abIds = new Set(recent.companies.map((company) => company.id));
  const soleIds = new Set(recent.soleProprietorships.map((company) => company.id));
  const summaryIncomplete = !cache.unavailableByDate && cache.cutoffDate !== recent.cutoffDate;
  const unavailable = cache.unavailableByDate
    ? unavailableSince(cache.unavailableByDate, recent.cutoffDate)
    : { ab: summaryIncomplete ? 0 : cache.prepared.unavailableAbCount,
      sole: summaryIncomplete ? 0 : cache.prepared.unavailableSoleCount };
  return {
    sourceFileModifiedAt: recent.sourceFileModifiedAt,
    cutoffDate: recent.cutoffDate,
    fetchedAt: recent.fetchedAt,
    sourceCheckedAt: recent.sourceCheckedAt,
    sourceWarning: recent.sourceWarning,
    companies: cache.companies.filter((company) => abIds.has(company.id)),
    soleProprietorships: cache.soleProprietorships.filter((company) => soleIds.has(company.id)),
    enrichment: {
      companies: cache.enrichment.companies.filter((company) => abIds.has(company.id)),
      soleProprietorships: cache.enrichment.soleProprietorships.filter((company) => soleIds.has(company.id)),
    },
    prepared: {
      ...cache.prepared,
      checkedAbCount: recent.companies.length,
      checkedSoleCount: recent.soleProprietorships.length,
      unavailableAbCount: unavailable.ab,
      unavailableSoleCount: unavailable.sole,
      reusedCache: true,
      summaryIncomplete,
    },
  };
}

async function writeCache(file: string, result: PreparedSwedishRecentResult,
  unavailableByDate: Record<string, UnavailableCounts>): Promise<void> {
  const temporary = `${file}.${process.pid}.part`;
  try {
    await writeFile(temporary, JSON.stringify({ ...result, unavailableByDate, schemaVersion: CACHE_SCHEMA_VERSION }),
      { encoding: "utf8", mode: 0o600 });
    await rename(temporary, file);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

/** One user-initiated preparation. The saved selection never contains E personal identifiers. */
export async function prepareRecentSwedishCompanies(
  recent: SwedishRecentResult,
  apiKey: string,
  dependencies: PrepareDependencies = {},
): Promise<PreparedSwedishRecentResult> {
  if (!apiKey.trim()) throw new Error("SCB-tilgang er ikke satt opp ennå.");
  const directory = dependencies.directory ?? path.resolve(process.cwd(), "..", "data", "scb");
  const now = dependencies.now ?? new Date();
  await mkdir(directory, { recursive: true });
  const file = cachePath(directory);
  const cached = await readCache(file, recent);
  if (cached) {
    const result = reuseCache(cached, recent);
    const total = result.prepared.checkedAbCount + result.prepared.checkedSoleCount;
    dependencies.onProgress?.({ phase: "complete", completed: total, total });
    return result;
  }

  const total = recent.companies.length + recent.soleProprietorships.length;
  let completed = 0;
  const report = (phase: SwedishPreparationProgress["phase"], scanPercent?: number) =>
    dependencies.onProgress?.({ phase, completed, total, ...(scanPercent === undefined ? {} : { scanPercent }) });
  const checkedAb = () => { completed += 1; report("checking_ab"); };
  report("checking_ab");
  const companies = await checkCompanies(recent, apiKey, dependencies.enrichCompanies ?? enrichRecentSwedishCompanies, checkedAb);
  report("resolving_sole");
  const sole = await checkSoleProprietorships(recent, apiKey,
    dependencies.resolveSole ?? resolveSoleProprietorshipIdentifiers,
    dependencies.enrichSole ?? enrichRecentSwedishSoleProprietorships,
    (count = 1) => { completed += count; report("checking_sole"); },
    (percent) => report("resolving_sole", percent),
    dependencies.directory ? path.join(directory, "bolagsverket_bulkfil.zip") : undefined);
  report("saving");
  const companyDetails = companies.details;
  const soleDetails = sole.details;
  const companyIds = new Set(companyDetails.map((company) => company.id));
  const soleIds = new Set(soleDetails.map((company) => company.id));
  const result: PreparedSwedishRecentResult = {
    ...recent,
    companies: recent.companies.filter((company) => companyIds.has(company.id)),
    soleProprietorships: recent.soleProprietorships.filter((company: SwedishRecentSoleProprietorship) => soleIds.has(company.id)),
    prepared: {
      checkedAbCount: recent.companies.length,
      checkedSoleCount: recent.soleProprietorships.length,
      unavailableAbCount: companies.unavailableIds.length,
      unavailableSoleCount: sole.unavailableIds.length,
      preparedAt: now.toISOString(),
      reusedCache: false,
    },
    enrichment: { companies: companyDetails, soleProprietorships: soleDetails },
  };
  await writeCache(file, result, countUnavailableByDate(recent, companies.unavailableIds, sole.unavailableIds));
  report("complete");
  return result;
}
