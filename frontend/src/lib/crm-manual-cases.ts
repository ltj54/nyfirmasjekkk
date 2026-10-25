export type CrmManualCase = {
  id: string;
  companyName: string;
  orgNumber: string;
  contactName: string;
  email: string;
  receivedAt: string;
  status: string;
  summary: string;
  nextStep: string;
  contactPolicy: "await_customer" | "manual_review" | "closed";
  reviewDate: string | null;
  sourceFile: string;
};

export type CrmManualCaseWithEmail = CrmManualCase & { originalEmail: string };

export function normalizeOrganizationNumber(value: string | undefined): string {
  return value?.replaceAll(/\D/g, "") ?? "";
}

export function casesForProject(cases: CrmManualCaseWithEmail[], organizationNumber: string | undefined): CrmManualCaseWithEmail[] {
  const normalized = normalizeOrganizationNumber(organizationNumber);
  if (!normalized) return [];
  return cases.filter((manualCase) => normalizeOrganizationNumber(manualCase.orgNumber) === normalized);
}

export function casesWithoutProject(cases: CrmManualCaseWithEmail[], projectOrganizationNumbers: ReadonlySet<string>): CrmManualCaseWithEmail[] {
  return cases.filter((manualCase) => !projectOrganizationNumbers.has(normalizeOrganizationNumber(manualCase.orgNumber)));
}
