"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Globe,
  LayoutList,
  Mail,
  Phone,
  Landmark,
  MapPin,
  MonitorCheck,
  Search,
  Send,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  BrregWebsiteMatch,
  CompanyEvent,
  CompanyDetails,
  CompanySummary,
  MetadataFiltersResponse,
  OutreachImportResponse,
  OutreachStatus,
  WebsiteInspectionResponse,
  WebsiteQualityAssessment,
  WebsiteQualitySignal,
} from "@/lib/company-check";
import {
  applyLeadQuickFilters,
  compareLeadPriority,
  getBestContactPoint,
  getCommercialOpportunity,
  getLeadPriority,
  type LeadQuickFilter,
} from "@/lib/company-lead-scoring";
import {
  buildOutreachEmailBody,
  buildOutreachEmailHtml,
  buildOutreachEmailSubject,
  websiteQualityMailLine,
} from "@/lib/outreach-email-template";
import {
  buildGoogleSearchUrl,
  describeStructureSignal,
  estimateListProgress,
  eventSeverityClassName,
  formatDateTime,
  formatEmployeeCount,
  formatEventDate,
  formatEventSeverity,
  formatEventType,
  formatRegistryFlag,
  formatRoleType,
  formatStructureSignalSeverity,
  formatWebsiteCandidateStatus,
  formatWebsiteConfidence,
  formatWebsiteVerification,
  getLatestOutreachEntriesByOrg,
  normalizeWebsiteUrl,
  outreachOfferTypeForCompany,
  formatOutreachOfferType,
  parseOutreachJsonl,
  stripWebsiteProtocol,
  structureSignalSeverityClassName,
  websiteCandidateRows,
  websiteDiscoveryExplanationItems,
} from "@/lib/company-formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { OutreachOverview } from "@/components/outreach-overview";

const dayOptions = ["5", "10", "30", "60", "180", "365", "0"];
const countyOptions = [
  "Agder",
  "Akershus",
  "Buskerud",
  "Finnmark",
  "Innlandet",
  "Møre og Romsdal",
  "Nordland",
  "Oslo",
  "Rogaland",
  "Telemark",
  "Troms",
  "Trøndelag",
  "Vestfold",
  "Vestland",
  "Østfold",
];
type WorkspaceTab = "leads" | "website" | "outreach";
type BatchValidation = {
  status: "checking" | "blocked" | "ready";
  reason?: string;
  startedAt?: number;
};
const legend = [
  { status: "GREEN", label: "Ryddig registerstatus", color: "bg-emerald-500" },
  { status: "YELLOW", label: "Begrenset registerinfo", color: "bg-amber-500" },
  { status: "RED", label: "Alvorlige registerspor", color: "bg-rose-500" },
];

const legendDetails: Record<string, { title: string; text: string }> = {
  GREEN: {
    title: "Ryddig registerstatus",
    text: "Åpne registerdata gir et ryddig førsteinntrykk. Det betyr ikke at alt er risikofritt, men vi ser ingen tydelige negative signaler i BRREG-dataene.",
  },
  YELLOW: {
    title: "Begrenset registerinfo",
    text: "Det finnes noen forhold som gjør bildet mindre tydelig, for eksempel kort historikk eller mangelfulle opplysninger. Dette er et signal om å sjekke litt nærmere.",
  },
  RED: {
    title: "Alvorlige registerspor",
    text: "Åpne registerdata viser forhold som konkurs, avvikling, tvangsoppløsning eller andre tydelige avvik. Slike treff bør undersøkes før man går videre.",
  },
};

const modelRules = [
  "Rød brukes bare når åpne registerdata viser alvorlige forhold, som konkurs, avvikling eller manglende ledelse i selskapsformer som normalt skal ha det.",
  "Gul brukes når flere svakere signaler peker i samme retning, for eksempel nytt selskap kombinert med tynne eller manglende registeropplysninger.",
  "Grønn betyr at selskapet ser ryddig ut i åpne BRREG-data, men er ikke en garanti for økonomi, kredittverdighet eller betalingsvilje.",
  "Vurderingen er laget som en første sjekk av formalia og registreringsspor, ikke som en full kredittvurdering.",
];

const organizationFormHelp: Record<string, { label: string; description: string }> = {
  AS: {
    label: "Aksjeselskap",
    description: "Vanlig selskapsform med begrenset ansvar.",
  },
  DA: {
    label: "Selskap med delt ansvar",
    description: "Personlig eid selskap der deltakerne har delt ansvar. Kan være relevant for små virksomheter.",
  },
  ANS: {
    label: "Ansvarlig selskap",
    description: "Personlig eid selskap der deltakerne har ansvar. Kan være relevant for partnerskap og mindre drift.",
  },
  ENK: {
    label: "Enkeltpersonforetak",
    description: "Eies og drives av én person.",
  },
  NUF: {
    label: "Norskregistrert utenlandsk foretak",
    description: "Utenlandsk virksomhet registrert i Norge.",
  },
  SA: {
    label: "Samvirkeforetak",
    description: "Medlemsstyrt foretak.",
  },
  STIFT: {
    label: "Stiftelse",
    description: "Selveiende virksomhet med vedtektsfestet formål. Kan være relevant, men ofte mindre salgsrettet.",
  },
  STI: {
    label: "Stiftelse",
    description: "Selveiende virksomhet med vedtektsfestet formål. Kan være relevant, men ofte mindre salgsrettet.",
  },
  FLI: {
    label: "Forening/lag/innretning",
    description: "Forening, lag eller ideell innretning.",
  },
  ASA: {
    label: "Allmennaksjeselskap",
    description: "Større aksjeselskapsform. Vanligvis mindre relevant for enkel startside, men kan brukes som filter.",
  },
  BA: {
    label: "Selskap med begrenset ansvar",
    description: "Eldre selskapsform som fortsatt finnes historisk. Relevansen varierer.",
  },
};

const visibleOrganizationForms = ["AS", "ENK", "DA", "ANS", "NUF", "FLI", "SA", "STI", "ASA", "BA"];
const leadQuickFilterOptions: Array<{ value: LeadQuickFilter; label: string }> = [
  { value: "HAS_EMAIL", label: "Har e-post" },
  { value: "HAS_WEBSITE", label: "Har nettside" },
  { value: "MISSING_WEBSITE", label: "Mangler nettside" },
  { value: "NOT_SENT", label: "Ikke sendt" },
  { value: "NOT_RELEVANT", label: "Ikke aktuell" },
];
const MAX_EMAIL_BATCH_SIZE = 25;
const EMAIL_BATCH_SEND_DELAY_MS = 2_000;
const EMAIL_BATCH_VALIDATION_TIMEOUT_MS = 12_000;
type OutreachStatusOverride = "sent" | "reverted" | "not_relevant" | "batch_excluded";

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hasOnlyUnreachablePossibleWebsiteCandidates(company: Pick<CompanySummary, "website" | "websiteDiscovery">) {
  const discovery = company.websiteDiscovery;
  if (company.website) {
    return false;
  }

  if (discovery?.status === "NONE") {
    return true;
  }
  if (discovery?.status !== "POSSIBLE_MATCH" || discovery.candidates.length === 0) {
    return false;
  }
  if (!discovery.candidateChecks?.length) {
    return discovery.verifiedReachable === false;
  }

  const candidates = websiteCandidateRows(discovery);
  return candidates.length > 0 && candidates.every((candidate) => candidate.reachable === false);
}

function canSelectEmailBatchCandidate(company: Pick<CompanySummary, "website" | "websiteDiscovery">) {
  return !company.website && (
    company.websiteDiscovery?.status === "NONE"
      || company.websiteDiscovery?.status === "POSSIBLE_MATCH"
  );
}

function isBatchExcluded(status: OutreachStatus | null | undefined) {
  return status?.status === "batch_excluded";
}

function emailBatchBlockReason(company: Pick<CompanySummary, "email" | "website" | "websiteDiscovery">) {
  if (!company.email) {
    return "mangler e-postadresse";
  }
  if (company.website) {
    return `har registrert nettside: ${company.website}`;
  }

  const discovery = company.websiteDiscovery;
  if (!discovery) {
    return "mangler nettsidevurdering";
  }
  if (discovery.status === "NONE") {
    return null;
  }
  if (discovery.status !== "POSSIBLE_MATCH") {
    return "har ikke status som manglende nettside";
  }

  const reachableCandidate = discovery.candidateChecks?.find((candidate) => candidate.reachable);
  if (reachableCandidate) {
    return `mulig nettside svarte: ${reachableCandidate.url}${reachableCandidate.reason ? ` (${reachableCandidate.reason})` : ""}`;
  }
  if (discovery.verifiedReachable === true && discovery.verifiedCandidate) {
    return `mulig nettside svarte: ${discovery.verifiedCandidate}`;
  }

  return null;
}

function compareEmailBatchPriority(left: CompanySummary, right: CompanySummary) {
  const leftSelectable = canSelectEmailBatchCandidate(left) ? 0 : 1;
  const rightSelectable = canSelectEmailBatchCandidate(right) ? 0 : 1;
  if (leftSelectable !== rightSelectable) {
    return leftSelectable - rightSelectable;
  }
  return compareLeadPriority(left, right);
}

