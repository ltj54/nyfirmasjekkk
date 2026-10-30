import type { SwedishPilotCompany } from "./sweden-pilot";
import type { SwedishRecentCompany, SwedishRecentSoleProprietorship } from "./sweden-recent";

export function recentCompaniesWithEmail(
  candidates: SwedishRecentCompany[],
  enriched: Record<string, SwedishPilotCompany>,
): SwedishRecentCompany[] {
  return candidates.filter((company) => Boolean(enriched[company.orgNumber]?.email.trim()));
}

export function pilotCompaniesWithEmail(companies: SwedishPilotCompany[]): SwedishPilotCompany[] {
  return companies.filter((company) => Boolean(company.email.trim()));
}

export function soleProprietorshipsWithEmail(
  candidates: SwedishRecentSoleProprietorship[],
  enriched: Record<string, SwedishPilotCompany>,
): SwedishRecentSoleProprietorship[] {
  return candidates.filter((candidate) => Boolean(enriched[candidate.id]?.email.trim()));
}