function paginationItems(currentPage: number, totalPages: number): Array<number | "..."> {
  if (totalPages <= 0) {
    return [];
  }
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  if (currentPage <= 4) {
    return [0, 1, 2, 3, 4, 5, 6, "...", totalPages - 1];
  }
  if (currentPage >= totalPages - 5) {
    return [0, "...", totalPages - 7, totalPages - 6, totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
  }
  return [0, "...", currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2, "...", totalPages - 1];
}

export function CompanyCheckShell() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("leads");
  const [backendReady, setBackendReady] = useState(false);
  const [initialResultsReady, setInitialResultsReady] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [selectedWebsiteInspection, setSelectedWebsiteInspection] = useState<WebsiteInspectionResponse | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<CompanySummary[]>([]);
  const [metadata, setMetadata] = useState<MetadataFiltersResponse>({
    organizationForms: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listLoadProgress, setListLoadProgress] = useState(0);
  const [listLoadSeconds, setListLoadSeconds] = useState(0);
  const [daysFilter, setDaysFilter] = useState("5");
  const [countyFilter, setCountyFilter] = useState("");
  const [organizationFormFilter, setOrganizationFormFilter] = useState("");
  const [selectedLegend, setSelectedLegend] = useState<keyof typeof legendDetails | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [debouncedNameFilter, setDebouncedNameFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showBatchExcluded, setShowBatchExcluded] = useState(true);
  const [leadQuickFilters, setLeadQuickFilters] = useState<LeadQuickFilter[]>([]);
  const [selectedCompanyEvents, setSelectedCompanyEvents] = useState<CompanyEvent[]>([]);
  const [outreachStatusByOrg, setOutreachStatusByOrg] = useState<Record<string, OutreachStatus>>({});
  const [batchSelectionByOrg, setBatchSelectionByOrg] = useState<Record<string, boolean>>({});
  const [batchValidationByOrg, setBatchValidationByOrg] = useState<Record<string, BatchValidation>>({});
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [outreachEntries, setOutreachEntries] = useState<OutreachStatus[]>([]);
  const [isOutreachListLoading, setIsOutreachListLoading] = useState(false);
  const [outreachListError, setOutreachListError] = useState<string | null>(null);
  const [isOutreachImporting, setIsOutreachImporting] = useState(false);
  const [outreachImportMessage, setOutreachImportMessage] = useState<string | null>(null);
  const [savingOutreachByOrg, setSavingOutreachByOrg] = useState<Record<string, boolean>>({});
  const [sendingEmailByOrg, setSendingEmailByOrg] = useState<Record<string, boolean>>({});
  const [emailSendErrorByOrg, setEmailSendErrorByOrg] = useState<Record<string, string | null>>({});
  const [emailSentRecipientByOrg, setEmailSentRecipientByOrg] = useState<Record<string, string | null>>({});
  const [generatedEmailByOrg, setGeneratedEmailByOrg] = useState<Record<string, { subject: string; body: string }>>({});
  const [generatingEmailByOrg, setGeneratingEmailByOrg] = useState<Record<string, boolean>>({});
  const [websiteInspectionUrl, setWebsiteInspectionUrl] = useState("");
  const [isWebsiteInspectionLoading, setIsWebsiteInspectionLoading] = useState(false);
  const [websiteInspectionError, setWebsiteInspectionError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const latestListRequestId = useRef(0);
  const hasDetailHistoryEntryRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);

  async function fetchOutreachStatuses(orgNumbers: string[]) {
    const uniqueOrgNumbers = Array.from(new Set(orgNumbers.filter(Boolean)));
    if (uniqueOrgNumbers.length === 0) {
      return;
    }

    try {
      const response = await fetch("/api/company-check/outreach-statuses", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(uniqueOrgNumbers),
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as OutreachStatus[];
      const nextEntries = payload.map((entry) => [entry.orgNumber, entry] as const);
      if (nextEntries.length === 0) {
        return;
      }

      setOutreachStatusByOrg((current) => ({
        ...current,
        ...Object.fromEntries(nextEntries),
      }));
    } catch (error) {
      console.error("Failed to fetch outreach statuses", error);
    }
  }

  async function fetchOutreachEntries() {
    setIsOutreachListLoading(true);
    setOutreachListError(null);

    try {
      const response = await fetch("/api/company-check/outreach/export", {
        cache: "no-store",
      });

      if (!response.ok) {
        setOutreachListError("Klarte ikke hente utsendelseslisten.");
        return;
      }

      const payload = parseOutreachJsonl(await response.text());
      setOutreachEntries(payload);
      setOutreachStatusByOrg((current) => ({
        ...current,
        ...Object.fromEntries(getLatestOutreachEntriesByOrg(payload).map((entry) => [entry.orgNumber, entry])),
      }));
    } catch (error) {
      console.error("Failed to fetch outreach list", error);
      setOutreachListError("Klarte ikke hente utsendelseslisten.");
    } finally {
      setIsOutreachListLoading(false);
    }
  }

  async function importOutreachLog(file: File) {
    setIsOutreachImporting(true);
    setOutreachListError(null);
    setOutreachImportMessage(null);

    try {
      const content = await file.text();
      const response = await fetch("/api/company-check/outreach/import", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: content,
      });

      if (!response.ok) {
        setOutreachListError("Klarte ikke importere loggfilen. Sjekk at filen er JSONL-eksport fra appen.");
        return;
      }

      const payload = (await response.json()) as OutreachImportResponse;
      setOutreachImportMessage(
        `Importert ${payload.imported} nye linjer. Hoppet over ${payload.skipped} som allerede fantes.`
      );
      await fetchOutreachEntries();
    } catch (error) {
      console.error("Failed to import outreach log", error);
      setOutreachListError("Klarte ikke importere loggfilen.");
    } finally {
      setIsOutreachImporting(false);
    }
  }

  async function updateOutreachStatus(
    company: Pick<CompanySummary, "orgNumber" | "name" | "organizationForm" | "website" | "websiteDiscovery" | "websiteQuality">,
    sent: boolean,
    note?: string,
    statusOverride?: OutreachStatusOverride
  ) {
    setSavingOutreachByOrg((current) => ({
      ...current,
      [company.orgNumber]: true,
    }));

    try {
      const response = await fetch(`/api/company-check/${company.orgNumber}/outreach-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: company.name,
          organizationForm: company.organizationForm,
          sent,
          status: statusOverride ?? (sent ? "sent" : "reverted"),
          price: null,
          channel: "email",
          offerType: outreachOfferTypeForCompany(company),
          note: note?.trim() ? note.trim() : null,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to update outreach status for ${company.orgNumber}`);
        return;
      }

      const payload = (await response.json()) as OutreachStatus;
      setOutreachStatusByOrg((current) => ({
        ...current,
        [company.orgNumber]: payload,
      }));
      setOutreachEntries((current) => {
        return [payload, ...current];
      });
    } catch (error) {
      console.error("Failed to update outreach status", error);
    } finally {
      setSavingOutreachByOrg((current) => ({
        ...current,
        [company.orgNumber]: false,
      }));
    }
  }

  async function generateOutreachEmail(company: Pick<CompanySummary, "orgNumber" | "name" | "organizationForm" | "contactPersonName" | "email" | "phone" | "municipality" | "county" | "naceCode" | "naceDescription" | "salesSegment" | "website" | "websiteDiscovery" | "websiteQuality">) {
    setGeneratingEmailByOrg((current) => ({
      ...current,
      [company.orgNumber]: true,
    }));

    try {
      const response = await fetch("/api/outreach-email-template", {
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Failed to load outreach email template");
        return;
      }

      const payload = (await response.json()) as { content?: string };
      const templateContent = payload.content ?? "";
      const subject = buildOutreachEmailSubject(templateContent, company);
      const body = buildOutreachEmailBody(templateContent, company);

      setGeneratedEmailByOrg((current) => ({
        ...current,
        [company.orgNumber]: { subject, body },
      }));
    } catch (error) {
      console.error("Failed to generate outreach email", error);
    } finally {
      setGeneratingEmailByOrg((current) => ({
        ...current,
        [company.orgNumber]: false,
      }));
    }
  }

  async function sendGeneratedOutreachEmail(
    company: Pick<CompanySummary, "orgNumber" | "name" | "organizationForm" | "email" | "website" | "websiteDiscovery" | "websiteQuality">,
    generatedEmail: { subject: string; body: string } | null
  ) {
    if (!company.email || !generatedEmail) {
      return false;
    }

    setSendingEmailByOrg((current) => ({
      ...current,
      [company.orgNumber]: true,
    }));
    setEmailSendErrorByOrg((current) => ({
      ...current,
      [company.orgNumber]: null,
    }));
    setEmailSentRecipientByOrg((current) => ({
      ...current,
      [company.orgNumber]: null,
    }));

    try {
      const response = await fetch(`/api/company-check/${company.orgNumber}/send-outreach-email`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: company.email,
          subject: generatedEmail.subject,
          body: generatedEmail.body,
          htmlBody: buildOutreachEmailHtml(generatedEmail.body),
          companyName: company.name,
          organizationForm: company.organizationForm,
          price: null,
          channel: "email",
          offerType: outreachOfferTypeForCompany(company),
          note: null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send outreach email", errorText);
        setEmailSendErrorByOrg((current) => ({
          ...current,
          [company.orgNumber]: response.status === 429
            ? "For mange e-postforsøk på kort tid. Vent før du prøver igjen."
            : "Klarte ikke sende e-post via SMTP. Sjekk passord/miljøvariabler og prøv igjen.",
        }));
        return false;
      }

      const payload = (await response.json()) as { to: string; outreachStatus: OutreachStatus };
      setOutreachStatusByOrg((current) => ({
        ...current,
        [company.orgNumber]: payload.outreachStatus,
      }));
      setEmailSentRecipientByOrg((current) => ({
        ...current,
        [company.orgNumber]: payload.to,
      }));
      setOutreachEntries((current) => [payload.outreachStatus, ...current]);
      return true;
    } catch (error) {
      console.error("Failed to send outreach email", error);
      setEmailSendErrorByOrg((current) => ({
        ...current,
        [company.orgNumber]: "Klarte ikke sende e-post via SMTP. Sjekk passord/miljøvariabler og prøv igjen.",
      }));
      return false;
    } finally {
      setSendingEmailByOrg((current) => ({
        ...current,
        [company.orgNumber]: false,
      }));
    }
  }

  async function runEmailBatch(companies: CompanySummary[]) {
    if (isBatchSending) {
      return;
    }

    const eligibleCompanies = companies.filter(canSelectEmailBatchCandidate);
    const sendableCompanies = eligibleCompanies.filter((company) => Boolean(company.email));
    if (sendableCompanies.length === 0) {
      window.alert("Ingen av de valgte treffene har både e-post og manglende registrert nettside.");
      return;
    }
    if (sendableCompanies.length > MAX_EMAIL_BATCH_SIZE) {
      window.alert(`Velg maks ${MAX_EMAIL_BATCH_SIZE} virksomheter per batch. Dette reduserer risikoen for rate limit og feilutsending.`);
      return;
    }

    const skippedCount = companies.length - sendableCompanies.length;
    const delaySeconds = Math.round(EMAIL_BATCH_SEND_DELAY_MS / 1000);
    const confirmed = window.confirm(
      skippedCount > 0
        ? `Sender e-post til ${sendableCompanies.length} valgte virksomheter med ${delaySeconds} sekunders pause mellom hver. ${skippedCount} hoppes over fordi de mangler e-post eller ikke oppfyller nettsidekravet. Detaljsjekk stopper før sending hvis en mulig nettside faktisk svarer. Fortsette?`
        : `Sender e-post til ${sendableCompanies.length} valgte virksomheter med ${delaySeconds} sekunders pause mellom hver. Detaljsjekk stopper før sending hvis en mulig nettside faktisk svarer. Fortsette?`,
    );
    if (!confirmed) {
      return;
    }

    setIsBatchSending(true);
    try {
      const response = await fetch("/api/outreach-email-template", {
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Failed to load outreach email template for batch");
        window.alert("Klarte ikke laste e-postmalen. Batch ble ikke sendt.");
        return;
      }

      const payload = (await response.json()) as { content?: string };
      const templateContent = payload.content ?? "";
      let sentCount = 0;
      let skippedDuringRunCount = 0;

      for (const company of sendableCompanies) {
        const detailedCompany = await fetchCompanyDetailsForBatch(company.orgNumber);
        if (!detailedCompany) {
          skippedDuringRunCount += 1;
          setBatchValidationByOrg((current) => ({
            ...current,
            [company.orgNumber]: { status: "blocked", reason: "Klarte ikke hente detaljsjekk." },
          }));
          setBatchSelectionByOrg((current) => ({
            ...current,
            [company.orgNumber]: false,
          }));
          continue;
        }
        const blockReason = emailBatchBlockReason(detailedCompany);
        if (blockReason || !hasOnlyUnreachablePossibleWebsiteCandidates(detailedCompany)) {
          skippedDuringRunCount += 1;
          setBatchValidationByOrg((current) => ({
            ...current,
            [detailedCompany.orgNumber]: { status: "blocked", reason: blockReason ?? "Mulig nettside må sjekkes manuelt." },
          }));
          setBatchSelectionByOrg((current) => ({
            ...current,
            [detailedCompany.orgNumber]: false,
          }));
          continue;
        }

        const generatedEmail = generatedEmailByOrg[detailedCompany.orgNumber] ?? {
          subject: buildOutreachEmailSubject(templateContent, detailedCompany),
          body: buildOutreachEmailBody(templateContent, detailedCompany),
        };
        setGeneratedEmailByOrg((current) => ({
          ...current,
          [detailedCompany.orgNumber]: generatedEmail,
        }));
        const sent = await sendGeneratedOutreachEmail(detailedCompany, generatedEmail);
        if (!sent) {
          window.alert(`Batch stoppet. Klarte ikke sende e-post til ${detailedCompany.name}. ${sentCount} sendt før stopp.`);
          return;
        }
        sentCount += 1;
        if (sentCount < sendableCompanies.length) {
          await wait(EMAIL_BATCH_SEND_DELAY_MS);
        }
      }

      window.alert(
        skippedDuringRunCount > 0
          ? `Batch ferdig. ${sentCount} e-poster sendt. ${skippedDuringRunCount} hoppet over fordi detaljsjekk fant mulig nettside eller ikke kunne fullføres.`
          : `Batch ferdig. ${sentCount} e-poster sendt.`,
      );
    } finally {
      setIsBatchSending(false);
    }
  }

  async function toggleBatchSelectionWithValidation(company: CompanySummary, selected: boolean) {
    if (!selected) {
      setBatchSelectionByOrg((current) => ({
        ...current,
        [company.orgNumber]: false,
      }));
      setBatchValidationByOrg((current) => ({
        ...current,
        [company.orgNumber]: { status: "ready" },
      }));
      return;
    }

    setBatchValidationByOrg((current) => ({
      ...current,
      [company.orgNumber]: { status: "checking", startedAt: Date.now() },
    }));

    const validation = await validateCompanyForBatchSelection(company);
    if (validation.reason) {
      setBatchSelectionByOrg((current) => ({
        ...current,
        [company.orgNumber]: false,
      }));
      setBatchValidationByOrg((current) => ({
        ...current,
        [company.orgNumber]: { status: "blocked", reason: validation.reason ?? undefined },
      }));
      return;
    }

    setBatchSelectionByOrg((current) => ({
      ...current,
      [company.orgNumber]: true,
    }));
    setBatchValidationByOrg((current) => ({
      ...current,
      [company.orgNumber]: { status: "ready" },
    }));
  }

  async function validateCompanyForBatchSelection(company: Pick<CompanySummary, "orgNumber" | "name">) {
    const controller = new AbortController();
    let timeoutId: number | null = null;
    try {
      const response = await Promise.race([
        fetch(`/api/company-check/${company.orgNumber}/batch-eligibility`, {
          cache: "no-store",
          signal: controller.signal,
        }),
        new Promise<Response>((_, reject) => {
          timeoutId = window.setTimeout(() => {
            controller.abort();
            reject(new DOMException("Batch validation timed out", "AbortError"));
          }, EMAIL_BATCH_VALIDATION_TIMEOUT_MS);
        }),
      ]);
      if (!response.ok) {
        return { reason: "Klarte ikke hente batch-sjekk." };
      }
      const payload = (await response.json()) as { eligible?: boolean; reason?: string | null };
      return { reason: payload.eligible ? null : payload.reason ?? "Oppfyller ikke batch-kravene." };
    } catch (error) {
      console.error("Failed to validate batch eligibility", error);
      return {
        reason: error instanceof DOMException && error.name === "AbortError"
          ? "Batch-sjekk tok for lang tid. Åpne detaljsiden eller prøv igjen senere."
          : "Klarte ikke hente batch-sjekk.",
      };
    } finally {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  async function fetchCompanyDetailsForBatch(orgNumber: string) {
    try {
      const response = await fetch(`/api/company-check/${orgNumber}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        console.error(`Failed to fetch company details for batch: ${orgNumber}`);
        return null;
      }
      return (await response.json()) as CompanyDetails;
    } catch (error) {
      console.error("Failed to fetch company details for batch", error);
      return null;
    }
  }

  function updateGeneratedEmail(orgNumber: string, text: string) {
    setGeneratedEmailByOrg((current) => ({
      ...current,
      [orgNumber]: parseGeneratedEmailText(text),
    }));
  }

  async function inspectWebsiteUrl(rawUrl: string, contextMatch?: BrregWebsiteMatch) {
    const url = normalizeStandaloneWebsiteInput(rawUrl);
    if (!url) {
      setWebsiteInspectionError("Legg inn en URL først.");
      return;
    }
    setWebsiteInspectionUrl(url);

    setIsWebsiteInspectionLoading(true);
    setWebsiteInspectionError(null);
    try {
      const response = await fetch(`/api/company-check/website-inspection/extended?url=${encodeURIComponent(url)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to inspect website", errorText);
        setWebsiteInspectionError("Klarte ikke sjekke nettsiden. Sjekk URL og prøv igjen.");
        return;
      }

      const payload = (await response.json()) as WebsiteInspectionResponse;
      setSelectedWebsiteInspection(contextMatch ? withInspectionContextMatch(payload, contextMatch) : payload);
    } catch (error) {
      console.error("Failed to inspect website", error);
      setWebsiteInspectionError("Klarte ikke sjekke nettsiden. Backend kan være opptatt eller utilgjengelig.");
    } finally {
      setIsWebsiteInspectionLoading(false);
    }
  }

  async function inspectStandaloneWebsite() {
    await inspectWebsiteUrl(websiteInspectionUrl);
  }

  const handleCloseActiveDialog = useEffectEvent(() => {
    if (selectedCompany) {
      closeDetailView();
      return;
    }
    setSelectedWebsiteInspection(null);
  });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function checkBackendHealth() {
      try {
        const response = await fetch("/api/company-check/health", {
          cache: "no-store",
        });

        if (!cancelled && response.ok) {
          setBackendReady(true);
          setError(null);
          return;
        }
      } catch {
        // Ignore expected startup failures while polling for readiness.
      }

      if (!cancelled) {
        setBackendReady(false);
        setError("Backend starter fortsatt. Prøv igjen om et øyeblikk.");
        timeoutId = setTimeout(() => {
          void checkBackendHealth();
        }, 1500);
      }
    }

    void checkBackendHealth();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!backendReady) {
      return;
    }

    runHydrateLandingData();
  }, [backendReady]);

  useEffect(() => {
    if (!isListLoading) {
      setListLoadProgress(0);
      setListLoadSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const updateProgress = () => {
      const elapsedMs = Date.now() - startedAt;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      setListLoadSeconds(elapsedSeconds);
      setListLoadProgress(estimateListProgress(elapsedMs));
    };

    updateProgress();
    const intervalId = setInterval(updateProgress, 200);

    return () => {
      clearInterval(intervalId);
    };
  }, [isListLoading]);

  async function hydrateLandingData() {
    setIsListLoading(true);

    try {
      await Promise.all([fetchFilters(), fetchRecent(0), fetchOutreachEntries()]);
      setInitialResultsReady(true);
    } finally {
      setIsListLoading(false);
    }
  }

  async function fetchFilters() {
    if (!backendReady) {
      return;
    }

    try {
      const response = await fetch("/api/company-check/filters", {
        cache: "no-store",
      });
      if (!response.ok) {
        if (response.status === 502) {
          const payload = await response.json().catch(() => null);
          setError(payload?.title ?? "Backend starter fortsatt. Prøv igjen om et øyeblikk.");
        }
        return;
      }

      const data = (await response.json()) as MetadataFiltersResponse;
      setMetadata(data);
    } catch (err) {
      console.error("Failed to fetch filters", err);
    }
  }

  async function fetchRecent(
    pageNum = 0,
    overrides?: {
      daysFilter?: string;
      countyFilter?: string;
      organizationFormFilter?: string;
      selectedLegend?: keyof typeof legendDetails | null;
      nameFilter?: string;
    }
  ) {
    if (!backendReady) {
      return;
    }

    const requestId = ++latestListRequestId.current;
    setIsListLoading(true);
    const effectiveDaysFilter = overrides?.daysFilter ?? daysFilter;
    const effectiveCountyFilter = overrides?.countyFilter ?? countyFilter;
    const effectiveOrganizationFormFilter = overrides?.organizationFormFilter ?? organizationFormFilter;
    const effectiveSelectedLegend = overrides?.selectedLegend === undefined ? selectedLegend : overrides.selectedLegend;
    const effectiveNameFilter = overrides?.nameFilter ?? debouncedNameFilter;
    const params = new URLSearchParams();
    params.set("dager", effectiveDaysFilter);
    params.set("page", pageNum.toString());
    if (effectiveCountyFilter) params.set("fylke", effectiveCountyFilter);
    if (effectiveOrganizationFormFilter) params.set("organizationForm", effectiveOrganizationFormFilter);
    if (effectiveSelectedLegend) params.set("score", effectiveSelectedLegend);
    if (effectiveNameFilter) params.set("navn", effectiveNameFilter);
    if (leadQuickFilters.includes("HAS_EMAIL")) params.set("hasEmail", "true");
    if (leadQuickFilters.includes("HAS_WEBSITE")) params.set("hasWebsite", "true");
    if (leadQuickFilters.includes("MISSING_WEBSITE")) params.set("missingWebsite", "true");

    try {
      const response = await fetch(`/api/company-check/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (requestId !== latestListRequestId.current) {
          return;
        }
        const items = Array.isArray(data) ? data : data.items || [];
        const nextTotalPages = Array.isArray(data) ? (items.length > 0 ? 1 : 0) : (data.totalPages ?? 0);
        setRecentCompanies(items);
        setPage(pageNum);
        setTotalPages(nextTotalPages);
        setError(null);
      } else if (response.status === 502) {
        const payload = await response.json().catch(() => null);
        if (requestId !== latestListRequestId.current) {
          return;
        }
        setRecentCompanies([]);
        setTotalPages(0);
        setError(payload?.title ?? "Backend starter fortsatt. Prøv igjen om et øyeblikk.");
      }
    } catch (err) {
      console.error("Failed to fetch recent companies", err);
    } finally {
      if (requestId === latestListRequestId.current) {
        setIsListLoading(false);
      }
    }
  }

  const runHydrateLandingData = useEffectEvent(() => {
    void hydrateLandingData();
  });

  const runRefreshRecent = useEffectEvent(() => {
    if (backendReady && initialResultsReady) {
      void fetchRecent(0);
    }
  });

  useEffect(() => {
    runRefreshRecent();
  }, [backendReady, initialResultsReady, daysFilter, countyFilter, organizationFormFilter, selectedLegend, leadQuickFilters, debouncedNameFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedNameFilter(nameFilter.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [nameFilter]);

  useEffect(() => {
    if (!backendReady || !selectedCompany) {
      setSelectedCompanyEvents([]);
      return;
    }

    let active = true;
    const orgNumber = selectedCompany.orgNumber;

    async function fetchSelectedCompanyData() {
      try {
        const eventsResponse = await fetch(`/api/company-check/${orgNumber}/events`, {
          cache: "no-store",
        });

        if (!active) {
          return;
        }

        const eventsPayload = eventsResponse.ok ? await eventsResponse.json() : [];

        setSelectedCompanyEvents(Array.isArray(eventsPayload) ? (eventsPayload as CompanyEvent[]) : []);
      } catch (err) {
        console.error("Failed to fetch company detail extras", err);
      }
    }

    void fetchSelectedCompanyData();

    return () => {
      active = false;
    };
  }, [backendReady, selectedCompany]);

  useEffect(() => {
    if (!backendReady || recentCompanies.length === 0) {
      return;
    }

    void fetchOutreachStatuses(recentCompanies.map((company) => company.orgNumber));
  }, [backendReady, recentCompanies]);

  useEffect(() => {
    if (!backendReady || !selectedCompany) {
      return;
    }

    void fetchOutreachStatuses([selectedCompany.orgNumber]);
  }, [backendReady, selectedCompany]);

  useEffect(() => {
    if (!backendReady || !selectedWebsiteInspection?.brregMatches?.length) {
      return;
    }

    void fetchOutreachStatuses(selectedWebsiteInspection.brregMatches.map((match) => match.orgNumber));
  }, [backendReady, selectedWebsiteInspection]);

  useEffect(() => {
    if (!selectedCompany && !selectedWebsiteInspection) {
      document.body.style.overflow = "";
      return;
    }

    dialogTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    window.requestAnimationFrame(() => dialog?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseActiveDialog();
        return;
      }
      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
      if (dialog?.open) {
        dialog.close();
      }
      dialogTriggerRef.current?.focus();
    };
  }, [selectedCompany, selectedWebsiteInspection]);

  useEffect(() => {
    const handlePopState = () => {
      hasDetailHistoryEntryRef.current = false;
      setSelectedCompany(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  async function openCompanyDetails(orgNumber: string) {
    if (!backendReady) {
      setError("Backend starter fortsatt. Prøv igjen om et øyeblikk.");
      return;
    }

    const trimmedOrgNumber = orgNumber.trim();
    setError(null);

    try {
      const response = await fetch(`/api/company-check/${trimmedOrgNumber}`, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.detail ?? "Klarte ikke hente selskapsdata.");
        return;
      }

      if (!hasDetailHistoryEntryRef.current) {
        window.history.pushState({ view: "company-detail", orgNumber: trimmedOrgNumber }, "", window.location.href);
        hasDetailHistoryEntryRef.current = true;
      }
      setSelectedCompany(payload as CompanyDetails);
    } catch {
      setError("Noe gikk galt ved kontakt med serveren.");
    }
  }

  function resetToLanding() {
    if (selectedCompany && hasDetailHistoryEntryRef.current) {
      closeDetailView();
      return;
    }
    setSelectedCompany(null);
    setActiveTab("leads");
    setSelectedLegend(null);
    setDaysFilter("5");
    setCountyFilter("");
    setOrganizationFormFilter("");
    setNameFilter("");
    setDebouncedNameFilter("");
    setLeadQuickFilters([]);
    void fetchRecent(0, {
      daysFilter: "5",
      countyFilter: "",
      organizationFormFilter: "",
      selectedLegend: null,
      nameFilter: "",
    });
  }

  function submitCompanySearch() {
    const value = nameFilter.trim();
    if (/^\d{9}$/.test(value)) {
      void openCompanyDetails(value);
      return;
    }
    setDebouncedNameFilter(value);
  }

  function closeDetailView() {
    if (hasDetailHistoryEntryRef.current) {
      hasDetailHistoryEntryRef.current = false;
      window.history.back();
      return;
    }
    setSelectedCompany(null);
  }

  function toggleLeadQuickFilter(filter: LeadQuickFilter) {
    setLeadQuickFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    );
  }

  const canUseEmailBatch = leadQuickFilters.includes("HAS_EMAIL") && leadQuickFilters.includes("MISSING_WEBSITE");
  const listQuickFilters = leadQuickFilters.filter((filter) => filter !== "NOT_SENT");
  const filteredCompanies = applyLeadQuickFilters((selectedLegend
    ? recentCompanies.filter((company) => company.scoreColor === selectedLegend)
    : recentCompanies
  ), outreachStatusByOrg, listQuickFilters).sort(canUseEmailBatch ? compareEmailBatchPriority : compareLeadPriority);
  const visibleSearchCompanies = filteredCompanies.filter((company) => {
    const outreachStatus = outreachStatusByOrg[company.orgNumber];
    const batchBlocked = outreachStatus?.status === "batch_excluded"
      || batchValidationByOrg[company.orgNumber]?.status === "blocked";
    return !outreachStatus?.sent
      && outreachStatus?.status !== "not_relevant"
      && ((canUseEmailBatch && showBatchExcluded) || !batchBlocked);
  });
  const selectedBatchCompanies = canUseEmailBatch
    ? visibleSearchCompanies.filter((company) =>
      batchSelectionByOrg[company.orgNumber]
      && canSelectEmailBatchCandidate(company)
      && batchValidationByOrg[company.orgNumber]?.status !== "blocked"
      && !isBatchExcluded(outreachStatusByOrg[company.orgNumber])
    )
    : [];
  const sendableBatchCount = selectedBatchCompanies.filter((company) => Boolean(company.email)).length;
  const overEmailBatchLimit = sendableBatchCount > MAX_EMAIL_BATCH_SIZE;
  const hiddenByOutreachCount = filteredCompanies.length - visibleSearchCompanies.length;
  const visibleBatchValidationKey = canUseEmailBatch
    ? visibleSearchCompanies
      .filter((company) => company.email && canSelectEmailBatchCandidate(company))
      .map((company) => company.orgNumber)
      .join("|")
    : "";
  const resultsSummary = buildResultsSummary(
    daysFilter,
    countyFilter,
    organizationFormFilter,
    metadata.organizationForms,
    selectedLegend,
  );
  const filterButtonDisabled = !initialResultsReady || isListLoading;

  useEffect(() => {
    if (!canUseEmailBatch || !visibleBatchValidationKey) {
      return;
    }

    let cancelled = false;
    const companiesToValidate = visibleSearchCompanies.filter((company) => {
      const validation = batchValidationByOrg[company.orgNumber];
      return company.email
        && canSelectEmailBatchCandidate(company)
        && !isBatchExcluded(outreachStatusByOrg[company.orgNumber])
        && validation?.status !== "ready"
        && validation?.status !== "blocked"
        && validation?.status !== "checking";
    });

    async function validateVisibleBatchCandidates() {
      for (const company of companiesToValidate) {
        if (cancelled) {
          return;
        }
        setBatchValidationByOrg((current) => ({
          ...current,
          [company.orgNumber]: { status: "checking", startedAt: Date.now() },
        }));
        const validation = await validateCompanyForBatchSelection(company);
        if (cancelled) {
          return;
        }
        setBatchValidationByOrg((current) => ({
          ...current,
          [company.orgNumber]: validation.reason
            ? { status: "blocked", reason: validation.reason ?? undefined }
            : { status: "ready" },
        }));
      }
    }

    void validateVisibleBatchCandidates();

    return () => {
      cancelled = true;
    };
  // Validation is intentionally keyed by the serialized visible candidate set.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseEmailBatch, visibleBatchValidationKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const cutoff = Date.now() - EMAIL_BATCH_VALIDATION_TIMEOUT_MS - 2_000;
      setBatchValidationByOrg((current) => {
        let changed = false;
        const next = { ...current };
        for (const [orgNumber, validation] of Object.entries(current)) {
          if (validation.status === "checking" && (validation.startedAt ?? 0) < cutoff) {
            next[orgNumber] = {
              status: "blocked",
              reason: "Batch-sjekk tok for lang tid. Prøv igjen eller åpne detaljsiden.",
            };
            changed = true;
          }
        }
        return changed ? next : current;
      });
    }, 3_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-[#1F5FA9]/10">
      <button
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#1F5FA9] focus:shadow-lg"
        onClick={() => scrollToSection("main-content")}
        type="button"
      >
        Hopp til innhold
      </button>

      <header className="sticky top-0 z-30 border-b border-[#D9E2EC] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <button
            className="flex items-center gap-3 text-left"
            onClick={resetToLanding}
            type="button"
          >
            <div className="flex size-10 items-center justify-center rounded-sm border border-[#1F5FA9] bg-white text-sm font-bold text-[#1F5FA9]">
              N
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#52606D]">
                Registerbasert virksomhetssøk
              </p>
              <p className="text-[15px] font-semibold tracking-tight text-[#1F2933]">
                NyFirmasjekk
              </p>
            </div>
          </button>
          <nav aria-label="Arbeidsflater" className="flex min-w-0 items-center gap-1 overflow-x-auto">
            <WorkspaceTabButton
              active={activeTab === "leads"}
              icon={LayoutList}
              label="Leads"
              onClick={() => setActiveTab("leads")}
            />
            <WorkspaceTabButton
              active={activeTab === "website"}
              icon={MonitorCheck}
              label="Nettsidesjekk"
              onClick={() => setActiveTab("website")}
            />
            <WorkspaceTabButton
              active={activeTab === "outreach"}
              count={getLatestOutreachEntriesByOrg(outreachEntries).length}
              icon={Send}
              label="Utsendelser"
              onClick={() => setActiveTab("outreach")}
            />
          </nav>
        </div>
      </header>

      <main id="main-content" className="pb-16">
        <div className={selectedCompany || selectedWebsiteInspection ? "pointer-events-none select-none blur-[3px] transition-all duration-200" : "transition-all duration-200"}>
          {activeTab === "leads" ? (
          <section id="search" className="mx-auto max-w-7xl px-6 pt-6 sm:pt-8">
            <div className="grid gap-4">
              <div className="border border-[#D9E2EC] bg-white px-5 py-5 sm:px-6">
                <div className="max-w-3xl">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#1F2933] sm:text-3xl">
                    Finn og prioriter nye virksomheter
                  </h1>
                  <p className="mt-2 text-[14px] text-[#52606D]">Søk, vurder og velg neste handling fra samme arbeidsflate.</p>
                </div>

                <div className="mt-5 flex flex-col gap-2 lg:flex-row">
                  <form
                    className="relative flex min-w-0 flex-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitCompanySearch();
                    }}
                  >
                    <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#829AB1]" />
                    <input
                      aria-label="Søk etter virksomhet"
                      className="h-10 w-full rounded-sm border border-[#BCCCDC] bg-white pl-10 pr-10 text-[14px] text-[#1F2933] outline-none placeholder:text-[#829AB1] focus:border-[#1F5FA9] focus:ring-2 focus:ring-[#1F5FA9]/15"
                      onChange={(event) => setNameFilter(event.target.value)}
                      placeholder="Søk på navn eller organisasjonsnummer"
                      value={nameFilter}
                    />
                    {nameFilter ? (
                      <button
                        aria-label="Tøm søk"
                        className="absolute right-1 top-1 flex size-8 items-center justify-center text-[#52606D] hover:text-[#1F2933]"
                        onClick={() => {
                          setNameFilter("");
                          setDebouncedNameFilter("");
                        }}
                        title="Tøm søk"
                        type="button"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </form>
                  <div className="flex gap-2">
                    <select
                      aria-label="Filtrer på fylke"
                      className="h-10 min-w-44 flex-1 rounded-sm border border-[#BCCCDC] bg-white px-3 text-[13px] font-medium text-[#52606D] outline-none focus:border-[#1F5FA9] lg:flex-none"
                      disabled={filterButtonDisabled}
                      onChange={(event) => setCountyFilter(event.target.value)}
                      value={countyFilter}
                    >
                      <option value="">Hele landet</option>
                      {countyOptions.map((county) => <option key={county} value={county}>{county}</option>)}
                    </select>
                    <Button
                      aria-expanded={showAdvancedFilters}
                      className="h-10 rounded-sm border-[#BCCCDC] px-3"
                      onClick={() => setShowAdvancedFilters((current) => !current)}
                      type="button"
                      variant="outline"
                    >
                      <SlidersHorizontal className="size-4" />
                      Filtre
                      <ChevronDown className={`size-4 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`} />
                    </Button>
                  </div>
                </div>

                {showAdvancedFilters ? (
                <div className="mt-5 border-t border-[#E4E7EB] pt-4">
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-[#52606D]">Selskapsform:</span>
                  {visibleOrganizationForms.map((code) => (
                    <div key={code} className="relative inline-flex items-center gap-1.5">
                      <button
                        className={`peer rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          organizationFormFilter === code
                            ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                            : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                        } disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[#D9E2EC]`}
                        disabled={filterButtonDisabled}
                        onClick={() => {
                          setOrganizationFormFilter((current) => (current === code ? "" : code));
                        }}
                        type="button"
                        >
                          {code}
                        </button>
                      <div
                        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-80 -translate-x-1/2 translate-y-1 rounded-[18px] border border-[#D9E2EC] bg-white p-4 text-left opacity-0 shadow-[0_20px_50px_-24px_rgba(31,95,169,0.35)] transition-all duration-150 peer-hover:translate-y-0 peer-hover:opacity-100 peer-focus-visible:translate-y-0 peer-focus-visible:opacity-100"
                        role="tooltip"
                      >
                        <p className="text-[12px] font-medium text-[#52606D]">Organisasjonsform</p>
                        <p className="mt-1 text-[14px] font-semibold text-[#1F2933]">
                          {code} - {organizationFormHelp[code].label}
                        </p>
                        <p className="mt-2 text-[13px] leading-6 text-[#52606D]">
                          {organizationFormHelp[code].description}
                        </p>
                        <p className="mt-3 text-[12px] font-medium text-[#1F5FA9]">
                          Brukes som filter i søket.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-[#52606D]">Registerstatus:</span>
                  {legend.map((item) => (
                    <button
                      key={item.status}
                      className={`rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        selectedLegend === item.status
                          ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                          : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                      } disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[#D9E2EC]`}
                      disabled={filterButtonDisabled}
                      onClick={() =>
                        setSelectedLegend((current) =>
                          current === item.status ? null : (item.status as keyof typeof legendDetails)
                        )
                      }
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="text-[#52606D]">Tidsrom:</span>
                  {dayOptions.map((days) => {
                    const label = days === "0" ? "Alle data" : `${days} dager`;
                    const isSelected = daysFilter === days;

                    return (
                      <button
                        key={days}
                        aria-pressed={isSelected}
                        className={`rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          isSelected
                            ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                            : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                        } disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-[#D9E2EC]`}
                        disabled={filterButtonDisabled}
                        onClick={() => {
                          setDaysFilter(days);
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-[#1F5FA9]">
                  <button
                    className="hover:underline"
                    onClick={() => {
                    setDaysFilter("5");
                    setCountyFilter("");
                    setOrganizationFormFilter("");
                    setSelectedLegend(null);
                    setNameFilter("");
                    setDebouncedNameFilter("");
                    setLeadQuickFilters([]);
                    scrollToSection("search");
                  }}
                  type="button"
                >
                    Nullstill filtre
                  </button>
                </div>
                </div>
                ) : null}

              </div>

            </div>
          </section>
          ) : null}

          {activeTab === "website" ? (
            <section className="mx-auto max-w-7xl px-6 py-8" id="website-workspace">
              <div className="border border-[#D9E2EC] bg-white p-5 sm:p-7">
                <div className="max-w-2xl">
                  <p className="text-[12px] font-semibold uppercase text-[#52606D]">Nettsidesjekk</p>
                  <h1 className="mt-1 text-2xl font-semibold text-[#1F2933]">Vurder en nettside</h1>
                  <p className="mt-2 text-[14px] leading-6 text-[#52606D]">
                    Kontroller teknisk trygghet, tilgjengelighet, personvern, innhold, skjema og sikkerhetsheadere.
                  </p>
                </div>
                <form
                  className="mt-6 flex max-w-3xl flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void inspectStandaloneWebsite();
                  }}
                >
                  <div className="relative flex-1">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#829AB1]" />
                    <input
                      aria-label="URL som skal sjekkes"
                      className="h-11 w-full rounded-sm border border-[#BCCCDC] bg-white pl-10 pr-3 text-[14px] text-[#1F2933] outline-none placeholder:text-[#829AB1] focus:border-[#1F5FA9] focus:ring-2 focus:ring-[#1F5FA9]/15"
                      inputMode="url"
                      onChange={(event) => setWebsiteInspectionUrl(event.target.value)}
                      placeholder="https://eksempel.no"
                      type="text"
                      value={websiteInspectionUrl}
                    />
                  </div>
                  <Button className="h-11 rounded-sm bg-[#1F5FA9] px-5 text-white hover:bg-[#2F6FB2]" disabled={isWebsiteInspectionLoading} type="submit">
                    <MonitorCheck className="size-4" />
                    {isWebsiteInspectionLoading ? "Sjekker..." : "Sjekk nettside"}
                  </Button>
                </form>
                {websiteInspectionError ? (
                  <p className="mt-3 border border-rose-100 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">{websiteInspectionError}</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeTab === "outreach" ? (
          <OutreachOverview
            entries={outreachEntries}
            error={outreachListError}
            importMessage={outreachImportMessage}
            isImporting={isOutreachImporting}
            isLoading={isOutreachListLoading}
            onImportAction={(file) => void importOutreachLog(file)}
            onOpenCompanyAction={(orgNumber) => void openCompanyDetails(orgNumber)}
            onRefreshAction={() => void fetchOutreachEntries()}
          />
          ) : null}

          {/* Dynamic Content */}
          {activeTab === "leads" ? (
          <section id="results" className="mx-auto max-w-7xl px-6 pb-24 pt-10">
          {error && (
            <div className="mx-auto mb-12 max-w-2xl border border-rose-100/60 bg-rose-50/50 p-7 text-center animate-in zoom-in duration-300">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center bg-rose-100 text-rose-600">
                <AlertCircle className="size-6" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-rose-900">Noe gikk galt</h3>
              <p className="mb-6 text-[15px] font-medium text-rose-700/80">{error}</p>
              <Button
                className="rounded-full bg-rose-600 font-bold text-white hover:bg-rose-700"
                onClick={() => {
                  setError(null);
                  void fetchRecent(0);
                }}
              >
                Prøv igjen
              </Button>
            </div>
          )}

            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
              {isListLoading && (
                <div className="border border-[#D9E2EC] bg-white px-5 py-4">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-medium text-[#52606D]">
                        Søker i registerdata
                      </p>
                      <p className="mt-1 text-[14px] font-medium text-[#52606D]">
                        {listLoadSeconds < 8
                          ? "Henter første treffliste."
                          : "Søket er fortsatt i gang. Filteret jobber mot mange selskaper."}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-[12px] font-bold text-[#52606D]">
                      {listLoadSeconds}s
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden bg-[#E4E7EB]">
                    <div
                      className="h-full bg-[#1F5FA9] transition-[width] duration-200 ease-out"
                      style={{ width: `${listLoadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1F2933]">Aktuelle selskaper</h2>
                  <p className="mt-1 text-[14px] font-medium leading-6 text-[#52606D]">{resultsSummary}</p>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#52606D]">
                    Viser {visibleSearchCompanies.length} aktuelle treff på denne siden
                    {hiddenByOutreachCount > 0
                      ? ` (${hiddenByOutreachCount} skjult fordi de er sendt eller ikke aktuelle).`
                      : "."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-col gap-2 border border-[#D9E2EC] bg-white px-2 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 0 || isListLoading}
                        onClick={() => void fetchRecent(page - 1)}
                      >
                        Forrige
                      </Button>
                      <span className="min-w-24 text-center text-sm font-medium">
                        Side {totalPages > 0 ? page + 1 : 0} av {Math.max(totalPages, 0)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page + 1 >= totalPages || isListLoading}
                        onClick={() => void fetchRecent(page + 1)}
                      >
                        Neste
                      </Button>
                    </div>
                    {totalPages > 1 ? (
                      <div className="flex max-w-[360px] flex-wrap justify-center gap-1">
                        {paginationItems(page, totalPages).map((item, index) =>
                          item === "..." ? (
                            <span
                              key={`ellipsis-${index}`}
                              className="flex h-8 min-w-8 items-center justify-center px-1 text-[12px] font-medium text-[#829AB1]"
                            >
                              ...
                            </span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              disabled={isListLoading || item === page}
                              onClick={() => void fetchRecent(item)}
                              className={`h-8 min-w-8 border px-2 text-[12px] font-semibold transition-colors ${
                                item === page
                                  ? "border-[#1F5FA9] bg-[#1F5FA9] text-white"
                                  : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933] disabled:cursor-not-allowed disabled:opacity-50"
                              }`}
                              aria-current={item === page ? "page" : undefined}
                              aria-label={`Gå til side ${item + 1}`}
                            >
                              {item + 1}
                            </button>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                </div>
              <div className="border border-[#D9E2EC] bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="mr-1 text-[#52606D]">Hurtigfilter:</span>
                  {leadQuickFilterOptions.map((option) => {
                    const active = leadQuickFilters.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        className={`rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                            : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                        }`}
                        onClick={() => toggleLeadQuickFilter(option.value)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    );
                  })}
                  {leadQuickFilters.length > 0 ? (
                    <button
                      className="ml-1 text-[12px] font-semibold text-[#1F5FA9] hover:underline"
                      onClick={() => setLeadQuickFilters([])}
                      type="button"
                    >
                      Nullstill hurtigfilter
                    </button>
                  ) : null}
                  <label
                    className={`ml-1 inline-flex h-8 items-center gap-2 whitespace-nowrap text-[12px] font-semibold ${
                      canUseEmailBatch ? "cursor-pointer text-[#52606D]" : "cursor-not-allowed text-[#9FB3C8]"
                    }`}
                    title={canUseEmailBatch ? undefined : "Velg Har e-post og Mangler nettside for å vise batch-sperrede rader."}
                  >
                    <input
                      checked={showBatchExcluded}
                      className="peer sr-only"
                      disabled={!canUseEmailBatch}
                      onChange={(event) => setShowBatchExcluded(event.target.checked)}
                      role="switch"
                      type="checkbox"
                    />
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition-colors ${
                        showBatchExcluded
                          ? "border-[#1F5FA9] bg-[#1F5FA9]"
                          : "border-[#BCCCDC] bg-[#E4E7EB]"
                      } ${canUseEmailBatch ? "" : "opacity-50"}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute left-0.5 top-0.5 size-3.5 rounded-full bg-white shadow-sm transition-transform ${
                          showBatchExcluded ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </span>
                    Vis batch-sperret
                  </label>
                  <Button
                    className="ml-auto rounded-sm border-[#1F5FA9] text-[12px] font-semibold"
                    disabled={!canUseEmailBatch || selectedBatchCompanies.length === 0 || overEmailBatchLimit || isBatchSending}
                    onClick={() => void runEmailBatch(selectedBatchCompanies)}
                    size="sm"
                    title={
                      !canUseEmailBatch
                        ? "Velg Har e-post og Mangler nettside før batch kan kjøres."
                        : overEmailBatchLimit
                          ? `Velg maks ${MAX_EMAIL_BATCH_SIZE} virksomheter per batch.`
                          : undefined
                    }
                    type="button"
                    variant="outline"
                  >
                    {isBatchSending ? "Sender batch..." : "Kjør e-post batch"}
                    {selectedBatchCompanies.length > 0 ? ` (${sendableBatchCount}/${selectedBatchCompanies.length})` : ""}
                  </Button>
                  {overEmailBatchLimit ? (
                    <span className="basis-full text-[12px] font-medium text-[#9F580A] sm:basis-auto">
                      Maks {MAX_EMAIL_BATCH_SIZE} per batch.
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="overflow-hidden border border-[#D9E2EC] bg-white">
                {!isListLoading && visibleSearchCompanies.length > 0 ? (
                  <div className="hidden grid-cols-[minmax(240px,1.5fr)_minmax(170px,1fr)_minmax(190px,1fr)_minmax(150px,.8fr)_44px] gap-4 border-b border-[#D9E2EC] bg-[#F8FBFF] px-4 py-2.5 text-[11px] font-semibold uppercase text-[#52606D] lg:grid">
                    <span>Virksomhet</span>
                    <span>Prioritet</span>
                    <span>Kontakt</span>
                    <span>Registerrisiko</span>
                    <span className="sr-only">Handling</span>
                  </div>
                ) : null}
              {isListLoading && recentCompanies.length === 0 ? (
                ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"].map((skeletonKey) => (
                  <div key={skeletonKey} className="grid animate-pulse gap-3 border-b border-[#E4E7EB] p-4 last:border-b-0 lg:grid-cols-4">
                    <div className="space-y-2">
                      <div className="h-4 w-3/4 bg-[#E4E7EB]" />
                      <div className="h-3 w-1/2 bg-[#E4E7EB]" />
                    </div>
                    <div className="h-4 w-24 bg-[#E4E7EB]" />
                    <div className="h-4 w-36 bg-[#E4E7EB]" />
                    <div className="h-4 w-20 bg-[#E4E7EB]" />
                  </div>
                ))
              ) : visibleSearchCompanies.length > 0 ? (
                visibleSearchCompanies.map((company) => (
                  <LeadResultRow
                    key={company.orgNumber}
                    company={company}
                    onClick={() => void openCompanyDetails(company.orgNumber)}
                    outreachStatus={outreachStatusByOrg[company.orgNumber] ?? null}
                    batchSelectable={canUseEmailBatch && canSelectEmailBatchCandidate(company) && batchValidationByOrg[company.orgNumber]?.status !== "blocked" && !isBatchExcluded(outreachStatusByOrg[company.orgNumber])}
                    batchSelected={Boolean(batchSelectionByOrg[company.orgNumber])}
                    batchValidation={batchValidationByOrg[company.orgNumber] ?? null}
                    onToggleBatch={(selected) => void toggleBatchSelectionWithValidation(company, selected)}
                  />
                ))
              ) : (
                  <div className="col-span-full rounded-[18px] border border-dashed border-[#D9E2EC] bg-[#F0F4F8] px-6 py-14 text-center">
                    <p className="mb-2 text-[12px] font-medium text-[#52606D]">
                      Ingen selskaper funnet
                    </p>
                    <p className="mx-auto max-w-sm text-[16px] font-medium leading-relaxed text-[#52606D]">
                      Vi fant ingen virksomheter som samsvarer med valgte filtre.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                      <Button
                        variant="outline"
                        className="rounded-full bg-white font-bold"
                        onClick={() => {
                          setDaysFilter("5");
                          setCountyFilter("");
                          setOrganizationFormFilter("");
                          setSelectedLegend(null);
                          setLeadQuickFilters([]);
                          void fetchRecent(0);
                        }}
                      >
                        Nullstill alle filtre
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          ) : null}
        </div>

        {selectedCompany ? (
          <dialog
            ref={dialogRef}
            aria-label={`Virksomhetsdetaljer for ${selectedCompany.name}`}
            className="m-auto max-h-[88vh] w-[calc(100%-2rem)] max-w-7xl overflow-y-auto border border-[#BCCCDC] bg-white p-0 text-[#1F2933] shadow-[0_24px_80px_-32px_rgba(16,42,67,0.35)] backdrop:bg-[#102A4314] backdrop:backdrop-blur-sm sm:w-[calc(100%-3rem)]"
            tabIndex={-1}
          >
            <CompanyDetailView
              company={selectedCompany}
              events={selectedCompanyEvents.length > 0 ? selectedCompanyEvents : selectedCompany.events}
              generatedEmail={generatedEmailByOrg[selectedCompany.orgNumber] ?? null}
              generatingEmail={Boolean(generatingEmailByOrg[selectedCompany.orgNumber])}
              emailSendError={emailSendErrorByOrg[selectedCompany.orgNumber] ?? null}
              emailSentRecipient={emailSentRecipientByOrg[selectedCompany.orgNumber] ?? null}
              sendingEmail={Boolean(sendingEmailByOrg[selectedCompany.orgNumber])}
              outreachSaving={Boolean(savingOutreachByOrg[selectedCompany.orgNumber])}
              outreachStatus={outreachStatusByOrg[selectedCompany.orgNumber] ?? null}
              onBack={resetToLanding}
              onGenerateEmail={() => void generateOutreachEmail(selectedCompany)}
              onSendEmail={() => void sendGeneratedOutreachEmail(selectedCompany, generatedEmailByOrg[selectedCompany.orgNumber] ?? null)}
              onUpdateGeneratedEmail={(text) => updateGeneratedEmail(selectedCompany.orgNumber, text)}
              onToggleOutreach={(sent, note, statusOverride) => void updateOutreachStatus(selectedCompany, sent, note, statusOverride)}
              onInspectWebsite={(url) => void inspectWebsiteUrl(url, brregWebsiteMatchFromCompany(selectedCompany, url))}
            />
          </dialog>
        ) : null}

        {selectedWebsiteInspection ? (
          <dialog
            ref={dialogRef}
            aria-label={`Nettsidesjekk for ${selectedWebsiteInspection.normalizedUrl}`}
            className="m-auto max-h-[88vh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto border border-[#BCCCDC] bg-white p-0 text-[#1F2933] shadow-[0_24px_80px_-32px_rgba(16,42,67,0.35)] backdrop:bg-[#102A4314] backdrop:backdrop-blur-sm sm:w-[calc(100%-3rem)]"
            tabIndex={-1}
          >
            <WebsiteInspectionDetail
              inspection={selectedWebsiteInspection}
              outreachStatusByOrg={outreachStatusByOrg}
              onBack={() => setSelectedWebsiteInspection(null)}
              onOutreachEmailSent={(status) => {
                setOutreachStatusByOrg((current) => ({
                  ...current,
                  [status.orgNumber]: status,
                }));
                setOutreachEntries((current) => [status, ...current]);
              }}
            />
          </dialog>
        ) : null}
      </main>
    </div>
  );
}

function WebsiteInspectionDetail({
  inspection,
  outreachStatusByOrg,
  onBack,
  onOutreachEmailSent,
}: Readonly<{
  inspection: WebsiteInspectionResponse;
  outreachStatusByOrg: Record<string, OutreachStatus>;
  onBack: () => void;
  onOutreachEmailSent: (status: OutreachStatus) => void;
}>) {
  const [currentInspection, setCurrentInspection] = useState(inspection);

  useEffect(() => {
    setCurrentInspection(inspection);
  }, [inspection]);

  return (
    <article className="bg-white">
      <div className="sticky top-0 z-10 border-b border-[#D9E2EC] bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <button
          className="inline-flex items-center gap-2 rounded-sm border border-[#D9E2EC] bg-white px-3 py-2 text-[13px] font-semibold text-[#1F2933] hover:bg-[#F8FBFF]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Tilbake til treff
        </button>
      </div>
      <div className="px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#52606D]">
          Nettsidesjekk
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#1F2933]">
              {stripWebsiteProtocol(currentInspection.normalizedUrl)}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#52606D]">
              Frittstående kvalitetskontroll uten BRREG-kontekst. Funnene er automatiske signaler og bør vurderes manuelt før de brukes i kundedialog.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <a
              className="inline-flex w-fit rounded-sm border border-[#D9E2EC] bg-white px-3 py-2 text-[12px] font-semibold text-[#1F5FA9] hover:bg-[#F8FBFF]"
              href={currentInspection.normalizedUrl}
              rel="noreferrer"
              target="_blank"
            >
              Åpne nettside
            </a>
          </div>
        </div>
        <div className="mt-4 border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3 text-[12px] leading-5 text-[#52606D]">
          Sjekken inkluderer teknisk trygghet, UU/WCAG-signaler, personvern, innhold, skjema, sikkerhetsheadere og publisert tilgjengelighetserklæring fra uustatus.no når siden lenker dit.
        </div>
        <WebsiteQualityPanel className="mt-6" quality={currentInspection.websiteQuality} />
        <BrregWebsiteMatchesPanel
          inspection={currentInspection}
          matches={currentInspection.brregMatches ?? []}
          outreachStatusByOrg={outreachStatusByOrg}
          onOutreachEmailSent={onOutreachEmailSent}
        />
      </div>
    </article>
  );
}

function BrregWebsiteMatchesPanel({
  inspection,
  matches,
  outreachStatusByOrg,
  onOutreachEmailSent,
}: Readonly<{
  inspection: WebsiteInspectionResponse;
  matches: WebsiteInspectionResponse["brregMatches"];
  outreachStatusByOrg: Record<string, OutreachStatus>;
  onOutreachEmailSent: (status: OutreachStatus) => void;
}>) {
  const [generatedEmailByOrg, setGeneratedEmailByOrg] = useState<Record<string, { subject: string; body: string }>>({});
  const [generatingByOrg, setGeneratingByOrg] = useState<Record<string, boolean>>({});
  const [sendingByOrg, setSendingByOrg] = useState<Record<string, boolean>>({});
  const [sendErrorByOrg, setSendErrorByOrg] = useState<Record<string, string | null>>({});
  const [sentRecipientByOrg, setSentRecipientByOrg] = useState<Record<string, string | null>>({});

  async function generateEmail(match: BrregWebsiteMatch) {
    setGeneratingByOrg((current) => ({ ...current, [match.orgNumber]: true }));
    try {
      const response = await fetch("/api/outreach-email-template", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { content?: string };
      const company = companyFromBrregWebsiteMatch(match, inspection);
      setGeneratedEmailByOrg((current) => ({
        ...current,
        [match.orgNumber]: {
          subject: buildOutreachEmailSubject(payload.content ?? "", company),
          body: buildOutreachEmailBody(payload.content ?? "", company),
        },
      }));
    } finally {
      setGeneratingByOrg((current) => ({ ...current, [match.orgNumber]: false }));
    }
  }

  async function sendEmail(match: BrregWebsiteMatch) {
    const generatedEmail = generatedEmailByOrg[match.orgNumber];
    if (!match.email || !generatedEmail) {
      return;
    }

    setSendingByOrg((current) => ({ ...current, [match.orgNumber]: true }));
    setSendErrorByOrg((current) => ({ ...current, [match.orgNumber]: null }));
    setSentRecipientByOrg((current) => ({ ...current, [match.orgNumber]: null }));
    try {
      const response = await fetch(`/api/company-check/${match.orgNumber}/send-outreach-email`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: match.email,
          subject: generatedEmail.subject,
          body: generatedEmail.body,
          htmlBody: buildOutreachEmailHtml(generatedEmail.body),
          companyName: match.name,
          organizationForm: match.organizationForm,
          price: null,
          channel: "email",
          offerType: "website-improvement-offer",
          note: `Sendt fra nettsidesjekk: ${inspection.normalizedUrl}`,
        }),
      });
      if (!response.ok) {
        setSendErrorByOrg((current) => ({
          ...current,
          [match.orgNumber]: "Klarte ikke sende e-post via SMTP.",
        }));
        return;
      }
      const payload = (await response.json()) as { to: string; outreachStatus?: OutreachStatus };
      setSentRecipientByOrg((current) => ({ ...current, [match.orgNumber]: payload.to }));
      if (payload.outreachStatus) {
        onOutreachEmailSent(payload.outreachStatus);
      }
    } catch {
      setSendErrorByOrg((current) => ({
        ...current,
        [match.orgNumber]: "Klarte ikke sende e-post via SMTP.",
      }));
    } finally {
      setSendingByOrg((current) => ({ ...current, [match.orgNumber]: false }));
    }
  }

  return (
    <div className="mt-6 border border-[#D9E2EC] bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-[#52606D]">BRREG-kobling</p>
          <h4 className="mt-1 text-[17px] font-semibold text-[#1F2933]">
            {matches.length > 0 ? `${matches.length} mulige registertreff` : "Ingen direkte treff på registrert hjemmeside"}
          </h4>
        </div>
        <span className="inline-flex w-fit rounded-sm bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
          Hjemmeside
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[#52606D]">
        Sjekker om domenet finnes som registrert hjemmeside i BRREG. Dette kan gi e-postadresse, telefon, org.nr. og bransje, men flere virksomheter kan dele samme domene.
      </p>
      {matches.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {matches.map((match) => (
            <div key={match.orgNumber} className="border border-[#E4E7EB] bg-[#F8FBFF] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-[#1F2933]">{match.name}</p>
                  <p className="mt-1 text-[12px] font-medium text-[#52606D]">
                    {[match.orgNumber, match.organizationForm, match.naceCode].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  className="w-fit rounded-sm border border-[#D9E2EC] bg-white px-3 py-2 text-[12px] font-semibold text-[#1F5FA9] hover:bg-[#F8FBFF]"
                  onClick={() => void navigator.clipboard.writeText(match.orgNumber)}
                  type="button"
                >
                  Kopier org.nr
                </button>
              </div>
              <div className="mt-3 grid gap-2 text-[12px] text-[#52606D] sm:grid-cols-2">
                <p><span className="font-semibold text-[#1F2933]">E-post:</span>{" "}{match.email || "Ikke registrert"}</p>
                <p><span className="font-semibold text-[#1F2933]">Telefon:</span>{" "}{match.phone || match.mobile || "Ikke registrert"}</p>
                <p><span className="font-semibold text-[#1F2933]">Nettside:</span>{" "}{match.website || "Ikke registrert"}</p>
                <p><span className="font-semibold text-[#1F2933]">Sted:</span>{" "}{[match.municipality, match.county].filter(Boolean).join(", ") || "Ikke registrert"}</p>
                <p><span className="font-semibold text-[#1F2933]">Bransje:</span>{" "}{match.naceDescription || "Ikke registrert"}</p>
                <p><span className="font-semibold text-[#1F2933]">Registrert:</span>{" "}{match.registrationDate || "Ikke registrert"}</p>
              </div>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7B8794]">
                {match.matchReason}
              </p>
              <OutreachCheckbox
                compact
                className="mt-4"
                onToggle={() => undefined}
                saving={false}
                status={outreachStatusByOrg[match.orgNumber] ?? null}
              />
              <div className="mt-4 border-t border-[#D9E2EC] pt-4">
                <p className="mb-3 text-[12px] leading-5 text-[#52606D]">
                  Utsending loggføres på <span className="font-semibold text-[#1F2933]">{match.name}</span>
                  {" "}({match.orgNumber}). Mottaker: {match.email || "ingen e-post registrert"}.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="rounded-sm bg-[#1F5FA9] px-4 text-white hover:bg-[#2F6FB2]"
                    disabled={Boolean(generatingByOrg[match.orgNumber])}
                    onClick={() => void generateEmail(match)}
                    type="button"
                  >
                    {generatingByOrg[match.orgNumber] ? "Genererer..." : "Generer mailtekst"}
                  </Button>
                  <Button
                    className="rounded-sm border-[#BCCCDC] bg-white px-4 text-[#1F2933] hover:bg-[#F8FBFF]"
                    disabled={!match.email || !generatedEmailByOrg[match.orgNumber] || Boolean(sendingByOrg[match.orgNumber])}
                    onClick={() => void sendEmail(match)}
                    type="button"
                    variant="outline"
                  >
                    {sendingByOrg[match.orgNumber] ? "Sender..." : "Send automatisk"}
                  </Button>
                  {!match.email ? (
                    <span className="text-[12px] font-medium text-[#7B8794]">Mangler e-post i BRREG</span>
                  ) : null}
                </div>
                {generatedEmailByOrg[match.orgNumber] ? (
                  <div className="mt-3">
                    <textarea
                      className="min-h-64 w-full rounded-sm border border-[#D9E2EC] bg-white p-3 text-[13px] leading-6 text-[#1F2933] outline-none focus:border-[#2F6FB2]"
                      onChange={(event) => {
                        const parsed = parseGeneratedEmailText(event.target.value);
                        setGeneratedEmailByOrg((current) => ({
                          ...current,
                          [match.orgNumber]: parsed,
                        }));
                      }}
                      value={`Emne: ${generatedEmailByOrg[match.orgNumber].subject}\n\n${generatedEmailByOrg[match.orgNumber].body}`}
                    />
                  </div>
                ) : null}
                {sentRecipientByOrg[match.orgNumber] ? (
                  <p className="mt-2 text-[12px] font-semibold text-emerald-700">
                    Sendt til {sentRecipientByOrg[match.orgNumber]}
                  </p>
                ) : null}
                {sendErrorByOrg[match.orgNumber] ? (
                  <p className="mt-2 text-[12px] font-semibold text-rose-700">
                    {sendErrorByOrg[match.orgNumber]}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function copyWebsiteReport(text: string, onCopied: (value: boolean) => void) {
  if (!text) {
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    onCopied(true);
    window.setTimeout(() => onCopied(false), 1800);
  } catch (error) {
    console.error("Failed to copy website report", error);
  }
}

function WebsiteQualityPanel({
  quality,
  className = "",
}: Readonly<{
  quality: WebsiteQualityAssessment;
  className?: string;
}>) {
  const visibleSignals = prioritizedWebsiteQualitySignals(quality.signals, 10);
  const visibleSignalCodes = new Set(visibleSignals.map((signal) => signal.code));
  const hiddenSignals = quality.signals.filter((signal) => !visibleSignalCodes.has(signal.code));
  const groupedSignals = groupWebsiteQualitySignals(visibleSignals);
  const advancedSignals = hiddenSignals.filter(isAdvancedWebsiteSignal);
  const otherHiddenSignals = hiddenSignals.filter((signal) => !isAdvancedWebsiteSignal(signal));
  const hiddenGroupedSignals = groupWebsiteQualitySignals(otherHiddenSignals);
  const advancedGroupedSignals = advancedSignals.length > 0
    ? [{ title: "Avanserte tekniske signaler", signals: advancedSignals }]
    : [];
  const reportSummary = websiteQualityReportSummary(quality.signals);
  const [showShortReport, setShowShortReport] = useState(false);
  const [showAllSignals, setShowAllSignals] = useState(false);
  const [copiedShortReport, setCopiedShortReport] = useState(false);
  const [copiedCustomerReport, setCopiedCustomerReport] = useState(false);
  const shortReport = buildWebsiteShortReport(quality);
  const customerReport = buildWebsiteCustomerReport(quality);

  return (
    <div className={`border border-[#D9E2EC] bg-white p-5 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-[#52606D]">Nettsidekvalitet</p>
          <h4 className="mt-1 text-[17px] font-semibold text-[#1F2933]">{quality.label}</h4>
        </div>
        <span className={`inline-flex w-fit rounded-sm px-2 py-1 text-[10px] font-semibold ${
          quality.status === "WEAK"
            ? "bg-rose-50 text-rose-700"
            : quality.status === "NEEDS_REVIEW"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-700"
        }`}>
          {quality.status === "OK" ? "OK" : "Bør sjekkes"}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[#52606D]">{quality.summary}</p>
      {shortReport ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="rounded-sm text-[12px] font-semibold"
            onClick={() => setShowShortReport((current) => !current)}
            size="sm"
            type="button"
            variant="outline"
          >
            {showShortReport ? "Skjul kort rapport" : "Lag kort rapport"}
          </Button>
          <Button
            className="rounded-sm text-[12px] font-semibold"
            onClick={() => void copyWebsiteReport(shortReport, setCopiedShortReport)}
            size="sm"
            type="button"
            variant="outline"
          >
            {copiedShortReport ? "Rapport kopiert" : "Kopier rapport"}
          </Button>
          <Button
            className="rounded-sm text-[12px] font-semibold"
            onClick={() => void copyWebsiteReport(customerReport, setCopiedCustomerReport)}
            size="sm"
            type="button"
            variant="outline"
          >
            {copiedCustomerReport ? "Kundetekst kopiert" : "Kopier kundetekst"}
          </Button>
        </div>
      ) : null}
      {showShortReport && shortReport ? (
        <pre className="mt-3 whitespace-pre-wrap border border-[#D9E2EC] bg-[#F8FBFF] p-4 text-[12px] leading-5 text-[#334E68]">
          {shortReport}
        </pre>
      ) : null}
      {reportSummary.length > 0 ? (
        <div className="mt-4 grid gap-3 border border-[#D9E2EC] bg-[#F8FBFF] p-4 md:grid-cols-3">
          {reportSummary.map((item) => (
            <div key={item.label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#52606D]">{item.label}</p>
              <p className="mt-1 text-[13px] font-semibold leading-5 text-[#1F2933]">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
      {groupedSignals.length > 0 ? (
        <div className="mt-4 grid gap-4">
          {groupedSignals.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#52606D]">{group.title}</p>
              <div className="grid gap-2">
                {group.signals.map((signal) => (
                  <div key={signal.code} className="border border-[#E4E7EB] bg-[#F8FBFF] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#1F2933]">{signal.title}</p>
                      <span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${structureSignalSeverityClassName(signal.severity)}`}>
                        {signal.severity === "HIGH" ? "Høy" : signal.severity === "MEDIUM" ? "Middels" : "Info"}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-[#52606D]">{signal.detail}</p>
                    <div className="mt-3 grid gap-2 border-t border-[#E4E7EB] pt-3 sm:grid-cols-2">
                      <WebsiteSignalReportItem label="Hvorfor" value={websiteSignalWhy(signal)} />
                      <WebsiteSignalReportItem label="Tiltak" value={websiteSignalAction(signal)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {hiddenSignals.length > 0 ? (
        <div className="mt-4 border-t border-[#E4E7EB] pt-4">
          <Button
            className="rounded-sm text-[12px] font-semibold"
            onClick={() => setShowAllSignals((current) => !current)}
            size="sm"
            type="button"
            variant="outline"
          >
            {showAllSignals ? "Skjul avansert detaljnivå" : `Vis avansert detaljnivå (${hiddenSignals.length})`}
          </Button>
          <p className="mt-2 text-[12px] leading-5 text-[#52606D]">
            Standardvisningen viser de viktigste funnene. Resten er tekniske signaler som kan være nyttige ved manuell gjennomgang, men som ofte blir støy i første kundedialog.
          </p>
          {showAllSignals ? (
            <div className="mt-4 grid gap-4">
              {[...hiddenGroupedSignals, ...advancedGroupedSignals].map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#52606D]">{group.title}</p>
                  <div className="grid gap-2">
                    {group.signals.map((signal) => (
                      <div key={signal.code} className="border border-[#E4E7EB] bg-white px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[13px] font-semibold text-[#1F2933]">{signal.title}</p>
                          <span className={`rounded-sm px-2 py-0.5 text-[10px] font-semibold ${structureSignalSeverityClassName(signal.severity)}`}>
                            {signal.severity === "HIGH" ? "Høy" : signal.severity === "MEDIUM" ? "Middels" : "Info"}
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] leading-5 text-[#52606D]">{signal.detail}</p>
                        <div className="mt-3 grid gap-2 border-t border-[#E4E7EB] pt-3 sm:grid-cols-2">
                          <WebsiteSignalReportItem label="Hvorfor" value={websiteSignalWhy(signal)} />
                          <WebsiteSignalReportItem label="Tiltak" value={websiteSignalAction(signal)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function websiteQualityReportSummary(signals: WebsiteQualitySignal[]) {
  if (signals.length === 0) {
    return [];
  }

  const signalCodes = new Set(signals.map((signal) => signal.code));
  return [
    {
      label: "Første tiltak",
      value: firstWebsiteQualityAction(signalCodes),
    },
    {
      label: "Teknisk/sikkerhet",
      value: technicalWebsiteQualityPriority(signalCodes),
    },
    {
      label: "Manuell vurdering",
      value: manualWebsiteQualityReview(signalCodes),
    },
  ];
}

function buildWebsiteShortReport(quality: WebsiteQualityAssessment) {
  if (quality.signals.length === 0) {
    return "";
  }

  const topSignals = prioritizeWebsiteReportSignals(quality.signals).slice(0, 3);
  const signalCodes = new Set(quality.signals.map((signal) => signal.code));
  const lines = [
    "Kort nettsiderapport",
    "",
    "Kort vurdering",
    quality.summary,
    "",
    "3 viktigste funn",
    ...topSignals.map((signal, index) => `${index + 1}. ${signal.title}: ${signal.detail}`),
    "",
    "Anbefalte tiltak",
    ...topSignals.map((signal, index) => `${index + 1}. ${websiteSignalAction(signal)}`),
    "",
    "Hva jeg kan hjelpe med",
    websiteReportScopeSummary(signalCodes),
    "",
    "Merk",
    "Dette er en automatisk førstevurdering. Funnene bør bekreftes manuelt før de brukes som bastante påstander.",
  ];

  return lines.join("\n");
}

function buildWebsiteCustomerReport(quality: WebsiteQualityAssessment) {
  if (quality.signals.length === 0) {
    return "";
  }

  const topSignals = prioritizeWebsiteReportSignals(quality.signals).slice(0, 2);
  const signalCodes = new Set(quality.signals.map((signal) => signal.code));
  const focusLine = firstWebsiteQualityAction(signalCodes);
  const findingsLine = topSignals
    .map((signal) => customerFriendlySignalPhrase(signal))
    .filter(Boolean)
    .join(" og ");

  return [
    "Jeg tok en rask og overordnet sjekk av nettsiden.",
    "",
    findingsLine
      ? `Det jeg ville sett nærmere på først, er ${findingsLine}.`
      : `Det jeg ville sett nærmere på først, er dette: ${focusLine}`,
    "",
    websiteReportScopeSummary(signalCodes),
    "",
    "Dette er ikke ment som en full teknisk gjennomgang, men som et konkret utgangspunkt for å gjøre siden tydeligere, tryggere og enklere å bruke.",
  ].join("\n");
}

function prioritizedWebsiteQualitySignals(signals: WebsiteQualitySignal[], limit: number) {
  return [...signals]
    .sort((left, right) => websiteSignalPriority(left) - websiteSignalPriority(right))
    .slice(0, limit);
}

function websiteSignalPriority(signal: WebsiteQualitySignal) {
  const codePriority = STANDARD_WEBSITE_SIGNAL_PRIORITY[signal.code];
  if (typeof codePriority === "number") {
    return codePriority;
  }
  const severityPriority = signal.severity === "HIGH" ? 20 : signal.severity === "MEDIUM" ? 45 : 80;
  return severityPriority + (isAdvancedWebsiteSignal(signal) ? 80 : 0);
}

const STANDARD_WEBSITE_SIGNAL_PRIORITY: Record<string, number> = {
  TECHNICAL_FAILURE: 1,
  INSECURE_FORM_ACTION: 2,
  MISSING_HTTPS: 3,
  INCOMPLETE_MARKET_OR_CHECKOUT: 4,
  TEMPLATE_PLACEHOLDER_CONTENT: 5,
  WEAK_HOMEPAGE_STRUCTURE: 10,
  THIN_CONTENT: 11,
  MISSING_ORG_NUMBER: 12,
  LEGAL_NAME_NOT_VISIBLE: 13,
  MISSING_ADDRESS_OR_AREA: 14,
  MISSING_ABOUT_SECTION: 15,
  MISSING_SOCIAL_PROOF: 16,
  PLACEHOLDER_IMAGE_RISK: 17,
  CTA_DESTINATION_MISMATCH: 18,
  FORM_LABEL_RISK: 20,
  EMPTY_BUTTON_RISK: 21,
  IMAGE_ALT_RISK: 22,
  FIXED_WIDTH_LAYOUT: 23,
  FOCUS_STYLE_RISK: 24,
  MISSING_MAIN_LANDMARK: 25,
  WEAK_PAGE_LANDMARKS: 26,
  SKIPPED_HEADING_LEVELS: 27,
  TLS_CERTIFICATE_EXPIRING: 30,
  MIXED_CONTENT_RISK: 31,
  MISSING_CSP_HEADER: 32,
  WEAK_CSP_HEADER: 33,
  MANY_INLINE_SCRIPTS_WITHOUT_CSP: 34,
  MISSING_REFERRER_POLICY: 35,
  COOKIE_CONSENT_RISK: 36,
  MISSING_PRIVACY_NOTICE: 37,
  PRIVACY_LINK_REVIEW: 38,
  MISSING_META_DESCRIPTION: 40,
  WEAK_SHARE_PREVIEW: 41,
  NOINDEX_SIGNAL: 42,
  MANY_EXTERNAL_SCRIPTS: 45,
  CLIENT_LOADING_OVERLAY: 46,
  MOTION_ACCESSIBILITY_RISK: 47,
};

function isAdvancedWebsiteSignal(signal: WebsiteQualitySignal) {
  return ADVANCED_WEBSITE_SIGNAL_CODES.has(signal.code);
}

const ADVANCED_WEBSITE_SIGNAL_CODES = new Set([
  "SECURITY_TXT_MISSING",
  "DNS_CAA_MISSING",
  "SERVER_TECH_HEADER_EXPOSED",
  "TECHNOLOGY_STACK_DETECTED",
  "CMS_VERSION_EXPOSED",
  "SOURCE_MAP_EXPOSED",
  "DEVELOPMENT_REFERENCE_EXPOSED",
  "JAVASCRIPT_HREF_REVIEW",
  "INLINE_EVENT_HANDLER_REVIEW",
  "DANGEROUS_JS_SINK_REVIEW",
  "DOM_XSS_SURFACE_REVIEW",
  "THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW",
  "MANY_THIRD_PARTY_SCRIPT_HOSTS",
  "POST_FORM_CSRF_REVIEW",
  "OUTDATED_JS_LIBRARY_REVIEW",
  "API_ENDPOINTS_VISIBLE",
  "ADMIN_OR_LOGIN_PATH_EXPOSED",
  "LOGIN_FORM_SECURITY_REVIEW",
  "FILE_UPLOAD_REVIEW",
  "ROBOTS_SENSITIVE_PATHS",
  "EMAIL_SECURITY_DNS_REVIEW",
  "EMAIL_MX_MISSING",
  "SPF_POLICY_SOFT",
  "SPF_LOOKUP_RISK",
  "DUPLICATE_SPF_RECORDS",
  "DMARC_POLICY_NONE",
  "DMARC_RUA_MISSING",
  "SITEMAP_MISSING",
  "TARGET_BLANK_NOOPENER_MISSING",
  "COOKIE_HTTPONLY_REVIEW",
  "COOKIE_SAMESITE_REVIEW",
  "MISSING_PERMISSIONS_POLICY",
  "MISSING_CONTENT_TYPE_OPTIONS",
  "MISSING_FRAME_PROTECTION",
]);

function customerFriendlySignalPhrase(signal: WebsiteQualitySignal) {
  switch (signal.code) {
    case "AI_LIKE_PRESENTATION_RISK":
      return "å gjøre teksten mer virksomhetsspesifikk og mindre mønsterpreget";
    case "GENERIC_PRESENTATION_TRUST_RISK":
    case "GENERIC_OR_AI_IMAGE_RISK":
      return "å gjøre uttrykket mer konkret og tillitvekkende";
    case "FORM_LABEL_RISK":
      return "å gjøre skjemaene enklere å bruke";
    case "EMPTY_BUTTON_RISK":
      return "å kontrollere at knapper har tydelig tekst eller tilgjengelig navn";
    case "IFRAME_TITLE_RISK":
      return "å gi innebygd innhold tydelig tittel for skjermlesere";
    case "WEAK_TITLE":
    case "MISSING_META_DESCRIPTION":
    case "WEAK_SHARE_PREVIEW":
      return "å rydde sidetittel, metadata og delingsvisning";
    case "IMAGE_ALT_RISK":
      return "å rydde noen tilgjengelighetspunkter rundt bilder";
    case "MISSING_CSP_HEADER":
    case "MISSING_HSTS_HEADER":
    case "WEAK_CSP_HEADER":
      return "å se på noen enkle tekniske trygghetspunkter";
    case "MISSING_PRIVACY_NOTICE":
    case "COOKIE_CONSENT_RISK":
      return "å gjøre personvern og samtykke mer ryddig";
    case "WEAK_HOMEPAGE_STRUCTURE":
      return "å gjøre førstesiden tydeligere";
    case "WEAK_INDUSTRY_RELEVANCE":
    case "GENERIC_SERVICE_TEXT":
      return "å beskrive tjenestene mer konkret";
    case "MISSING_ORG_NUMBER":
    case "LEGAL_NAME_NOT_VISIBLE":
      return "å gjøre virksomheten lettere å verifisere";
    default:
      return signal.severity === "HIGH" || signal.severity === "MEDIUM"
        ? signal.title.toLowerCase()
        : "";
  }
}

function prioritizeWebsiteReportSignals(signals: WebsiteQualitySignal[]) {
  const priorityCodes = [
    "TECHNICAL_FAILURE",
    "INCOMPLETE_MARKET_OR_CHECKOUT",
    "TEMPLATE_PLACEHOLDER_CONTENT",
    "AI_LIKE_PRESENTATION_RISK",
    "GENERIC_PRESENTATION_TRUST_RISK",
    "GENERIC_OR_AI_IMAGE_RISK",
    "WEAK_TITLE",
    "MISSING_META_DESCRIPTION",
    "WEAK_SHARE_PREVIEW",
    "FORM_LABEL_RISK",
    "EMPTY_BUTTON_RISK",
    "IFRAME_TITLE_RISK",
    "MISSING_MAIN_LANDMARK",
    "MISSING_PRIVACY_NOTICE",
    "COOKIE_CONSENT_RISK",
    "MISSING_HTTPS",
    "MIXED_CONTENT_RISK",
    "MISSING_CSP_HEADER",
    "MISSING_HSTS_HEADER",
    "WEAK_HOMEPAGE_STRUCTURE",
    "WEAK_INDUSTRY_RELEVANCE",
    "MISSING_ORG_NUMBER",
    "LEGAL_NAME_NOT_VISIBLE",
    "IMAGE_ALT_RISK",
  ];

  return [...signals].sort((a, b) => {
    const severityScore = (signal: WebsiteQualitySignal) => signal.severity === "HIGH" ? 0 : signal.severity === "MEDIUM" ? 1 : 2;
    const priorityScore = (signal: WebsiteQualitySignal) => {
      const index = priorityCodes.indexOf(signal.code);
      return index === -1 ? 999 : index;
    };
    return severityScore(a) - severityScore(b) || priorityScore(a) - priorityScore(b);
  });
}

function websiteReportScopeSummary(signalCodes: Set<string>) {
  const items: string[] = [];
  if (signalCodes.has("AI_LIKE_PRESENTATION_RISK")) {
    items.push("gjøre teksten mer virksomhetsspesifikk og mindre mønsterpreget");
  }
  if (signalCodes.has("GENERIC_PRESENTATION_TRUST_RISK") || signalCodes.has("GENERIC_OR_AI_IMAGE_RISK") || signalCodes.has("WEAK_HOMEPAGE_STRUCTURE") || signalCodes.has("WEAK_INDUSTRY_RELEVANCE")) {
    items.push("gjøre innholdet mer konkret, tydelig og tillitvekkende");
  }
  if (signalCodes.has("FORM_LABEL_RISK") || signalCodes.has("EMPTY_BUTTON_RISK") || signalCodes.has("IMAGE_ALT_RISK")) {
    items.push("kontrollere UU-punkter i skjema, knapper og bilder");
  }
  if (signalCodes.has("WEAK_TITLE") || signalCodes.has("MISSING_META_DESCRIPTION") || signalCodes.has("WEAK_SHARE_PREVIEW")) {
    items.push("rydde sidetittel, metadata og delingsvisning");
  }
  if (signalCodes.has("MISSING_CSP_HEADER") || signalCodes.has("MISSING_HSTS_HEADER") || signalCodes.has("MISSING_REFERRER_POLICY")) {
    items.push("vurdere tekniske sikkerhetsheadere hvis hosting/CMS gir tilgang");
  }
  if (signalCodes.has("MISSING_PRIVACY_NOTICE") || signalCodes.has("COOKIE_CONSENT_RISK")) {
    items.push("strukturere personvern- og cookie-informasjon, med virksomhetens egen kvalitetssikring");
  }

  if (items.length === 0) {
    return "Jeg kan lage en mer konkret manuell vurdering og foreslå en ryddigere nettsideflyt.";
  }

  return `Jeg kan hjelpe med å ${formatNorwegianTextList(items)}.`;
}

function formatNorwegianTextList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} og ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")} og ${items.at(-1)}`;
}

function firstWebsiteQualityAction(signalCodes: Set<string>) {
  if (signalCodes.has("TECHNICAL_FAILURE")) {
    return "Få nettsiden til å svare stabilt før andre forbedringer vurderes.";
  }
  if (signalCodes.has("PUBLIC_SECTOR_CONTEXT")) {
    return "Behandle funnene som revisjonspunkter for UU, personvern og teknisk kvalitet, ikke som salgslead.";
  }
  if (signalCodes.has("INCOMPLETE_MARKET_OR_CHECKOUT") || signalCodes.has("TEMPLATE_PLACEHOLDER_CONTENT")) {
    return "Fjern uferdig tekst og avklar hva som faktisk er lansert.";
  }
  if (signalCodes.has("AI_LIKE_PRESENTATION_RISK")) {
    return "Gjør teksten mindre mønsterpreget og mer tydelig knyttet til faktisk virksomhet.";
  }
  if (signalCodes.has("GENERIC_PRESENTATION_TRUST_RISK") || signalCodes.has("GENERIC_OR_AI_IMAGE_RISK")) {
    return "Gjør siden mer konkret med ekte bilder, faglig profil og etterprøvbare tillitssignaler.";
  }
  if (signalCodes.has("WEAK_TITLE") || signalCodes.has("MISSING_META_DESCRIPTION") || signalCodes.has("WEAK_SHARE_PREVIEW")) {
    return "Kontroller sidetittel, metadata og delingsvisning først.";
  }
  if (signalCodes.has("FORM_LABEL_RISK") || signalCodes.has("EMPTY_BUTTON_RISK")) {
    return "Kontroller tilgjengelig navn på skjemafelt, knapper og innebygd innhold.";
  }
  if (signalCodes.has("IFRAME_TITLE_RISK") || signalCodes.has("MISSING_MAIN_LANDMARK") || signalCodes.has("MOTION_ACCESSIBILITY_RISK")) {
    return "Kontroller landemerker, iframe-titler og støtte for redusert bevegelse.";
  }
  if (signalCodes.has("WEAK_HOMEPAGE_STRUCTURE") || signalCodes.has("WEAK_INDUSTRY_RELEVANCE")) {
    return "Gjør førstesiden tydeligere på hva virksomheten tilbyr.";
  }
  return "Start med de funnene som påvirker tillit, kontakt og mobilbruk.";
}

function technicalWebsiteQualityPriority(signalCodes: Set<string>) {
  if (signalCodes.has("TECHNICAL_FAILURE")) {
    return "Nettsiden svarte ikke. Sjekk DNS, SSL, hosting, redirect og eventuell 404/5xx manuelt.";
  }
  if (signalCodes.has("MISSING_HTTPS")) {
    return "HTTPS og blandet innhold bør prioriteres høyt.";
  }
  if (signalCodes.has("MIXED_CONTENT_RISK")) {
    return "Blandet HTTP/HTTPS-innhold bør prioriteres fordi det kan gi nettleservarsler eller blokkert innhold.";
  }
  if (signalCodes.has("MISSING_CSP_HEADER") || signalCodes.has("MISSING_HSTS_HEADER") || signalCodes.has("WEAK_CSP_HEADER")) {
    return "Sikkerhetsheadere bør vurderes når innhold og hosting er avklart.";
  }
  if (signalCodes.has("ADMIN_OR_LOGIN_PATH_EXPOSED") || signalCodes.has("LOGIN_FORM_SECURITY_REVIEW") || signalCodes.has("API_ENDPOINTS_VISIBLE")) {
    return "Admin, innlogging og API-spor bør vurderes teknisk før dette omtales for bastant.";
  }
  if (signalCodes.has("COOKIE_SECURE_FLAG_MISSING") || signalCodes.has("COOKIE_HTTPONLY_REVIEW") || signalCodes.has("COOKIE_SAMESITE_REVIEW")) {
    return "Cookie-oppsett bør sjekkes mot faktisk bruk av sesjon og tracking.";
  }
  return "Ingen kritiske tekniske sikkerhetssignaler er løftet øverst, men funn bør fortsatt vurderes.";
}

function manualWebsiteQualityReview(signalCodes: Set<string>) {
  if (signalCodes.has("TECHNICAL_FAILURE")) {
    return "Bekreft feilen manuelt i nettleser før den brukes i kundedialog. Nedetid kan være midlertidig.";
  }
  if (signalCodes.has("PUBLIC_SECTOR_CONTEXT")) {
    return "Offentlige og store tjenestenettsteder bør vurderes med revisjonsspråk, ikke som vanlige kundehenvendelser.";
  }
  if (signalCodes.has("SENSITIVE_HEALTH_CONTEXT") || signalCodes.has("HEALTH_TRACKING_CONTEXT")) {
    return "Helse/persondata bør vurderes ekstra varsomt og ikke beskrives som regelbrudd uten full gjennomgang.";
  }
  if (signalCodes.has("AI_LIKE_PRESENTATION_RISK")) {
    return "Vurder om teksten fremstår AI-lignende eller mønsterpreget før den brukes i kundedialog.";
  }
  if (signalCodes.has("GENERIC_PRESENTATION_TRUST_RISK") || signalCodes.has("GENERIC_OR_AI_IMAGE_RISK")) {
    return "Vurder visuelt uttrykk manuelt før det brukes i kundedialog.";
  }
  if (signalCodes.has("MISSING_PRIVACY_NOTICE") || signalCodes.has("COOKIE_CONSENT_RISK")) {
    return "Personvern og cookies bør bekreftes manuelt, særlig hvis lenker ligger på undersider.";
  }
  return "Automatiske signaler bør bekreftes manuelt før konkrete påstander sendes til kunden.";
}

function WebsiteSignalReportItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#829AB1]">{label}</p>
      <p className="mt-1 text-[12px] leading-5 text-[#334E68]">{value}</p>
    </div>
  );
}

function websiteSignalWhy(signal: WebsiteQualitySignal) {
  switch (signal.code) {
    case "TECHNICAL_FAILURE":
      return "Hvis registrert nettside ikke svarer, mister virksomheten et viktig kontaktpunkt og kan fremstå mindre aktiv.";
    case "PUBLIC_SECTOR_CONTEXT":
      return "Offentlige og store tjenestenettsteder har andre krav, eiere og ansvarsforhold enn en vanlig småbedriftsside.";
    case "ACCESSIBILITY_DECLARATION_VIOLATIONS":
      return "Dette kommer fra publisert tilgjengelighetserklæring, ikke bare fra automatisk HTML-sjekk.";
    case "TEMPLATE_PLACEHOLDER_CONTENT":
      return "Uferdig tekst er et tydelig førsteinntrykkssignal og kan få siden til å virke upublisert eller lite kvalitetssikret.";
    case "AI_LIKE_PRESENTATION_RISK":
      return "Siden har mange brede og mønsterpregede formuleringer, med lite virksomhetsspesifikt innhold. Det er ikke et bevis på AI-bruk, men et signal som bør vurderes manuelt.";
    case "MISSING_ORG_NUMBER":
    case "LEGAL_NAME_NOT_VISIBLE":
      return "Juridisk navn og org.nr. gjør det lettere å verifisere hvem kunden faktisk handler med.";
    case "MISSING_ADDRESS_OR_AREA":
      if (signal.title.toLowerCase().includes("selskapsinfo")) {
        return "Ved nettbutikk bør kunden raskt kunne verifisere juridisk selger, kontaktinformasjon og ansvarlig virksomhet.";
      }
      return "Lokale kunder trenger raskt å forstå hvor virksomheten holder til eller hvilket område den dekker.";
    case "MISSING_LOCAL_RELEVANCE":
      return "Sted eller dekningsområde gjør virksomheten mer relevant i lokale søk og for kunder som vurderer avstand.";
    case "NON_NO_DOMAIN":
      return ".no er ikke et krav, men kan gjøre en norsk virksomhet lettere å kjenne igjen og stole på.";
    case "THIN_CONTENT":
      return "Lite tekst gjør det vanskeligere for både kunder og søkemotorer å forstå hva virksomheten faktisk tilbyr.";
    case "WEAK_HOMEPAGE_STRUCTURE":
      return "En tydelig hovedoverskrift hjelper brukeren å forstå tilbudet før resten av siden leses.";
    case "MULTIPLE_H1":
      return "Flere H1 kan gjøre sidestrukturen mindre tydelig for søkemotorer og hjelpemidler.";
    case "WEAK_NAVIGATION":
      return "Tydelig navigasjon og seksjoner gjør det enklere å finne tjenester, kontakt og praktisk informasjon.";
    case "COMMERCE_TERMS_MISSING":
    case "COMMERCE_RETURN_INFO_MISSING":
    case "COMMERCE_DELIVERY_INFO_MISSING":
      return "Ved salg eller bestilling bør vilkår, retur og levering være lett å finne før kunden tar en beslutning.";
    case "DOMAIN_NAME_MISMATCH":
      return "Når domene og firmanavn peker i ulike retninger, kan det svekke gjenkjenning og tillit.";
    case "EMAIL_DOMAIN_MISMATCH":
      return "Domenebasert e-post kan gi mer profesjonelt inntrykk og gjøre avsenderen lettere å kjenne igjen.";
    case "MISSING_ABOUT_SECTION":
      return "En kort om-side eller personpresentasjon gjør virksomheten mer etterprøvbar og mindre anonym.";
    case "MISSING_SOCIAL_PROOF":
      return "For tillitsbaserte tjenester trenger nye kunder bevis på effekt, erfaring eller hvem som faktisk står bak løftene.";
    case "MISSING_FAQ":
      return "FAQ eller praktiske svar kan redusere usikkerhet før en kunde eller leder tar kontakt.";
    case "MISSING_PRICE_OR_MODEL":
      return "Når prisnivå, demo, pilot eller forretningsmodell er uklar, blir neste steg vanskeligere å vurdere.";
    case "DATA_HANDLING_INFO_REVIEW":
      return "Arbeidshelse, teamdata og personopplysninger krever ekstra tydelig forklaring av databehandling og ansvar.";
    case "CTA_DESTINATION_MISMATCH":
      return "Hvis knappetekst og landingsside peker i ulike retninger, kan brukeren miste flyten eller tro at noe er feil.";
    case "PLACEHOLDER_IMAGE_RISK":
      return "Placeholder-bilder på person- eller teamsider gir et uferdig inntrykk og svekker tilliten.";
    case "WEAK_TITLE":
      return "Sidetittelen vises i nettleser, søkeresultater og deling, og bør raskt forklare hvem siden gjelder.";
    case "MISSING_META_DESCRIPTION":
      return "Meta description påvirker hvordan siden presenteres i søkeresultater og ved deling.";
    case "DUPLICATE_META_DESCRIPTIONS":
      return "Når flere undersider bruker samme beskrivelse, mister hver side muligheten til å forklare sitt eget formål i søk og deling.";
    case "WEAK_SHARE_PREVIEW":
      return "Open Graph/Twitter-data styrer ofte hvordan lenken ser ut i sosiale medier, meldinger og e-post.";
    case "MISSING_STRUCTURED_DATA":
      return "Strukturert data hjelper søkemotorer å forstå virksomhet, kontaktpunkt og innhold mer presist.";
    case "NOINDEX_SIGNAL":
      return "Noindex kan gjøre at en ellers fungerende nettside ikke vises i søkemotorer.";
    case "SITEMAP_MISSING":
      return "Sitemap er ikke påkrevd, men gjør det enklere for søkemotorer å finne viktige undersider.";
    case "CLOUDFLARE_EMAIL_PROTECTION":
      return "Skjult e-post kan redusere spam, men kan også gjøre kontakt vanskeligere uten JavaScript eller for hjelpemidler.";
    case "MISSING_OPENING_HOURS":
      return "Åpningstider eller tilgjengelighet reduserer friksjon for kunder som vil ta kontakt eller møte opp.";
    case "MISSING_SOCIAL_LINKS":
      return "Sosiale lenker er ikke alltid nødvendig, men kan gi ekstra etterprøvbarhet for lokale og forbrukerrettede virksomheter.";
    case "PHONE_NOT_CLICKABLE":
    case "EMAIL_NOT_CLICKABLE":
    case "CONTACT_PAGE_NOT_FOUND":
      return "Kontaktpunkter bør være raske å bruke, særlig på mobil.";
    case "CLIENT_LOADING_OVERLAY":
      return "Tung klientlasting kan gi svakere førsteinntrykk og dårligere mobilopplevelse selv om siden til slutt laster.";
    case "FORM_AUTOCOMPLETE_MISSING":
      return "Autocomplete gjør skjema enklere å fylle ut og er et praktisk UU- og mobilbrukssignal.";
    case "NEWSLETTER_FORM_LABEL_RISK":
      return "Nyhetsbrevskjema samler kontaktdata og bør være tydelig merket for både brukervennlighet og tilgjengelighet.";
    case "FIXED_WIDTH_LAYOUT":
      return "Fast bredde i HTML/CSS kan gi dårlig mobilvisning selv om siden ser grei ut på stor skjerm.";
    case "MISSING_MAIN_LANDMARK":
    case "WEAK_PAGE_LANDMARKS":
      return "Landemerker hjelper skjermleser- og tastaturbrukere å hoppe direkte til hovedinnhold.";
    case "MISSING_LANGUAGE":
    case "LANGUAGE_MISMATCH_RISK":
      return "Riktig språkmerking hjelper skjermlesere med uttale og gjør siden mer robust for hjelpeteknologi.";
    case "SKIPPED_HEADING_LEVELS":
      return "Riktig overskriftsrekkefølge gjør siden lettere å skumme og mer forståelig for skjermlesere.";
    case "VAGUE_LINK_TEXT":
      return "Lenketekst bør gi mening uten kontekst, slik at brukeren forstår hvor lenken leder.";
    case "IFRAME_TITLE_RISK":
      return "Iframe uten tittel gjør det vanskeligere for skjermleserbrukere å forstå hva det innebygde innholdet er.";
    case "FOCUS_STYLE_RISK":
      return "Synlig fokusmarkering er nødvendig for brukere som navigerer med tastatur.";
    case "MOTION_ACCESSIBILITY_RISK":
      return "Brukere som reagerer på bevegelse bør kunne få redusert animasjon når nettleseren ber om det.";
    case "MANY_EXTERNAL_SCRIPTS":
    case "EXTERNAL_IFRAME_RISK":
    case "THIRD_PARTY_EMBED_CONSENT_RISK":
      return "Tredjepartsinnhold kan påvirke ytelse, personvern, samtykke og feilkilder.";
    case "TLS_CERTIFICATE_REVIEW":
    case "TLS_CERTIFICATE_EXPIRING":
      return "Sertifikatproblemer kan gi nettleservarsler eller nedetid hvis HTTPS ikke fornyes og valideres riktig.";
    case "THIRD_PARTY_FORM_RISK":
      return "Eksterne skjema-, booking- eller markedsføringstjenester kan innebære databehandling utenfor selve nettstedet.";
    case "SERVER_TECH_HEADER_EXPOSED":
    case "CMS_VERSION_EXPOSED":
      return "Eksponert teknologi er sjelden kritisk alene, men kan gi unødvendig informasjon ved teknisk kartlegging.";
    case "SECURITY_TXT_MISSING":
      return "security.txt er ikke påkrevd, men gir en ryddig kanal for ansvarlig sikkerhetshenvendelse.";
    case "ROBOTS_SENSITIVE_PATHS":
      return "Robots.txt skal ikke brukes som skjulested; sensitive stier der kan gi unødvendige hint.";
    case "ADMIN_OR_LOGIN_PATH_EXPOSED":
    case "LOGIN_FORM_SECURITY_REVIEW":
      return "Synlig innlogging er normalt, men bør ha sterke passord, 2FA, rate limiting og ryddige sesjoner.";
    case "API_ENDPOINTS_VISIBLE":
      return "Synlige API-spor er vanlige i moderne sider, men tilgang, CORS og rate limiting bør være kontrollert.";
    case "SPF_POLICY_SOFT":
    case "DMARC_POLICY_NONE":
    case "EMAIL_SECURITY_DNS_REVIEW":
    case "EMAIL_MX_MISSING":
    case "SPF_LOOKUP_RISK":
    case "DUPLICATE_SPF_RECORDS":
    case "DMARC_RUA_MISSING":
      return "E-postdomener bør ha ryddig SPF, DKIM og DMARC for å redusere spoofing og leveringsproblemer.";
    case "DNS_CAA_MISSING":
      return "CAA er et ekstra DNS-signal som kan redusere risikoen for uønsket sertifikatutstedelse.";
    case "SOURCE_MAP_EXPOSED":
    case "DEVELOPMENT_REFERENCE_EXPOSED":
      return "Utviklingsspor er sjelden kritisk alene, men kan gi unødvendig innsikt i kildekode, filstruktur eller miljø.";
    case "TARGET_BLANK_NOOPENER_MISSING":
      return "Lenker som åpnes i ny fane bør isoleres slik at den nye siden ikke kan påvirke den opprinnelige fanen.";
    case "PERSONAL_DATA_GET_FORM":
      return "GET-skjema kan legge personopplysninger i URL, nettleserhistorikk, logger og analyseverktøy.";
    case "EXTERNAL_FORM_ACTION":
      return "Når skjema sendes til annet domene, bør databehandler og personvern være tydelig avklart.";
    case "DOM_XSS_SURFACE_REVIEW":
      return "XSS oppstår ofte når URL-, skjema- eller brukerdata ender i HTML/JavaScript uten trygg escaping. Dette er et passivt signal om angrepsflate, ikke et bevis.";
    case "DANGEROUS_JS_SINK_REVIEW":
      return "Dynamiske JavaScript-sinks kan være trygge, men blir risikable hvis de kombineres med ufiltrert brukerinput.";
    case "INLINE_EVENT_HANDLER_REVIEW":
      return "Inline event handlers gjør streng CSP vanskeligere og kan øke konsekvensen av injeksjonsfeil.";
    case "JAVASCRIPT_HREF_REVIEW":
      return "javascript:-lenker blander navigasjon og kode og er et gammelt mønster som bør vurderes ved sikkerhetsherding.";
    case "THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW":
      return "Tredjeparts-script er en forsyningskjederisiko: hvis leverandøren eller CDN-et endres, kjører koden i brukerens nettleser.";
    case "MANY_THIRD_PARTY_SCRIPT_HOSTS":
      return "Mange script-leverandører gir flere feilkilder, mer personvernflate og større avhengighet av eksterne domener.";
    case "MANY_INLINE_SCRIPTS_WITHOUT_CSP":
      return "Inline scripts gjør streng CSP vanskeligere, og manglende CSP gir svakere skadebegrensning ved script-injeksjon.";
    case "POST_FORM_CSRF_REVIEW":
      return "Skjema som sender data med POST bør vurderes for CSRF dersom det endrer data, logger inn eller sender sensitive opplysninger.";
    case "OUTDATED_JS_LIBRARY_REVIEW":
      return "Gamle frontend-biblioteker kan ha kjente sårbarheter og bør verifiseres mot faktisk versjon og bruk.";
    case "GOOGLE_ANALYTICS_WITHOUT_CONSENT":
    case "META_PIXEL_WITHOUT_CONSENT":
    case "SESSION_TRACKING_WITHOUT_CONSENT":
      return "Analyse- og sporingsverktøy bør kobles til en ryddig samtykkeflyt der det er relevant.";
    case "MISSING_REFERRER_POLICY":
    case "MISSING_PERMISSIONS_POLICY":
    case "MISSING_CONTENT_TYPE_OPTIONS":
    case "MISSING_FRAME_PROTECTION":
      return "Dette er enkle sikkerhetsheadere som kan redusere unødvendig eksponering i nettleseren.";
    case "TECHNOLOGY_STACK_DETECTED":
      return "Teknologispor sier noe om plattform og vedlikeholdsbehov, men ikke sikkert hvem som har laget siden.";
    case "SENSITIVE_HEALTH_CONTEXT":
    case "HEALTH_TRACKING_CONTEXT":
      return "Når siden berører helse, behandling eller personopplysninger, bør personvern og skjema vurderes ekstra varsomt.";
    case "PRIVACY_LINK_REVIEW":
      return "En policy- eller vilkårslenke er funnet, men innholdet må bekreftes når skjema, cookies eller kontaktdata brukes.";
  }
  if ([
    "GENERIC_PRESENTATION_TRUST_RISK",
    "GENERIC_OR_AI_IMAGE_RISK",
    "MISSING_SOCIAL_PROOF",
    "MISSING_ABOUT_SECTION",
  ].includes(signal.code)) {
    return "Tilliten svekkes når siden virker generisk eller lite etterprøvbar.";
  }
  if ([
    "FORM_LABEL_RISK",
    "EMPTY_BUTTON_RISK",
    "IMAGE_ALT_RISK",
    "MISSING_LANGUAGE",
    "IFRAME_TITLE_RISK",
  ].includes(signal.code)) {
    return "Kan gjøre siden vanskeligere å bruke med skjermleser, tastatur eller mobil.";
  }
  if ([
    "MISSING_HSTS_HEADER",
    "MISSING_CSP_HEADER",
    "WEAK_CSP_HEADER",
    "COOKIE_SECURE_FLAG_MISSING",
    "COOKIE_HTTPONLY_REVIEW",
    "COOKIE_SAMESITE_REVIEW",
    "MIXED_CONTENT_RISK",
  ].includes(signal.code)) {
    return "Tekniske sikkerhetssignaler påvirker robusthet, tillit og risiko fra tredjepartsinnhold.";
  }
  if ([
    "MISSING_PRIVACY_NOTICE",
    "CRAWL_PRIVACY_PAGE_NOT_FOUND",
    "CRAWL_FORM_PRIVACY_REVIEW",
    "CRAWL_TERMS_PAGE_NOT_FOUND",
    "COOKIE_CONSENT_RISK",
    "HEALTH_TRACKING_CONTEXT",
    "SENSITIVE_HEALTH_CONTEXT",
  ].includes(signal.code)) {
    return "Persondata, skjema og tracking bør være ryddig forklart før kunden sender inn informasjon.";
  }
  if ([
    "WEAK_HOMEPAGE_STRUCTURE",
    "WEAK_INDUSTRY_RELEVANCE",
    "GENERIC_SERVICE_TEXT",
    "MISSING_LOCAL_RELEVANCE",
  ].includes(signal.code)) {
    return "Kunden må raskt forstå hva virksomheten tilbyr, hvor den holder til og hvorfor den er relevant.";
  }
  return "Dette er et automatisk signal som bør brukes som startpunkt for manuell vurdering.";
}

function websiteSignalAction(signal: WebsiteQualitySignal) {
  switch (signal.code) {
    case "TECHNICAL_FAILURE":
      return "Sjekk domenet manuelt og avklar om problemet gjelder DNS, SSL, hosting, redirect, 404/5xx eller midlertidig nedetid.";
    case "AI_LIKE_PRESENTATION_RISK":
      return "Vurder om teksten fremstår AI-lignende eller mønsterpreget før den brukes i kundedialog.";
    case "PUBLIC_SECTOR_CONTEXT":
      return "Bruk funnene som grunnlag for manuell UU-, personvern- og sikkerhetsrevisjon, ikke som enkel nettsidekritikk.";
    case "ACCESSIBILITY_DECLARATION_VIOLATIONS":
      return "Åpne tilgjengelighetserklæringen og prioriter de konkrete WCAG-kravene som virksomheten selv har oppgitt som brudd.";
    case "TEMPLATE_PLACEHOLDER_CONTENT":
      return "Fjern test-, placeholder- og kommer-snart-tekst før siden brukes aktivt.";
    case "MISSING_ORG_NUMBER":
      return "Vis organisasjonsnummer i footer, kontaktseksjon eller om-side der det passer naturlig.";
    case "LEGAL_NAME_NOT_VISIBLE":
      return "Vis juridisk firmanavn tydelig, særlig hvis markedsnavn og selskapsnavn er ulike.";
    case "MISSING_ADDRESS_OR_AREA":
      if (signal.title.toLowerCase().includes("selskapsinfo")) {
        return "Gjør juridisk selger, kontaktinformasjon, vilkår og returinfo lett tilgjengelig fra footer og checkout.";
      }
      return "Legg inn sted, dekningsområde eller adresse der det er relevant for kundens valg.";
    case "MISSING_LOCAL_RELEVANCE":
      return "Nevn relevant sted, marked eller dekningsområde på en naturlig måte i tekst og metadata.";
    case "NON_NO_DOMAIN":
      return "Vurder .no-domene hvis virksomheten primært retter seg mot norske kunder.";
    case "THIN_CONTENT":
      return "Legg til kort, konkret tekst om produkter/tjenester, målgruppe og hvorfor kunden bør ta kontakt.";
    case "WEAK_HOMEPAGE_STRUCTURE":
      return "Lag en klar H1 som sier hva virksomheten tilbyr, gjerne med produkt/tjeneste og målgruppe.";
    case "MULTIPLE_H1":
      return "Bruk én tydelig H1 for hovedtemaet og legg resten av seksjonene under H2/H3.";
    case "WEAK_NAVIGATION":
      return "Legg inn tydelig meny, seksjoner og kontaktvei slik at brukeren raskt finner frem.";
    case "COMMERCE_TERMS_MISSING":
      return "Gjør kjøpsvilkår eller salgsbetingelser lett tilgjengelig fra footer og checkout.";
    case "COMMERCE_RETURN_INFO_MISSING":
      return "Legg inn tydelig informasjon om angrerett, retur, reklamasjon eller bytte.";
    case "COMMERCE_DELIVERY_INFO_MISSING":
      return "Legg inn leverings-, frakt- eller hentingsinformasjon der kunden forventer det.";
    case "DOMAIN_NAME_MISMATCH":
      return "Vurder om domene, markedsnavn og juridisk navn bør knyttes tydeligere sammen på siden.";
    case "EMAIL_DOMAIN_MISMATCH":
      return "Vurder domenebasert e-post eller forklar tydelig hvilken e-post som er offisiell kontaktvei.";
    case "MISSING_ABOUT_SECTION":
      return "Legg inn en kort presentasjon av hvem som står bak, erfaring, rolle eller hvordan virksomheten jobber.";
    case "MISSING_SOCIAL_PROOF":
      return "Legg inn minst ett konkret bevis: kundeuttalelse, pilotkunde, case, tall, resultat eller kort eksempel.";
    case "MISSING_FAQ":
      return "Legg inn korte svar på vanlige spørsmål om målgruppe, prosess, databruk, levering, pris eller neste steg.";
    case "MISSING_PRICE_OR_MODEL":
      return "Forklar om tilbudet er abonnement, pilot, demo, engangsleveranse eller skreddersydd pris.";
    case "DATA_HANDLING_INFO_REVIEW":
      return "Lag en tydelig side eller seksjon som forklarer datainnsamling, lagring, tilgang, behandlingsansvar og kontaktpunkt.";
    case "CTA_DESTINATION_MISMATCH":
      return "Sjekk at CTA-knapper leder til siden/handlingen teksten lover, eller endre teksten slik at forventningen stemmer.";
    case "PLACEHOLDER_IMAGE_RISK":
      return "Bytt placeholder-bilder med ekte bilder, fjern personkortene midlertidig eller merk tydelig hva som kommer senere.";
    case "WEAK_TITLE":
      return "Skriv en konkret sidetittel med virksomhet, tjeneste/produkt og gjerne sted eller marked.";
    case "MISSING_META_DESCRIPTION":
      return "Skriv en kort meta description som forklarer hva virksomheten tilbyr og hvorfor siden er relevant.";
    case "DUPLICATE_META_DESCRIPTIONS":
      return "Skriv egne meta descriptions for viktige undersider som tjenester, om oss, team, FAQ og produkt-/landingssider.";
    case "WEAK_SHARE_PREVIEW":
      return "Legg inn Open Graph/Twitter-tittel og beskrivelse som gir en ryddig forhåndsvisning.";
    case "MISSING_STRUCTURED_DATA":
      return "Vurder Organization, LocalBusiness eller Product/Service-data der det passer for virksomheten.";
    case "NOINDEX_SIGNAL":
      return "Sjekk om noindex er bevisst. Fjern det hvis siden skal finnes i Google og andre søkemotorer.";
    case "SITEMAP_MISSING":
      return "Legg inn sitemap.xml eller sørg for at CMS/host publiserer sitemap automatisk.";
    case "CLOUDFLARE_EMAIL_PROTECTION":
      return "Sørg for at e-post også finnes som tydelig kontaktvei for brukere uten JavaScript.";
    case "MISSING_OPENING_HOURS":
      return "Legg inn åpningstider, responstid eller når virksomheten kan kontaktes.";
    case "MISSING_SOCIAL_LINKS":
      return "Legg inn relevante sosiale profiler, eller la dem være borte hvis de ikke brukes aktivt.";
    case "PHONE_NOT_CLICKABLE":
      return "Gjør telefonnummer til tel-lenke og plasser det tydelig for mobilbrukere.";
    case "EMAIL_NOT_CLICKABLE":
      return "Gjør e-postadresse til mailto-lenke hvis den skal brukes som kontaktvei.";
    case "CLIENT_LOADING_OVERLAY":
      return "Sjekk mobilhastighet, LCP og om viktig innhold vises uten tung JavaScript.";
    case "FORM_AUTOCOMPLETE_MISSING":
      return "Legg autocomplete på navn, e-post, telefon og adressefelt.";
    case "NEWSLETTER_FORM_LABEL_RISK":
      return "Gi nyhetsbrevfeltet synlig label, tydelig hjelpetekst og ryddig personvernkobling.";
    case "FIXED_WIDTH_LAYOUT":
      return "Test siden på mobil og fjern faste bredder som skaper horisontal scroll eller kuttet innhold.";
    case "MISSING_MAIN_LANDMARK":
    case "WEAK_PAGE_LANDMARKS":
      return "Legg inn semantiske landemerker som header, main, nav og footer.";
    case "MISSING_LANGUAGE":
      return "Sett riktig lang-attributt på HTML-elementet, for eksempel lang=\"no\" eller lang=\"nb\".";
    case "LANGUAGE_MISMATCH_RISK":
      return "Sjekk at lang-attributt stemmer med faktisk språk på siden.";
    case "SKIPPED_HEADING_LEVELS":
      return "Rydd overskriftsnivåene slik at siden går logisk fra H1 til H2, H3 og videre.";
    case "VAGUE_LINK_TEXT":
      return "Bytt generiske lenker som «les mer» med konkrete tekster som beskriver målet.";
    case "IFRAME_TITLE_RISK":
      return "Gi iframe-elementer en kort title som beskriver kart, video, skjema eller annet innebygd innhold.";
    case "FOCUS_STYLE_RISK":
      return "Sørg for tydelig :focus-visible/:focus-stil og ikke fjern outline uten erstatning.";
    case "MOTION_ACCESSIBILITY_RISK":
      return "Legg støtte for prefers-reduced-motion og unngå at animasjon skjuler viktig innhold.";
    case "MIXED_CONTENT_RISK":
      return "Bytt HTTP-ressurser til HTTPS eller fjern dem hvis de ikke lenger brukes.";
    case "MANY_EXTERNAL_SCRIPTS":
      return "Gå gjennom scripts og fjern måling, widgets eller plugins som ikke gir tydelig verdi.";
    case "TLS_CERTIFICATE_REVIEW":
    case "TLS_CERTIFICATE_EXPIRING":
      return "Forny TLS-sertifikatet eller verifiser at automatisk fornyelse fungerer før utløpsdato.";
    case "EXTERNAL_IFRAME_RISK":
    case "THIRD_PARTY_EMBED_CONSENT_RISK":
      return "Vurder samtykke, lazy loading og personverntekst for kart, video og andre embeds.";
    case "THIRD_PARTY_FORM_RISK":
      return "Verifiser hvor skjemadata sendes, hvem som er databehandler og hvordan dette forklares i personvernteksten.";
    case "SERVER_TECH_HEADER_EXPOSED":
      return "Skjul eller reduser Server/X-Powered-By-headere hvis hostingmiljøet tillater det.";
    case "CMS_VERSION_EXPOSED":
      return "Skjul synlige CMS/plugin-versjoner og hold CMS, tema og plugins oppdatert.";
    case "SECURITY_TXT_MISSING":
      return "Vurder security.txt hvis virksomheten ønsker en ryddig kanal for sikkerhetsfunn.";
    case "ROBOTS_SENSITIVE_PATHS":
      return "Fjern unødvendige sensitive stier fra robots.txt og sikre faktiske admin/API-endepunkter.";
    case "ADMIN_OR_LOGIN_PATH_EXPOSED":
    case "LOGIN_FORM_SECURITY_REVIEW":
      return "Sjekk 2FA, rate limiting, passord-reset, session cookies og tilgangsstyring.";
    case "API_ENDPOINTS_VISIBLE":
      return "Verifiser CORS, autentisering, rate limiting og at API ikke eksponerer interne data.";
    case "SPF_POLICY_SOFT":
      return "Stram SPF når alle legitime avsendere er kartlagt.";
    case "DMARC_POLICY_NONE":
      return "Gå gradvis fra DMARC-overvåking til quarantine/reject når e-postflyten er verifisert.";
    case "EMAIL_SECURITY_DNS_REVIEW":
      return "Verifiser SPF, DKIM og DMARC for domenet med DNS-/mail-leverandør.";
    case "EMAIL_MX_MISSING":
      return "Verifiser MX-oppsett hvis domenet skal brukes til e-post.";
    case "DNS_CAA_MISSING":
      return "Vurder CAA-record for å begrense hvilke sertifikatutstedere som kan utstede sertifikat for domenet.";
    case "SPF_LOOKUP_RISK":
      return "Forenkle SPF ved å fjerne gamle include-regler eller samle e-postleverandører riktig.";
    case "DUPLICATE_SPF_RECORDS":
      return "Slå sammen SPF til én TXT-record med alle legitime avsendere.";
    case "DMARC_RUA_MISSING":
      return "Legg til rua-adresse hvis virksomheten vil følge med på DMARC før policy strammes inn.";
    case "SOURCE_MAP_EXPOSED":
      return "Vurder om sourcemaps skal fjernes fra produksjon eller bare være tilgjengelig internt.";
    case "DEVELOPMENT_REFERENCE_EXPOSED":
      return "Fjern staging-, debug-, backup- og lokale referanser fra produksjons-HTML og publiserte assets.";
    case "TARGET_BLANK_NOOPENER_MISSING":
      return "Legg rel=\"noopener noreferrer\" på eksterne lenker som åpnes i ny fane.";
    case "PERSONAL_DATA_GET_FORM":
      return "Bruk POST for skjema med navn, e-post, telefon eller andre personopplysninger.";
    case "EXTERNAL_FORM_ACTION":
      return "Verifiser ekstern skjematjeneste, databehandleravtale og forklaringen i personvernteksten.";
    case "DOM_XSS_SURFACE_REVIEW":
      return "Gå gjennom JavaScript som leser URL/hash/query og sjekk at verdier ikke settes inn i HTML uten trygg escaping/sanitering.";
    case "DANGEROUS_JS_SINK_REVIEW":
      return "Unngå eval/document.write og bruk sikre DOM-metoder eller sanitering hvis HTML må settes dynamisk.";
    case "INLINE_EVENT_HANDLER_REVIEW":
      return "Flytt inline onclick/onload til bundne event listeners og stram CSP når koden er ryddet.";
    case "JAVASCRIPT_HREF_REVIEW":
      return "Erstatt javascript:-lenker med knapper eller vanlige lenker med event handlers i JavaScript-koden.";
    case "THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW":
      return "Vurder Subresource Integrity for statiske tredjepartsressurser, eller host kritiske scripts selv.";
    case "MANY_THIRD_PARTY_SCRIPT_HOSTS":
      return "Gå gjennom alle script-leverandører og fjern måling, widgets eller plugins som ikke er nødvendige.";
    case "MANY_INLINE_SCRIPTS_WITHOUT_CSP":
      return "Rydd inline scripts og innfør CSP gradvis, gjerne først i report-only-modus.";
    case "POST_FORM_CSRF_REVIEW":
      return "Verifiser CSRF-beskyttelse på POST-skjema, særlig ved innlogging, konto, skjema med persondata eller dataendringer.";
    case "OUTDATED_JS_LIBRARY_REVIEW":
      return "Bekreft versjonen og oppdater eller fjern gamle JavaScript-biblioteker hvis de faktisk er i bruk.";
    case "GOOGLE_ANALYTICS_WITHOUT_CONSENT":
    case "META_PIXEL_WITHOUT_CONSENT":
    case "SESSION_TRACKING_WITHOUT_CONSENT":
      return "Verifiser at måling/tracking først aktiveres etter riktig samtykke, eller dokumenter hvorfor det ikke kreves.";
    case "MISSING_REFERRER_POLICY":
      return "Sett Referrer-Policy, for eksempel strict-origin-when-cross-origin, etter behov.";
    case "MISSING_PERMISSIONS_POLICY":
      return "Sett Permissions-Policy for å begrense unødvendige nettleserfunksjoner.";
    case "MISSING_CONTENT_TYPE_OPTIONS":
      return "Sett X-Content-Type-Options: nosniff.";
    case "MISSING_FRAME_PROTECTION":
      return "Bruk CSP frame-ancestors eller X-Frame-Options for å styre innbygging.";
    case "TECHNOLOGY_STACK_DETECTED":
      return "Bruk teknologisporet som vedlikeholds- og kostnadsinfo, ikke som bevis på feil eller leverandør.";
    case "SENSITIVE_HEALTH_CONTEXT":
    case "HEALTH_TRACKING_CONTEXT":
      return "Verifiser personverntekst, skjema, samtykke og databehandling manuelt før dette omtales konkret.";
    case "PRIVACY_LINK_REVIEW":
      return "Åpne policylenken og sjekk at den faktisk dekker personvern, skjema, cookies og databehandlerforhold.";
  }
  if (["AI_LIKE_PRESENTATION_RISK", "GENERIC_PRESENTATION_TRUST_RISK", "GENERIC_OR_AI_IMAGE_RISK"].includes(signal.code)) {
    return "Legg inn mer konkret tekst, ekte bilder, referanser, prosjekter eller dokumentasjon.";
  }
  if (signal.code === "FORM_LABEL_RISK") {
    return "Koble alle skjemafelt til synlige labels eller aria-label.";
  }
  if (signal.code === "EMPTY_BUTTON_RISK") {
    return "Gi alle knapper og ikonlenker tydelig tekst eller aria-label.";
  }
  if (signal.code === "IMAGE_ALT_RISK") {
    return "Legg alt-tekst på informative bilder og tom alt på rene dekorbilder.";
  }
  if (signal.code === "MISSING_CSP_HEADER" || signal.code === "WEAK_CSP_HEADER") {
    return "Definer eller stram inn Content Security Policy basert på faktiske scripts og embeds.";
  }
  if (signal.code === "MISSING_HSTS_HEADER" || signal.code === "WEAK_HSTS_HEADER") {
    return "Sett HSTS når HTTPS fungerer stabilt for domenet.";
  }
  if (signal.code.startsWith("COOKIE_")) {
    return "Vurder cookie-flagg og samtykkeflyt ut fra hva cookien faktisk brukes til.";
  }
  if (signal.code === "MISSING_PRIVACY_NOTICE" || signal.code === "COOKIE_CONSENT_RISK") {
    return "Lag tydelig personverntekst og samtykke der skjema, cookies eller tracking brukes.";
  }
  if (signal.code === "CRAWL_PRIVACY_PAGE_NOT_FOUND" || signal.code === "CRAWL_FORM_PRIVACY_REVIEW") {
    return "Legg personverninfo nær skjema/kontaktpunkter og gjør personvernsiden lett tilgjengelig.";
  }
  if (signal.code === "CRAWL_TERMS_PAGE_NOT_FOUND") {
    return "Verifiser vilkår, retur, levering og personvern for nettbutikk før siden brukes aktivt.";
  }
  if (signal.code === "CONTACT_PAGE_NOT_FOUND") {
    return "Gjør kontaktside eller kontaktpunkt tydelig fra meny, footer og førsteside.";
  }
  if (signal.code === "WEAK_INDUSTRY_RELEVANCE" || signal.code === "GENERIC_SERVICE_TEXT") {
    return "Skriv mer konkret om tjenester, målgruppe, område og hva kunden faktisk kan bestille.";
  }
  return "Sjekk funnet manuelt og prioriter tiltak hvis det påvirker tillit, kontakt eller sikkerhet.";
}

function groupWebsiteQualitySignals(signals: WebsiteQualitySignal[]) {
  const groups = [
    {
      title: "Viktigste funn",
      predicate: (signal: WebsiteQualitySignal) => signal.severity === "HIGH" || [
        "INCOMPLETE_MARKET_OR_CHECKOUT",
        "TEMPLATE_PLACEHOLDER_CONTENT",
        "WEAK_HOMEPAGE_STRUCTURE",
        "FORM_LABEL_RISK",
        "EMPTY_BUTTON_RISK",
        "IMAGE_ALT_RISK",
      ].includes(signal.code),
    },
    {
      title: "AI-lignende tekst",
      predicate: (signal: WebsiteQualitySignal) => [
        "AI_LIKE_PRESENTATION_RISK",
      ].includes(signal.code),
    },
    {
      title: "Tillit og innhold",
      predicate: (signal: WebsiteQualitySignal) => [
        "LEGAL_NAME_NOT_VISIBLE",
        "MISSING_ORG_NUMBER",
        "MISSING_ADDRESS_OR_AREA",
        "MISSING_ABOUT_SECTION",
        "MISSING_SOCIAL_PROOF",
        "MISSING_FAQ",
        "MISSING_PRICE_OR_MODEL",
        "DATA_HANDLING_INFO_REVIEW",
        "CTA_DESTINATION_MISMATCH",
        "PLACEHOLDER_IMAGE_RISK",
        "CONTACT_PAGE_NOT_FOUND",
        "WEAK_NAVIGATION",
        "WEAK_INDUSTRY_RELEVANCE",
        "GENERIC_SERVICE_TEXT",
        "GENERIC_PRESENTATION_TRUST_RISK",
        "GENERIC_OR_AI_IMAGE_RISK",
        "MISSING_STRUCTURED_DATA",
        "VISIBLE_DISCOUNT_CODE",
        "NON_NO_DOMAIN",
        "THIN_CONTENT",
        "DOMAIN_NAME_MISMATCH",
        "EMAIL_DOMAIN_MISMATCH",
        "PUBLIC_SECTOR_CONTEXT",
      ].includes(signal.code),
    },
    {
      title: "SEO og deling",
      predicate: (signal: WebsiteQualitySignal) => [
        "WEAK_TITLE",
        "MISSING_META_DESCRIPTION",
        "DUPLICATE_META_DESCRIPTIONS",
        "WEAK_SHARE_PREVIEW",
        "MISSING_STRUCTURED_DATA",
        "NOINDEX_SIGNAL",
        "SITEMAP_MISSING",
        "MISSING_LOCAL_RELEVANCE",
      ].includes(signal.code),
    },
    {
      title: "Nettbutikk og kjøpsinformasjon",
      predicate: (signal: WebsiteQualitySignal) => [
        "COMMERCE_TERMS_MISSING",
        "COMMERCE_RETURN_INFO_MISSING",
        "COMMERCE_DELIVERY_INFO_MISSING",
        "PAYMENT_TRUST_INFO_MISSING",
        "CRAWL_TERMS_PAGE_NOT_FOUND",
      ].includes(signal.code),
    },
    {
      title: "Teknisk sikkerhet og personvern",
      predicate: (signal: WebsiteQualitySignal) => [
        "MISSING_HTTPS",
        "TLS_CERTIFICATE_REVIEW",
        "TLS_CERTIFICATE_EXPIRING",
        "HTTP_TO_HTTPS_REDIRECT_REVIEW",
        "MIXED_CONTENT_RISK",
        "MISSING_HSTS_HEADER",
        "WEAK_HSTS_HEADER",
        "MISSING_CSP_HEADER",
        "WEAK_CSP_HEADER",
        "MISSING_REFERRER_POLICY",
        "MISSING_PERMISSIONS_POLICY",
        "MISSING_CONTENT_TYPE_OPTIONS",
        "MISSING_FRAME_PROTECTION",
        "SERVER_TECH_HEADER_EXPOSED",
        "MANY_EXTERNAL_SCRIPTS",
        "THIRD_PARTY_FORM_RISK",
        "EXTERNAL_IFRAME_RISK",
        "THIRD_PARTY_EMBED_CONSENT_RISK",
        "SECURITY_TXT_MISSING",
        "ROBOTS_SENSITIVE_PATHS",
        "ADMIN_OR_LOGIN_PATH_EXPOSED",
        "LOGIN_FORM_SECURITY_REVIEW",
        "FILE_UPLOAD_REVIEW",
        "API_ENDPOINTS_VISIBLE",
        "CMS_VERSION_EXPOSED",
        "SOURCE_MAP_EXPOSED",
        "DEVELOPMENT_REFERENCE_EXPOSED",
        "TARGET_BLANK_NOOPENER_MISSING",
        "PERSONAL_DATA_GET_FORM",
        "EXTERNAL_FORM_ACTION",
        "DOM_XSS_SURFACE_REVIEW",
        "DANGEROUS_JS_SINK_REVIEW",
        "INLINE_EVENT_HANDLER_REVIEW",
        "JAVASCRIPT_HREF_REVIEW",
        "THIRD_PARTY_SCRIPT_INTEGRITY_REVIEW",
        "MANY_THIRD_PARTY_SCRIPT_HOSTS",
        "MANY_INLINE_SCRIPTS_WITHOUT_CSP",
        "POST_FORM_CSRF_REVIEW",
        "OUTDATED_JS_LIBRARY_REVIEW",
        "EMAIL_SECURITY_DNS_REVIEW",
        "EMAIL_MX_MISSING",
        "DNS_CAA_MISSING",
        "SPF_POLICY_SOFT",
        "SPF_LOOKUP_RISK",
        "DUPLICATE_SPF_RECORDS",
        "DMARC_POLICY_NONE",
        "DMARC_RUA_MISSING",
        "COOKIE_SECURE_FLAG_MISSING",
        "COOKIE_HTTPONLY_REVIEW",
        "COOKIE_SAMESITE_REVIEW",
        "MISSING_PRIVACY_NOTICE",
        "PRIVACY_LINK_REVIEW",
        "CRAWL_PRIVACY_PAGE_NOT_FOUND",
        "CRAWL_FORM_PRIVACY_REVIEW",
        "CRAWL_TERMS_PAGE_NOT_FOUND",
        "COOKIE_CONSENT_RISK",
        "GOOGLE_ANALYTICS_WITHOUT_CONSENT",
        "META_PIXEL_WITHOUT_CONSENT",
        "SESSION_TRACKING_WITHOUT_CONSENT",
        "TECHNOLOGY_STACK_DETECTED",
      ].includes(signal.code),
    },
    {
      title: "UU og brukervennlighet",
      predicate: (signal: WebsiteQualitySignal) => [
        "MISSING_LANGUAGE",
        "LANGUAGE_MISMATCH_RISK",
        "MULTIPLE_H1",
        "ACCESSIBILITY_DECLARATION_VIOLATIONS",
        "MISSING_MAIN_LANDMARK",
        "WEAK_PAGE_LANDMARKS",
        "SKIPPED_HEADING_LEVELS",
        "VAGUE_LINK_TEXT",
        "FORM_LABEL_RISK",
        "EMPTY_BUTTON_RISK",
        "IMAGE_ALT_RISK",
        "FORM_AUTOCOMPLETE_MISSING",
        "NEWSLETTER_FORM_LABEL_RISK",
        "FIXED_WIDTH_LAYOUT",
        "FOCUS_STYLE_RISK",
        "MOTION_ACCESSIBILITY_RISK",
        "IFRAME_TITLE_RISK",
        "CLIENT_LOADING_OVERLAY",
        "PHONE_NOT_CLICKABLE",
        "EMAIL_NOT_CLICKABLE",
      ].includes(signal.code),
    },
  ];
  const used = new Set<string>();
  const grouped = groups
    .map((group) => {
      const groupSignals = signals.filter((signal) => !used.has(signal.code) && group.predicate(signal));
      groupSignals.forEach((signal) => used.add(signal.code));
      return { title: group.title, signals: groupSignals };
    })
    .filter((group) => group.signals.length > 0);
  const otherSignals = signals.filter((signal) => !used.has(signal.code));
  if (otherSignals.length > 0) {
    grouped.push({ title: "Andre signaler", signals: otherSignals });
  }
  return grouped;
}

function InfoMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-[16px] border border-[#D9E2EC] bg-[#F0F4F8] px-4 py-3">
      <p className="text-[11px] font-medium text-[#52606D]">{label}</p>
      <p className="mt-1.5 text-[16px] font-semibold tracking-tight text-[#1F2933]">{value}</p>
    </div>
  );
}

function parseGeneratedEmailText(text: string) {
  const normalized = text.replaceAll("\r\n", "\n");
  const match = /^Emne:\s*(.*?)(?:\n{2,}([\s\S]*))?$/.exec(normalized);
  if (!match) {
    return {
      subject: "",
      body: normalized.trim(),
    };
  }

  return {
    subject: (match[1] ?? "").trim(),
    body: (match[2] ?? "").trim(),
  };
}

function normalizeStandaloneWebsiteInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function withInspectionContextMatch(
  inspection: WebsiteInspectionResponse,
  contextMatch: BrregWebsiteMatch
): WebsiteInspectionResponse {
  const existingMatches = inspection.brregMatches ?? [];
  if (existingMatches.some((match) => match.orgNumber === contextMatch.orgNumber)) {
    return inspection;
  }
  return {
    ...inspection,
    brregMatches: [contextMatch, ...existingMatches],
  };
}

function brregWebsiteMatchFromCompany(company: CompanyDetails, websiteUrl: string): BrregWebsiteMatch {
  return {
    orgNumber: company.orgNumber,
    name: company.name,
    organizationForm: company.organizationForm,
    website: normalizeStandaloneWebsiteInput(websiteUrl),
    email: company.email,
    phone: company.phone,
    mobile: null,
    naceCode: company.naceCode,
    naceDescription: company.naceDescription,
    municipality: company.municipality,
    county: company.county,
    registrationDate: company.registrationDate,
    matchReason: "Nettsidekandidat fra detaljsiden. BRREG har ikke registrert nettside, men kandidaten ble vurdert som mulig eller sannsynlig match.",
  };
}

function companyFromBrregWebsiteMatch(
  match: BrregWebsiteMatch,
  inspection: WebsiteInspectionResponse
): Parameters<typeof buildOutreachEmailSubject>[1] {
  const candidateContext = match.matchReason.toLowerCase().includes("nettsidekandidat");
  return {
    orgNumber: match.orgNumber,
    name: match.name,
    organizationForm: match.organizationForm,
    municipality: match.municipality,
    county: match.county,
    naceCode: match.naceCode,
    naceDescription: match.naceDescription,
    salesSegment: null,
    website: match.website || inspection.normalizedUrl,
    websiteDiscovery: {
      status: candidateContext ? "POSSIBLE_MATCH" : "REGISTERED",
      confidence: "HIGH",
      candidates: [inspection.normalizedUrl],
      verifiedCandidate: inspection.normalizedUrl,
      verifiedReachable: inspection.websiteQuality.status !== "WEAK",
      contentMatched: null,
      contentMatchReason: match.matchReason,
      pageTitle: null,
      candidateChecks: [],
      reason: candidateContext
        ? "Nettsiden er koblet til en nettsidekandidat fra virksomhetsdetaljene."
        : "Nettsiden er koblet til BRREG-treff fra frittstående nettsidesjekk.",
      source: candidateContext ? "Detaljside nettsidekandidat" : "BRREG hjemmeside",
    },
    websiteQuality: inspection.websiteQuality,
    email: match.email,
    phone: match.phone || match.mobile,
    contactPersonName: null,
  };
}

function WorkspaceTabButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  count?: number;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      aria-pressed={active}
      className={`flex h-9 shrink-0 items-center gap-2 border px-3 text-[13px] font-semibold transition-colors ${
        active
          ? "border-[#1F5FA9] bg-[#E6F0FA] text-[#1F5FA9]"
          : "border-transparent bg-white text-[#52606D] hover:bg-[#F0F4F8] hover:text-[#1F2933]"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" />
      <span>{label}</span>
      {count !== undefined ? <span className="bg-white px-1.5 py-0.5 text-[10px] text-[#52606D]">{count}</span> : null}
    </button>
  );
}

function LeadResultRow({
  batchSelectable,
  batchSelected,
  batchValidation,
  company,
  onClick,
  onToggleBatch,
  outreachStatus,
}: Readonly<{
  batchSelectable: boolean;
  batchSelected: boolean;
  batchValidation: BatchValidation | null;
  company: CompanySummary;
  onClick: () => void;
  onToggleBatch: (selected: boolean) => void;
  outreachStatus: OutreachStatus | null;
}>) {
  const priority = getLeadPriority(company);
  const commercialOpportunity = getCommercialOpportunity(company);
  const contact = getBestContactPoint(company);
  const batchExcluded = isBatchExcluded(outreachStatus);
  const risk = {
    GREEN: { label: "Lav", detail: "Ryddig registerstatus", className: "bg-emerald-50 text-emerald-700" },
    YELLOW: { label: "Bør vurderes", detail: "Begrenset registerinfo", className: "bg-amber-50 text-amber-700" },
    RED: { label: "Høy", detail: "Alvorlige registerspor", className: "bg-rose-50 text-rose-700" },
  }[company.scoreColor];

  return (
    <div className="grid gap-3 border-b border-[#E4E7EB] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#F8FBFF] lg:grid-cols-[minmax(240px,1.5fr)_minmax(170px,1fr)_minmax(190px,1fr)_minmax(150px,.8fr)_44px] lg:items-center lg:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {batchSelectable || batchValidation?.status === "checking" ? (
          <input
            aria-label={`Velg ${company.name} for e-postbatch`}
            checked={batchSelectable && batchSelected}
            className="mt-1 size-4 shrink-0 accent-[#1F5FA9]"
            disabled={!batchSelectable || batchValidation?.status === "checking"}
            onChange={(event) => onToggleBatch(event.target.checked)}
            type="checkbox"
          />
        ) : (
          <span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full bg-[#BCCCDC]" />
        )}
        <button className="min-w-0 text-left" onClick={onClick} type="button">
          <span className="block truncate text-[14px] font-semibold text-[#1F2933] hover:text-[#1F5FA9]">{company.name}</span>
          <span className="mt-1 block truncate text-[11px] text-[#52606D]">
            {company.orgNumber} · {company.organizationForm || "Ukjent form"} · {company.municipality || "Ukjent sted"}
          </span>
          {company.naceDescription ? <span className="mt-1 block truncate text-[11px] text-[#829AB1]">{company.naceDescription}</span> : null}
        </button>
      </div>

      <div className="min-w-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[#829AB1] lg:hidden">Salgsmulighet</span>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={priority.badgeClass}>{priority.label}</Badge>
          {batchExcluded ? (
            <Badge className="rounded-sm bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Batch-sperret</Badge>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[11px] text-[#52606D]">{commercialOpportunity.title}</p>
      </div>

      <div className="min-w-0">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[#829AB1] lg:hidden">Kontakt</span>
        <p className="truncate text-[12px] font-semibold text-[#1F2933]">{company.email || company.phone || "Mangler kontaktpunkt"}</p>
        <p className="mt-1 truncate text-[11px] text-[#52606D]">{contact.label}</p>
      </div>

      <div>
        <span className="mb-1 block text-[10px] font-semibold uppercase text-[#829AB1] lg:hidden">Registerrisiko</span>
        <span className={`inline-flex px-2 py-1 text-[11px] font-semibold ${risk.className}`}>{risk.label}</span>
        <p className="mt-1 text-[10px] text-[#52606D]">{risk.detail}</p>
      </div>

      <Button aria-label={`Åpne ${company.name}`} className="justify-self-end rounded-sm" onClick={onClick} size="icon" title="Åpne virksomhet" type="button" variant="ghost">
        <ChevronRight className="size-4" />
      </Button>
      {(batchValidation?.status === "blocked" && batchValidation.reason) || (batchExcluded && outreachStatus?.note) ? (
        <p className="text-[11px] text-amber-700 lg:col-span-5">
          Batch-sperret: {batchValidation?.reason || outreachStatus?.note}
        </p>
      ) : null}
    </div>
  );
}

function OutreachCheckbox({
  status,
  saving,
  onToggle,
  className,
  compact = false,
}: Readonly<{
  status: OutreachStatus | null;
  saving: boolean;
  onToggle: (sent: boolean, note?: string, statusOverride?: OutreachStatusOverride) => void;
  className?: string;
  compact?: boolean;
}>) {
  const sentAlready = status?.sent ?? false;
  const markedNotRelevant = status?.status === "not_relevant";
  const [noteDraft, setNoteDraft] = useState(status?.note ?? "");
  const noteSuggestions = [
    "Sendt til firmapost",
    "Må følges opp",
    "Ingen svar ennå",
    "Ring senere",
  ];
  const helpText = saving
    ? "Oppdaterer utsendelsesstatus ..."
    : markedNotRelevant
      ? "Markert som ikke aktuell. Du kan angre eller sende likevel senere."
    : sentAlready
      ? "Registrert som sendt. Ny utsendelse krever eksplisitt overstyring."
      : "Marker når første e-post er sendt, så unngår du dobbelt henvendelse.";
  const wrapperClassName = [
    className,
    compact ? "mt-4" : "",
    "border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3",
  ].filter(Boolean).join(" ");

  function persistNote(nextNote: string) {
    setNoteDraft(nextNote);
    if (compact || saving) {
      return;
    }

    if (markedNotRelevant) {
      onToggle(false, nextNote, "not_relevant");
      return;
    }

    onToggle(sentAlready, nextNote, sentAlready ? "sent" : "reverted");
  }

  return (
    <div className={wrapperClassName}>
      <label className="flex items-start gap-3">
        <input
          checked={sentAlready}
          className="mt-0.5 size-4 rounded-none border border-[#9FB3C8] accent-[#1F5FA9]"
          disabled={compact || saving || sentAlready || markedNotRelevant}
          onChange={(event) => onToggle(event.target.checked, noteDraft)}
          type="checkbox"
        />
        <span className="min-w-0">
          <span className="block text-[12px] font-semibold text-[#1F2933]">
            Første e-post om nettside er sendt
          </span>
          {!compact ? <span className="mt-1 block text-[12px] text-[#52606D]">{helpText}</span> : null}
          {status?.sent && status.sentAt ? (
            <span className="mt-1 block text-[11px] font-medium text-[#52606D]">
              Sendt {formatDateTime(status.sentAt)}
            </span>
          ) : null}
          {markedNotRelevant ? (
            <span className="mt-1 block text-[11px] font-medium text-[#52606D]">
              Markert som ikke aktuell
            </span>
          ) : null}
          {sentAlready || markedNotRelevant || compact ? (
            status?.note ? (
              <span className="mt-2 block text-[12px] text-[#52606D]">
                Notat: {status.note}
              </span>
            ) : null
          ) : (
            <span className="mt-3 block">
              <span className="mb-2 flex flex-wrap gap-2">
                {noteSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-sm border border-[#D9E2EC] bg-white px-2.5 py-1 text-[11px] font-medium text-[#52606D] transition-colors hover:bg-[#F0F4F8]"
                    disabled={saving}
                    onClick={() => persistNote(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-sm border border-[#BCCCDC] bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-semibold text-[#52606D] transition-colors hover:bg-[#EAF1F7]"
                  disabled={saving}
                  onClick={() => persistNote("")}
                >
                  Fjern kommentar
                </button>
              </span>
              <textarea
                className="min-h-[72px] w-full rounded-none border border-[#BCCCDC] bg-white px-3 py-2 text-[12px] text-[#1F2933] outline-none transition-colors placeholder:text-[#7B8794] focus:border-[#1F5FA9]"
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Kort notat, f.eks. sendt til firmapost eller må følges opp senere"
                value={noteDraft}
              />
            </span>
          )}
          {!sentAlready && !markedNotRelevant ? (
            <span className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-sm border border-[#7B8794] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#52606D] transition-colors hover:bg-[#F0F4F8] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={() => onToggle(false, compact ? "Ikke aktuell fra hovedsiden" : noteDraft, "not_relevant")}
              >
                Ikke aktuell
              </button>
            </span>
          ) : null}
          {(sentAlready || markedNotRelevant) && !compact ? (
            <span className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-sm border border-[#D9E2EC] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#52606D] transition-colors hover:bg-[#F0F4F8] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={() => onToggle(false, status?.note ?? noteDraft, "reverted")}
              >
                Angre
              </button>
              <button
                type="button"
                className="rounded-sm border border-[#1F5FA9] bg-[#1F5FA9] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#2F6FB2] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={() => onToggle(true, status?.note ?? noteDraft, "sent")}
              >
                {markedNotRelevant ? "Send likevel" : "Send på nytt likevel"}
              </button>
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

function detailLeadSignalConfig(label: string) {
  switch (label) {
    case "Sterkt lead":
      return {
        icon: CheckCircle2,
        text: "bg-[#E6F0FA] text-[#1F5FA9] border-[#C7DFF8]",
      };
    case "Mulig lead":
      return {
        icon: AlertTriangle,
        text: "bg-amber-50 text-amber-700 border-amber-100",
      };
    default:
      return {
        icon: AlertCircle,
        text: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

function CompanyDetailView({
  company,
  events,
  generatedEmail,
  generatingEmail,
  emailSendError,
  emailSentRecipient,
  sendingEmail,
  outreachStatus,
  outreachSaving,
  onBack,
  onGenerateEmail,
  onSendEmail,
  onUpdateGeneratedEmail,
  onToggleOutreach,
  onInspectWebsite,
}: Readonly<{
  company: CompanyDetails;
  events: CompanyEvent[];
  generatedEmail: { subject: string; body: string } | null;
  generatingEmail: boolean;
  emailSendError: string | null;
  emailSentRecipient: string | null;
  sendingEmail: boolean;
  outreachStatus: OutreachStatus | null;
  outreachSaving: boolean;
  onBack: () => void;
  onGenerateEmail: () => void;
  onSendEmail: () => void;
  onUpdateGeneratedEmail: (text: string) => void;
  onToggleOutreach: (sent: boolean, note?: string, statusOverride?: OutreachStatusOverride) => void;
  onInspectWebsite: (url: string) => void;
}>) {
  const leadPriority = getLeadPriority(company);
  const config = detailLeadSignalConfig(leadPriority.label);
  const StatusIcon = config.icon;
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedHtmlEmail, setCopiedHtmlEmail] = useState(false);
  const [currentWebsiteQuality, setCurrentWebsiteQuality] = useState(company.websiteQuality);
  const [extendedWebsiteQualityLoading, setExtendedWebsiteQualityLoading] = useState(false);
  const [extendedWebsiteQualityError, setExtendedWebsiteQualityError] = useState<string | null>(null);
  const extendedWebsiteQualityRequestKeyRef = useRef<string | null>(null);

  const scoreLabel = leadPriority.label;
  const scoreReasons = company.score?.reasons || [];
  const scoreEvidence = company.score?.evidence || [];
  const structureSignals = company.structureSignals || [];
  const elevatedActorContextSignal = structureSignals.find((signal) => signal.code === "ACTOR_CONTEXT_ELEVATED") ?? null;
  const commercialOpportunity = getCommercialOpportunity(company);
  const offerType = outreachOfferTypeForCompany(company);
  const requiresManualWebsiteCheck = offerType === "website-unavailable-offer" || offerType === "website-improvement-offer" || offerType === "website-registered-review";
  const mailQualityLine = offerType === "website-improvement-offer" ? websiteQualityMailLine(company) : "";
  const quickEvidence = scoreEvidence.slice(0, 3);
  const extendedEvidence = scoreEvidence.slice(3);
  const primaryReason = scoreEvidence[0]?.detail || scoreReasons[0] || "Ingen begrunnelse oppgitt.";
  const generatedEmailText = generatedEmail ? `Emne: ${generatedEmail.subject}\n\n${generatedEmail.body}` : "";
  const generatedEmailHtml = generatedEmail ? buildOutreachEmailHtml(generatedEmail.body) : "";
  const generatedEmailHref = generatedEmail && company.email
    ? `mailto:${company.email}?subject=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(generatedEmail.body)}`
    : null;
  useEffect(() => {
    setCurrentWebsiteQuality(company.websiteQuality);
    setExtendedWebsiteQualityError(null);
    setExtendedWebsiteQualityLoading(false);

    if (!company.website) {
      extendedWebsiteQualityRequestKeyRef.current = null;
      return;
    }

    const requestKey = `${company.orgNumber}:${normalizeWebsiteUrl(company.website)}`;
    if (extendedWebsiteQualityRequestKeyRef.current === requestKey) {
      return;
    }

    extendedWebsiteQualityRequestKeyRef.current = requestKey;
    void runExtendedCompanyWebsiteInspection(company.website);
  }, [company.orgNumber, company.website, company.websiteQuality]);

  async function runExtendedCompanyWebsiteInspection(website: string) {
    setExtendedWebsiteQualityLoading(true);
    setExtendedWebsiteQualityError(null);
    try {
      const response = await fetch(`/api/company-check/website-inspection/extended?url=${encodeURIComponent(normalizeWebsiteUrl(website))}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to run extended company website inspection", errorText);
        setExtendedWebsiteQualityError("Klarte ikke kjøre utvidet nettsidesjekk.");
        return;
      }
      const payload = (await response.json()) as WebsiteInspectionResponse;
      setCurrentWebsiteQuality(payload.websiteQuality);
    } catch (error) {
      console.error("Failed to run extended company website inspection", error);
      setExtendedWebsiteQualityError("Klarte ikke kjøre utvidet nettsidesjekk.");
    } finally {
      setExtendedWebsiteQualityLoading(false);
    }
  }

  async function handleCopyGeneratedEmail() {
    if (!generatedEmailText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedEmailText);
      setCopiedEmail(true);
      window.setTimeout(() => {
        setCopiedEmail(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy generated email", error);
    }
  }

  async function handleCopyGeneratedHtmlEmail() {
    if (!generatedEmail || !generatedEmailHtml) {
      return;
    }

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([generatedEmailHtml], { type: "text/html" }),
            "text/plain": new Blob([generatedEmail.body], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(generatedEmail.body);
      }

      setCopiedHtmlEmail(true);
      window.setTimeout(() => {
        setCopiedHtmlEmail(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy generated HTML email", error);
    }
  }

  return (
    <div className="detail-shell mx-auto max-w-6xl pt-4 sm:pt-6">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-sm border border-[#D9E2EC] bg-white text-[#1F2933] hover:bg-[#F0F4F8]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Tilbake til treff
        </Button>
      </div>

      <div className="detail-panel overflow-hidden border border-[#D9E2EC] bg-white">
        {/* Header Section */}
        <div className="relative p-5 sm:p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-5">
              <div className={`flex size-14 items-center justify-center border ${config.text}`}>
                <StatusIcon className="size-7" />
              </div>
              <div>
                <p className="mb-2 text-[12px] font-medium text-[#52606D]">
                  Registerstatus og leadvurdering
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1F2933] md:text-[2.5rem]">
                  {company.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-2.5 text-[13px] font-medium text-[#52606D]">
                  <span className="border border-[#E4E7EB] bg-[#FFFFFF] px-2 py-0.5 font-mono">
                    {company.orgNumber}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {company.organizationForm}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {company.municipality}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-[13px] font-semibold ${config.text} border`}>
                {scoreLabel}
              </div>
              <p className="max-w-xs text-[13px] font-medium leading-relaxed text-[#52606D] md:text-right">
                En rask leadvurdering basert på offentlige registerspor, kontaktpunkter og digital synlighet.
              </p>
            </div>
          </div>

          <Separator className="bg-[#E4E7EB]" />

          <div className="mt-6 border border-[#D9E2EC] bg-[#F8FBFF] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[#52606D]">Oppsummering</p>
                  <h3 className="mt-1 text-[20px] font-semibold text-[#1F2933]">Rask vurdering</h3>
                  <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[#52606D]">
                    Dette er det raske beslutningsbildet: leadvurdering, viktigste registerspor og om selskapet ser kontaktbart ut.
                  </p>
                </div>
                <div className="grid min-w-[220px] gap-2 sm:grid-cols-3 md:grid-cols-1">
                  <InfoMetric label="Leadvurdering" value={scoreLabel} />
                  <InfoMetric label="Hendelser" value={`${events.length}`} />
                  <InfoMetric label="Rollepunkter" value={`${company.roles?.length ?? 0}`} />
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DetailDataPoint icon={CalendarDays} label="Etablert" value={company.registrationDate || "Ukjent"} />
                <DetailDataPoint icon={CalendarDays} label="Stiftet" value={company.foundationDate || "Ikke oppgitt"} />
                <DetailDataPoint icon={Landmark} label="Bransje" value={company.naceDescription || "Ikke oppgitt"} />
                <DetailDataPoint icon={Landmark} label="Salgsgruppe" value={company.salesSegment ? `${company.salesSegment.label} (${company.salesSegment.score})` : "Ikke klassifisert"} />
                <DetailDataPoint
                  icon={Globe}
                  label="Nettside"
                  value={company.website || "Ingen registrert"}
                  href={company.website ? normalizeWebsiteUrl(company.website) : undefined}
                />
                <DetailDataPoint icon={Mail} label="MVA" value={formatRegistryFlag(company.vatRegistered)} />
                <DetailDataPoint icon={Phone} label="Foretaksregister" value={formatRegistryFlag(company.registeredInBusinessRegistry)} />
                <DetailDataPoint icon={MapPin} label="Fylke" value={company.county || "Ukjent"} />
                <DetailDataPoint icon={Building2} label="Ansatte" value={formatEmployeeCount(company.employeeCount, company.employeeCountRegistered)} />
                <DetailDataPoint icon={Landmark} label="Siste årsregnskap" value={company.latestAnnualAccountsYear || "Ikke registrert"} />
              </div>

              <div className={`mt-8 border p-5 ${config.text} border-opacity-50`}>
                <p className="mb-2 text-[12px] font-medium opacity-70">Kort registerspor</p>
                <p className="text-[15px] font-semibold leading-relaxed">{primaryReason}</p>
              </div>

              {!company.website && company.websiteDiscovery?.status === "POSSIBLE_MATCH" && company.websiteDiscovery.candidates.length > 0 ? (
                <div className="mt-4 border border-[#D9E2EC] bg-white p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[12px] font-medium text-[#52606D]">
                      {company.websiteDiscovery.contentMatched ? "Sannsynlig nettside" : "Mulig nettside"}
                    </p>
                    <a
                      className="inline-flex items-center rounded-sm border border-[#BCCCDC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1F2933] hover:border-[#829AB1] hover:bg-[#F8FBFF]"
                      href={buildGoogleSearchUrl(company.name)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Google-søk
                    </a>
                  </div>
                  <p className="text-[15px] font-semibold leading-relaxed text-[#1F2933]">
                    {company.websiteDiscovery.contentMatched
                      ? "Ingen registrert nettside i BRREG, men kandidaten ser ut til å høre til selskapet."
                      : "Ingen registrert nettside i BRREG, men vi fant en mulig kandidat."}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {websiteCandidateRows(company.websiteDiscovery).map((candidate) => (
                      <div
                        key={candidate.url}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-2 text-[12px] font-semibold text-[#1F2933]"
                      >
                        <div className="min-w-0">
                          <a
                            className="text-[#1F5FA9] hover:underline"
                            href={candidate.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {stripWebsiteProtocol(candidate.url)}
                          </a>
                          <p className="mt-1 text-[11px] font-medium text-[#52606D]">
                            {formatWebsiteCandidateStatus(candidate)}
                          </p>
                        </div>
                        <button
                          className="rounded-sm border border-[#BCCCDC] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1F5FA9] hover:border-[#829AB1] hover:bg-white"
                          onClick={() => onInspectWebsite(candidate.url)}
                          type="button"
                        >
                          Nettsidesjekk
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-[#52606D]">{company.websiteDiscovery.reason}</p>
                  {company.websiteDiscovery.pageTitle ? (
                    <p className="mt-2 text-[12px] font-medium text-[#52606D]">
                      Sidetittel: {company.websiteDiscovery.pageTitle}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[12px] font-medium text-[#52606D]">
                    {formatWebsiteVerification(company.websiteDiscovery)}
                  </p>
                  {company.websiteDiscovery.contentMatchReason ? (
                    <p className="mt-2 text-[12px] font-medium text-[#52606D]">
                      {company.websiteDiscovery.contentMatchReason}
                    </p>
                  ) : null}
                  <div className="mt-4 border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                    <p className="text-[12px] font-semibold text-[#1F2933]">Slik ble kandidaten vurdert</p>
                    <ul className="mt-3 space-y-2 text-[12px] leading-5 text-[#52606D]">
                      {websiteDiscoveryExplanationItems(company.websiteDiscovery, company.name).map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#9FB3C8]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7B8794]">
                    {formatWebsiteConfidence(company.websiteDiscovery.confidence)} sikkerhet · {company.websiteDiscovery.source}
                  </p>
                </div>
              ) : null}

              {company.website && company.websiteDiscovery?.status === "REGISTERED" && company.websiteDiscovery.verifiedReachable === false ? (
                <div className="mt-4 border border-amber-200 bg-amber-50/70 p-5">
                  <p className="mb-2 text-[12px] font-medium text-amber-800">Registrert nettside svarer ikke</p>
                  <p className="text-[15px] font-semibold leading-relaxed text-[#1F2933]">
                    Nettsiden er registrert i BRREG, men svarte ikke ved teknisk sjekk på detaljsiden.
                  </p>
                  <a
                    className="mt-3 inline-flex rounded-sm border border-amber-200 bg-white px-3 py-2 text-[12px] font-semibold text-[#1F5FA9] hover:bg-[#F8FBFF]"
                    href={normalizeWebsiteUrl(company.website)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Åpne registrert nettside
                  </a>
                  <p className="mt-3 text-[13px] leading-relaxed text-[#52606D]">
                    Dette kan være DNS-feil, timeout, 404/5xx, SSL-feil eller midlertidig nedetid. Sjekk manuelt før du bruker det i kontakt.
                  </p>
                  {company.websiteDiscovery.contentMatchReason ? (
                    <p className="mt-2 text-[12px] font-medium text-[#52606D]">
                      {company.websiteDiscovery.contentMatchReason}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {company.website && currentWebsiteQuality ? (
                <div className="mt-4">
                  <div className="border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#1F2933]">Utvidet nettsidekvalitet</p>
                        <p className="mt-1 text-[12px] leading-5 text-[#52606D]">
                          Kjøres sammen med nettsidesjekken og henter blant annet publisert tilgjengelighetserklæring fra uustatus.no når nettsiden lenker dit.
                        </p>
                      </div>
                    </div>
                    {extendedWebsiteQualityLoading ? (
                      <p className="mt-3 text-[12px] font-semibold text-[#52606D]">Kjører samlet nettsidesjekk...</p>
                    ) : null}
                    {extendedWebsiteQualityError ? (
                      <p className="mt-3 text-[12px] font-semibold text-[#BA2525]">{extendedWebsiteQualityError}</p>
                    ) : null}
                  </div>
                  <WebsiteQualityPanel className="mt-4" quality={currentWebsiteQuality} />
                </div>
              ) : null}

              {elevatedActorContextSignal ? (
                <div className="mt-4 border border-[#D9E2EC] bg-white p-5">
                  <p className="mb-2 text-[12px] font-medium text-[#52606D]">Løftet aktørkontekst</p>
                  <p className="text-[15px] font-semibold leading-relaxed text-[#1F2933]">{elevatedActorContextSignal.title}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#52606D]">{elevatedActorContextSignal.detail}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7B8794]">{elevatedActorContextSignal.source}</p>
                </div>
              ) : null}

              <div className={`mt-4 border p-5 ${commercialOpportunity.cardClass}`}>
                <div>
                  <div>
                    <p className="text-[12px] font-medium text-[#52606D]">Kommersiell mulighet</p>
                    <h4 className="mt-1 text-[17px] font-semibold text-[#1F2933]">{commercialOpportunity.title}</h4>
                    <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[#52606D]">{commercialOpportunity.summary}</p>
                  </div>
                </div>
              </div>

              <OutreachCheckbox
                key={`${company.orgNumber}-${outreachStatus?.sentAt ?? "draft"}-${outreachStatus?.note ?? ""}`}
                className="mt-4"
                saving={outreachSaving}
                status={outreachStatus}
                onToggle={onToggleOutreach}
              />

              <div className="mt-4 border border-[#D9E2EC] bg-white p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-[#52606D]">Tilbudsmail</p>
                    <h4 className="mt-1 text-[17px] font-semibold text-[#1F2933]">Generer e-posttekst fra mal</h4>
                    <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[#52606D]">
                      Bruk Markdown-malen i `data/outreach-email-template.md` og fyll inn selskapsdata automatisk.
                    </p>
                    <div className="mt-3 inline-flex rounded-sm border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-2 text-[12px] font-semibold text-[#1F2933]">
                      Tilbudstype: {formatOutreachOfferType(offerType)}
                    </div>
                    {requiresManualWebsiteCheck ? (
                      <p className="mt-3 max-w-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-[12px] font-medium leading-5 text-amber-800">
                        {offerType === "website-registered-review"
                          ? "Selskapet har registrert nettside som ser grei ut i automatisk sjekk. Send bare hvis du har gjort en manuell vurdering og ser et konkret forbedringsbehov."
                          : "Sjekk nettsiden manuelt før du sender. Denne mailtypen bygger på teknisk nettsidesjekk og enkle kvalitetssignaler."}
                      </p>
                    ) : null}
                    {mailQualityLine ? (
                      <div className="mt-3 max-w-2xl border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-2">
                        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#52606D]">Linje som brukes i mail</p>
                        <p className="mt-1 text-[12px] font-semibold leading-5 text-[#1F2933]">{mailQualityLine}</p>
                      </div>
                    ) : null}
                  </div>
                  <Button
                    className="rounded-sm bg-[#1F5FA9] px-4 text-white hover:bg-[#2F6FB2]"
                    disabled={generatingEmail}
                    onClick={onGenerateEmail}
                    type="button"
                  >
                    {generatingEmail ? "Genererer..." : "Generer mailtekst"}
                  </Button>
                </div>

                {generatedEmail ? (
                  <div className="mt-5 space-y-3">
                    <div className="border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#52606D]">Emne</p>
                      <p className="mt-1 text-[14px] font-semibold text-[#1F2933]">{generatedEmail.subject}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="rounded-sm border border-[#D9E2EC] bg-white px-4 text-[#52606D] hover:bg-[#F0F4F8]"
                        onClick={() => void handleCopyGeneratedEmail()}
                        type="button"
                      >
                        {copiedEmail ? "Kopiert" : "Kopier mailtekst"}
                      </Button>
                      <Button
                        className="rounded-sm border border-[#D9E2EC] bg-white px-4 text-[#52606D] hover:bg-[#F0F4F8]"
                        onClick={() => void handleCopyGeneratedHtmlEmail()}
                        type="button"
                      >
                        {copiedHtmlEmail ? "HTML kopiert" : "Kopier HTML-mail"}
                      </Button>
                      {generatedEmailHref ? (
                        <button
                          className="inline-flex items-center justify-center rounded-sm border border-[#D9E2EC] bg-white px-4 py-2 text-[12px] font-semibold text-[#52606D] transition-colors hover:bg-[#F0F4F8]"
                          onClick={() => {
                            window.open(generatedEmailHref, "_blank", "noopener,noreferrer");
                          }}
                          type="button"
                        >
                          Åpne i e-post
                        </button>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-sm border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-2 text-[12px] font-medium text-[#7B8794]">
                          Mangler e-postadresse
                        </span>
                      )}
                      <Button
                        className="rounded-sm border border-[#D9E2EC] bg-white px-4 text-[#52606D] hover:bg-[#F0F4F8]"
                        disabled={!company.email || sendingEmail || outreachSaving}
                        onClick={onSendEmail}
                        type="button"
                      >
                        {sendingEmail ? "Sender..." : "Send automatisk"}
                      </Button>
                    </div>
                    {emailSendError ? (
                      <p className="rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                        {emailSendError}
                      </p>
                    ) : null}
                    {emailSentRecipient ? (
                      <p className="rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800">
                        Sendt til: {emailSentRecipient}
                      </p>
                    ) : null}
                    <div className="border border-[#D9E2EC] bg-[#F8FBFF] p-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#52606D]">Mailtekst</p>
                      <textarea
                        className="min-h-[260px] w-full resize-y border border-[#D9E2EC] bg-white p-3 text-[13px] leading-6 text-[#1F2933] outline-none focus:border-[#2F6FB2]"
                        onChange={(event) => onUpdateGeneratedEmail(event.target.value)}
                        value={generatedEmailText}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="border border-[#D9E2EC] bg-white p-5">
                  <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Viktigste registerspor</h4>
                  <div className="space-y-3">
                    {quickEvidence.length > 0 ? (
                      quickEvidence.map((item) => (
                        <div key={`${item.label}-${item.source}`} className="border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                          <p className="text-[13px] font-bold text-[#1F2933]">{item.label}</p>
                          <p className="mt-1 text-[13px] leading-relaxed text-[#52606D]">{item.detail}</p>
                          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7B8794]">{item.source}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[14px] text-[#52606D]">Ingen tydelige registerspor tilgjengelig.</p>
                    )}
                  </div>
                </div>

                <div className="border border-[#D9E2EC] bg-white p-5">
                  <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Kontakt og synlighet</h4>
                  <div className="space-y-3">
                    <ContactLine
                      icon={Building2}
                      label="Kontaktperson"
                      value={company.contactPersonName}
                      subvalue={company.contactPersonRole ? formatRoleType(company.contactPersonRole) : null}
                    />
                    <ContactLine
                      icon={Mail}
                      label="E-post"
                      value={company.email}
                      href={company.email ? `mailto:${company.email}` : undefined}
                    />
                    <ContactLine
                      icon={Phone}
                      label="Telefon"
                      value={company.phone}
                      href={company.phone ? `tel:${company.phone.replace(/\s+/g, "")}` : undefined}
                    />
                    <ContactLine
                      icon={Globe}
                      label="Nettside"
                      value={company.website}
                      href={company.website ? normalizeWebsiteUrl(company.website) : undefined}
                    />
                  </div>
                </div>
              </div>
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-150 border-t border-[#E4E7EB] bg-[#F0F4F8] p-5 sm:p-6 md:p-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-[12px] font-medium text-[#52606D]">Analysegrunnlag</p>
                  <h3 className="text-[18px] font-semibold text-[#1F2933]">Roller og registerspor</h3>
                  <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[#52606D]">
                    Dette er et øyeblikksbilde fra åpne registerdata, uten lagret historikk eller nettverksanalyse.
                  </p>
                </div>
                <p className="hidden max-w-sm text-right text-[13px] font-medium leading-relaxed text-[#52606D] md:block">
                  Roller gir et raskt bilde av hvem som faktisk står synlig bak virksomheten i åpne registerdata.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {company.roles && company.roles.length > 0 ? (
                  company.roles.map((role, i) => (
                    <div key={`${role.type}-${role.name}-${i}`} className="border border-[#D9E2EC] bg-white px-4 py-3">
                      <p className="mb-1 text-[11px] font-medium text-[#52606D]">{role.type}</p>
                      <p className="text-[14px] font-bold text-[#1F2933]">{role.name}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-[#7B8794]">Ingen roller funnet i åpne data.</p>
                )}
              </div>
        </div>
      </div>

      <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-200 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {extendedEvidence.map((item, i) => (
              <div key={`evidence-${item.label}-${i}`} className="insight-card border border-[#D9E2EC] bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <div className={`size-2 rounded-full ${scoreColors[company.scoreColor] || scoreColors.YELLOW}`} />
                  <h4 className="text-[14px] font-semibold text-[#1F2933]">{item.label}</h4>
                </div>
                <p className="text-[14px] font-medium leading-relaxed text-[#52606D]">{item.detail}</p>
                <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7B8794]">{item.source}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="insight-card border border-[#D9E2EC] bg-white p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Strukturmønstre</h4>
              <div className="space-y-3">
                {structureSignals.length > 0 ? (
                  structureSignals.map((signal) => (
                    <div key={signal.code} className="border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13px] font-bold text-[#1F2933]">{signal.title}</p>
                        <span className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-semibold ${structureSignalSeverityClassName(signal.severity)}`}>
                          {formatStructureSignalSeverity(signal.severity)}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#52606D]">{signal.detail}</p>
                      {describeStructureSignal(signal) ? (
                        <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#1F5FA9]">
                          {describeStructureSignal(signal)}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7B8794]">{signal.source}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen tydelige strukturmønstre er slått ut for dette selskapet ennå. Det betyr ikke nødvendigvis fravær av risiko, bare at dagens mønstermotor ikke har funnet et klart kryssselskapsmønster.</p>
                )}
              </div>
            </div>

            <div className="insight-card border border-[#D9E2EC] bg-white p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Registrerte hendelser</h4>
              <div className="space-y-3">
                {events.length > 0 ? (
                  events.slice(0, 8).map((event, index) => (
                    <div key={`${event.type}-${event.date}-${index}`} className="border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[13px] font-bold text-[#1F2933]">{event.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-medium text-[#52606D]">{formatEventType(event.type)}</p>
                            <span className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-semibold ${eventSeverityClassName(event.severity)}`}>
                              {formatEventSeverity(event.severity)}
                            </span>
                          </div>
                        </div>
                        <p className="whitespace-nowrap text-[12px] font-medium text-[#52606D]">{event.date ? formatEventDate(event.date) : "Udatert"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen registrerte hendelser å vise ennå. Det betyr vanligvis at vi foreløpig bare har grunndata, uten synlige kunngjøringer eller normaliserte hendelser for selskapet.</p>
                )}
              </div>
            </div>

            <div className="insight-card border border-[#D9E2EC] bg-white p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Registerspor bak vurderingen</h4>
              <div className="flex flex-wrap gap-2">
                {scoreEvidence.length > 0 ? (
                  scoreEvidence.map((item) => (
                    <Badge key={`${item.label}-${item.source}`} variant="outline" className="rounded-sm border-[#D9E2EC] bg-[#FFFFFF] text-[11px] font-medium text-[#52606D]">
                      {item.label}
                    </Badge>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen tydelige signaler trekker vurderingen i en bestemt retning.</p>
                )}
              </div>
            </div>

            <div className="insight-card border border-[#D9E2EC] bg-white p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Hvordan vi vurderer</h4>
              <div className="space-y-3">
                {modelRules.map((rule) => (
                  <p key={rule} className="text-[14px] font-medium leading-relaxed text-[#52606D]">
                    {rule}
                  </p>
                ))}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

const scoreColors = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-500",
  RED: "bg-rose-500",
};

function DetailDataPoint({
  icon: Icon,
  label,
  value,
  href,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}>) {
  return (
    <div className="border border-[#D9E2EC] bg-white p-4">
      <div className="flex items-start gap-3.5">
        <div className="mt-1 border border-[#E4E7EB] bg-[#F0F4F8] p-2 text-[#52606D]">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#52606D]">
            {label}
          </p>
          {href ? (
            <a
              className="block truncate text-[14px] font-semibold text-[#1F5FA9] underline underline-offset-4 hover:text-[#2F6FB2]"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {value}
            </a>
          ) : (
            <p className="text-[14px] font-semibold text-[#1F2933]">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactLine({
  icon: Icon,
  label,
  value,
  subvalue,
  href,
}: Readonly<{
  icon: LucideIcon;
  label: string;
  value: string | null;
  subvalue?: string | null;
  href?: string;
}>) {
  return (
    <div className="border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 border border-[#E4E7EB] bg-[#F0F4F8] p-2 text-[#52606D]">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[#52606D]">{label}</p>
          {value ? (
            href ? (
              <a
                className="block truncate text-[14px] font-semibold text-[#1F5FA9] underline underline-offset-4 hover:text-[#2F6FB2]"
                href={href}
                rel="noreferrer"
                target="_blank"
              >
                {value}
              </a>
            ) : (
              <p className="text-[14px] font-semibold text-[#1F2933]">{value}</p>
            )
          ) : (
            <p className="text-[14px] text-[#7B8794]">Ikke registrert</p>
          )}
          {subvalue ? (
            <p className="mt-1 text-[12px] font-medium text-[#52606D]">{subvalue}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildResultsSummary(
  daysFilter: string,
  countyFilter: string,
  organizationFormFilter: string,
  organizationForms: string[],
  selectedLegend: keyof typeof legendDetails | null,
) {
  const days = daysFilter || "5";
  const timePart = days === "0" ? "Alle data" : `Siste ${days} dager`;
  const countyPart = countyFilter ? `i ${countyFilter}` : "i hele landet";
  const organizationFormLabel = organizationForms.find((item) => item.startsWith(`${organizationFormFilter} - `));
  const formPart = organizationFormFilter
    ? `for ${organizationFormLabel ?? organizationFormFilter}`
    : "";
  const signalPart = selectedLegend ? `med ${legendDetails[selectedLegend].title.toLowerCase()}` : "";

  return [timePart, countyPart, formPart, signalPart].filter(Boolean).join(" ");
}

