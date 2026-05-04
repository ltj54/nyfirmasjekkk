"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  Building2,
  CalendarDays,
  Globe,
  Mail,
  Phone,
  Landmark,
  MapPin,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Menu,
  ArrowLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  CompanyEvent,
  CompanyDetails,
  CompanySummary,
  MetadataFiltersResponse,
  OutreachImportResponse,
  OutreachStatus,
} from "@/lib/company-check";
import {
  applyLeadQuickFilters,
  compareLeadPriority,
  describeListStructureSummary,
  getBestContactPoint,
  getCommercialOpportunity,
  getContactability,
  getLeadPriority,
  prioritizedListStructureSignals,
  type LeadQuickFilter,
} from "@/lib/company-lead-scoring";
import {
  buildOutreachEmailBody,
  buildOutreachEmailHtml,
  buildOutreachEmailSubject,
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
  formatNokPrice,
  formatRegistryFlag,
  formatRoleType,
  formatStructureSignalSeverity,
  formatWebsiteCandidateStatus,
  formatWebsiteConfidence,
  formatWebsiteContentMatch,
  formatWebsiteVerification,
  getLatestOutreachEntriesByOrg,
  listStructureSignalClassName,
  normalizeWebsiteUrl,
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

const visibleOrganizationForms = ["AS", "ENK", "DA", "ANS", "NUF", "STIFT", "SA", "FLI", "ASA", "BA"];

const leadQuickFilterOptions: Array<{ value: LeadQuickFilter; label: string }> = [
  { value: "HAS_EMAIL", label: "Har e-post" },
  { value: "MISSING_WEBSITE", label: "Mangler nettside" },
  { value: "NOT_SENT", label: "Ikke sendt" },
  { value: "NOT_RELEVANT", label: "Ikke aktuell" },
];

export function CompanyCheckShell() {
  const [backendReady, setBackendReady] = useState(false);
  const [initialResultsReady, setInitialResultsReady] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
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
  const [selectedLegend, setSelectedLegend] = useState<keyof typeof legendDetails | null>("GREEN");
  const [leadQuickFilters, setLeadQuickFilters] = useState<LeadQuickFilter[]>([]);
  const [selectedCompanyEvents, setSelectedCompanyEvents] = useState<CompanyEvent[]>([]);
  const [outreachStatusByOrg, setOutreachStatusByOrg] = useState<Record<string, OutreachStatus>>({});
  const [outreachEntries, setOutreachEntries] = useState<OutreachStatus[]>([]);
  const [isOutreachListLoading, setIsOutreachListLoading] = useState(false);
  const [outreachListError, setOutreachListError] = useState<string | null>(null);
  const [isOutreachImporting, setIsOutreachImporting] = useState(false);
  const [outreachImportMessage, setOutreachImportMessage] = useState<string | null>(null);
  const [savingOutreachByOrg, setSavingOutreachByOrg] = useState<Record<string, boolean>>({});
  const [generatedEmailByOrg, setGeneratedEmailByOrg] = useState<Record<string, { subject: string; body: string }>>({});
  const [generatingEmailByOrg, setGeneratingEmailByOrg] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const latestListRequestId = useRef(0);
  const hasDetailHistoryEntryRef = useRef(false);

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
    company: Pick<CompanySummary, "orgNumber" | "name" | "organizationForm">,
    sent: boolean,
    note?: string,
    statusOverride?: "sent" | "reverted" | "not_relevant"
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
          price: 4500,
          channel: "email",
          offerType: "website-offer",
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

  async function generateOutreachEmail(company: Pick<CompanySummary, "orgNumber" | "name" | "contactPersonName" | "email" | "phone" | "municipality" | "county" | "naceCode" | "naceDescription" | "salesSegment">) {
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

  const handleCloseDetail = useEffectEvent(() => {
    resetToLanding();
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
    const params = new URLSearchParams();
    params.set("dager", effectiveDaysFilter);
    params.set("page", pageNum.toString());
    if (effectiveCountyFilter) params.set("county", effectiveCountyFilter);
    if (effectiveOrganizationFormFilter) params.set("organizationForm", effectiveOrganizationFormFilter);
    if (effectiveSelectedLegend) params.set("score", effectiveSelectedLegend);

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
    if (backendReady && initialResultsReady && !selectedCompany) {
      void fetchRecent(0);
    }
  });

  useEffect(() => {
    runRefreshRecent();
  }, [backendReady, initialResultsReady, daysFilter, countyFilter, organizationFormFilter, selectedLegend, selectedCompany]);

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
    if (!selectedCompany) {
      document.body.style.overflow = "";
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseDetail();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedCompany]);

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

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetToLanding() {
    if (selectedCompany && hasDetailHistoryEntryRef.current) {
      hasDetailHistoryEntryRef.current = false;
      window.history.back();
      return;
    }
    setSelectedCompany(null);
    setSelectedLegend(null);
    setDaysFilter("5");
    setCountyFilter("");
    setOrganizationFormFilter("");
    setLeadQuickFilters([]);
    void fetchRecent(0, {
      daysFilter: "5",
      countyFilter: "",
      organizationFormFilter: "",
      selectedLegend: null,
    });
  }

  function toggleLeadQuickFilter(filter: LeadQuickFilter) {
    setLeadQuickFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    );
  }

  const filteredCompanies = applyLeadQuickFilters((selectedLegend
    ? recentCompanies.filter((company) => company.scoreColor === selectedLegend)
    : recentCompanies
  ), outreachStatusByOrg, leadQuickFilters).sort(compareLeadPriority);
  const visibleSearchCompanies = filteredCompanies.filter((company) => {
    const outreachStatus = outreachStatusByOrg[company.orgNumber];
    return !outreachStatus?.sent && outreachStatus?.status !== "not_relevant";
  });
  const resultsSummary = buildResultsSummary(
    daysFilter,
    countyFilter,
    organizationFormFilter,
    metadata.organizationForms,
    selectedLegend,
  );
  const filterButtonDisabled = !initialResultsReady || isListLoading;
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
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

          <nav className="hidden items-center gap-7 text-[13px] font-semibold text-[#52606D] md:flex">
            <button className="transition-colors hover:text-[#1F2933]" onClick={() => scrollToSection("results")} type="button">
              Søkeresultater
            </button>
            <button
              className="transition-colors hover:text-[#1F2933]"
              onClick={() => {
                void fetchOutreachEntries();
                scrollToSection("outreach");
              }}
              type="button"
            >
              Utsendelser
            </button>
            <button className="transition-colors hover:text-[#1F2933]" onClick={() => scrollToSection("offer")} type="button">
              Startpakke
            </button>
            <button className="transition-colors hover:text-[#1F2933]" onClick={() => scrollToSection("footer")} type="button">
              Kontakt
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden items-center gap-2 text-[#52606D] sm:inline-flex">
              <Globe className="size-4" />
              NO
            </Button>
            <Button variant="default" size="sm" className="rounded-sm bg-[#1F5FA9] px-4 text-white hover:bg-[#2F6FB2]">
              <Menu className="size-4" />
              <span className="hidden sm:inline">Meny</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="pb-16">
        <div className={selectedCompany ? "pointer-events-none select-none blur-[3px] transition-all duration-200" : "transition-all duration-200"}>
          <section id="search" className="mx-auto max-w-7xl px-6 pt-6 sm:pt-8">
            <div className="grid gap-4">
              <div className="border border-[#D9E2EC] bg-white px-5 py-6 sm:px-7 sm:py-7">
                <div className="mt-3 max-w-3xl">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#1F2933] sm:text-3xl">
                    Finn nye virksomheter
                  </h1>
                </div>

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
                    setLeadQuickFilters([]);
                    scrollToSection("search");
                  }}
                  type="button"
                >
                    Nullstill filtre
                  </button>
                </div>

              </div>

              <div id="offer" className="border border-[#D9E2EC] bg-[#F8FBFF] p-6 text-[#1F2933] sm:p-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#52606D]">
                  Lead-kriterier
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-3">
                  <CommercialOfferPoint
                    label="Sterkt lead"
                    text="Mangler nettside og har e-post eller telefon registrert."
                  />
                  <CommercialOfferPoint
                    label="Mulig lead"
                    text="Mangler digital flate, men krever litt mer manuell research."
                  />
                  <CommercialOfferPoint
                    label="Svakt lead"
                    text="Har eksisterende flate, røde registerspor eller svak kontaktbarhet."
                  />
                </div>
                <div className="mt-7 border border-[#D9E2EC] bg-white p-4">
                  <p className="text-[13px] font-semibold text-[#1F2933]">Flyt</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#52606D]">
                    Filtrer, åpne hurtigsjekk og kontakt via registrert e-post eller telefon.
                  </p>
                </div>
              </div>

            </div>
          </section>

          <OutreachOverview
            entries={outreachEntries}
            error={outreachListError}
            importMessage={outreachImportMessage}
            isImporting={isOutreachImporting}
            isLoading={isOutreachListLoading}
            onImport={(file) => void importOutreachLog(file)}
            onOpenCompany={(orgNumber) => void openCompanyDetails(orgNumber)}
            onRefresh={() => void fetchOutreachEntries()}
          />

          {/* Dynamic Content */}
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
                    Viser {visibleSearchCompanies.length} treff på denne siden.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 border border-[#D9E2EC] bg-white px-2 py-1">
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
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isListLoading && recentCompanies.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-[18px] border border-[#E4E7EB] bg-white p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="size-3 rounded-full bg-[#E4E7EB]" />
                      <div className="h-4 w-16 rounded bg-[#E4E7EB]" />
                    </div>
                    <div className="mb-2 h-5 w-3/4 rounded bg-[#E4E7EB]" />
                    <div className="mb-4 h-4 w-1/2 rounded bg-[#E4E7EB]" />
                    <div className="space-y-2">
                      <div className="h-3 w-1/3 rounded bg-[#E4E7EB]" />
                      <div className="h-3 w-1/4 rounded bg-[#E4E7EB]" />
                    </div>
                  </div>
                ))
              ) : visibleSearchCompanies.length > 0 ? (
                visibleSearchCompanies.map((company, i) => (
                  <CompanyCard
                    key={`${company.orgNumber}-${i}`}
                    company={company}
                    onClick={() => void openCompanyDetails(company.orgNumber)}
                    outreachSaving={Boolean(savingOutreachByOrg[company.orgNumber])}
                    outreachStatus={outreachStatusByOrg[company.orgNumber] ?? null}
                    onToggleOutreach={(sent, note, statusOverride) => void updateOutreachStatus(company, sent, note, statusOverride)}
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
        </div>

        {selectedCompany ? (
          <div
            className="fixed inset-0 z-50 bg-[#102A4314] backdrop-blur-sm"
            onClick={resetToLanding}
          >
            <div className="flex min-h-full items-start justify-center px-4 py-8 sm:px-6 sm:py-12">
              <div
                className="max-h-[88vh] w-full max-w-7xl overflow-y-auto border border-[#BCCCDC] bg-white shadow-[0_24px_80px_-32px_rgba(16,42,67,0.35)]"
                onClick={(event) => event.stopPropagation()}
              >
                <CompanyDetailView
                  company={selectedCompany}
                  events={selectedCompanyEvents.length > 0 ? selectedCompanyEvents : selectedCompany.events}
                  generatedEmail={generatedEmailByOrg[selectedCompany.orgNumber] ?? null}
                  generatingEmail={Boolean(generatingEmailByOrg[selectedCompany.orgNumber])}
                  outreachSaving={Boolean(savingOutreachByOrg[selectedCompany.orgNumber])}
                  outreachStatus={outreachStatusByOrg[selectedCompany.orgNumber] ?? null}
                  onBack={resetToLanding}
                  onGenerateEmail={() => void generateOutreachEmail(selectedCompany)}
                  onToggleOutreach={(sent, note, statusOverride) => void updateOutreachStatus(selectedCompany, sent, note, statusOverride)}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[#D9E2EC] bg-[#F0F4F8] px-4 py-3">
      <p className="text-[11px] font-medium text-[#52606D]">{label}</p>
      <p className="mt-1.5 text-[16px] font-semibold tracking-tight text-[#1F2933]">{value}</p>
    </div>
  );
}

function CommercialOfferPoint({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l-4 border-[#C7DFF8] pl-4">
      <p className="text-[14px] font-semibold text-[#1F2933]">{label}</p>
      <p className="mt-1 text-[13px] leading-6 text-[#52606D]">{text}</p>
    </div>
  );
}

function CompanyCard({
  company,
  onClick,
  outreachStatus,
  outreachSaving,
  onToggleOutreach,
}: {
  company: CompanySummary;
  onClick: () => void;
  outreachStatus: OutreachStatus | null;
  outreachSaving: boolean;
  onToggleOutreach: (sent: boolean, note?: string, statusOverride?: "sent" | "reverted" | "not_relevant") => void;
}) {
  const scoreColors = {
    GREEN: "bg-emerald-500",
    YELLOW: "bg-amber-500",
    RED: "bg-rose-500",
  };
  const leadPriority = getLeadPriority(company);
  const contactability = getContactability(company);
  const bestContactPoint = getBestContactPoint(company);
  const structureSignals = company.structureSignals || [];
  const highlightedStructureSignals = prioritizedListStructureSignals(structureSignals);
  const structureSummary = describeListStructureSummary(highlightedStructureSignals);
  const commercialOpportunity = getCommercialOpportunity(company);
  const colorClass = scoreColors[company.scoreColor] || scoreColors.YELLOW;
  const cardToneClass = outreachStatus?.status === "not_relevant"
    ? "border-[#1F2933] bg-[#F5F5F5] grayscale hover:border-[#111827]"
    : outreachStatus?.sent
      ? "border-[#C7D7EA] bg-[#F4F8FC] hover:border-[#9FB3C8]"
      : "border-[#D9E2EC] bg-white hover:border-[#2F6FB2]";

  return (
    <div
      className={`group cursor-pointer border p-4 transition-colors ${cardToneClass}`}
      onClick={onClick}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`size-3 rounded-full ${colorClass} shadow-sm`} />
          <Badge className={leadPriority.badgeClass}>
            {leadPriority.label}
          </Badge>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {company.salesSegment ? (
            <Badge variant="outline" className="rounded-sm border-[#C7DFF8] bg-[#F8FBFF] px-2 py-0 text-[10px] font-semibold text-[#1F5FA9]">
              {company.salesSegment.label}
            </Badge>
          ) : null}
          <Badge variant="outline" className="rounded-sm border-[#D9E2EC] bg-[#F0F4F8] px-2 py-0 text-[10px] font-medium text-[#52606D]">
            {company.organizationForm}
          </Badge>
        </div>
      </div>
      <h3 className="mb-1 line-clamp-1 text-[15px] font-semibold text-[#1F2933] transition-colors group-hover:text-[#1F5FA9]">
        {company.name}
      </h3>
      <p className="mb-3 text-[12px] font-mono font-medium text-[#52606D]">{company.orgNumber}</p>

      <div className="mb-4 border border-[#E4E7EB] bg-[#F8FBFF] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#52606D]">Leadvurdering</p>
            <p className="mt-1 text-[13px] font-semibold text-[#1F2933]">{bestContactPoint.label}</p>
            <p className="mt-1 text-[12px] text-[#52606D]">{contactability.label}</p>
          </div>
          <Badge className={contactability.badgeClass}>{contactability.shortLabel}</Badge>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
          <MapPin className="size-3.5" />
          <span>{company.municipality || "Ukjent sted"}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
          <CalendarDays className="size-3.5" />
          <span>{company.registrationDate ? `Registrert: ${company.registrationDate}` : "Registrert: ukjent"}</span>
        </div>
        {company.naceCode || company.naceDescription ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Landmark className="size-3.5" />
            <span className="truncate">
              {[company.naceCode, company.naceDescription].filter(Boolean).join(" · ")}
            </span>
          </div>
        ) : null}
        {company.email ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Mail className="size-3.5" />
            <span className="truncate font-semibold text-[#52606D]">
              {company.email}
            </span>
          </div>
        ) : null}
        {company.website ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Globe className="size-3.5" />
            <span className="truncate text-[#52606D]">
              {company.website}
            </span>
          </div>
        ) : null}
        {!company.website && company.websiteDiscovery?.status === "POSSIBLE_MATCH" && company.websiteDiscovery.candidates.length > 0 ? (
          <div className="flex items-start gap-2 text-[12px] font-medium text-[#52606D]">
            <Globe className="mt-0.5 size-3.5" />
            <div>
              <p className="text-[#1F2933]">
                {company.websiteDiscovery.contentMatched ? "Sannsynlig nettside funnet" : company.websiteDiscovery.verifiedReachable ? "Mulig nettside må vurderes" : "Mulig nettside funnet"}
              </p>
              <p className="mt-1 text-[#1F5FA9]">
                {stripWebsiteProtocol(company.websiteDiscovery.verifiedCandidate ?? company.websiteDiscovery.candidates[0])}
              </p>
              <p className="mt-1 text-[11px] text-[#52606D]">
                {formatWebsiteVerification(company.websiteDiscovery)} · {formatWebsiteContentMatch(company.websiteDiscovery)} · sikkerhet: {formatWebsiteConfidence(company.websiteDiscovery.confidence).toLowerCase()} · må bekreftes manuelt
              </p>
            </div>
          </div>
        ) : null}
        {company.contactPersonName ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Building2 className="size-3.5" />
            <span className="truncate">
              {company.contactPersonName}
              {company.contactPersonRole ? ` · ${formatRoleType(company.contactPersonRole)}` : ""}
            </span>
          </div>
        ) : null}
        {company.phone ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Phone className="size-3.5" />
            <span className="truncate text-[#52606D]">
              {company.phone}
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="border-[#D9E2EC] bg-white text-[10px] font-semibold text-[#52606D]">
            {company.vatRegistered ? "MVA registrert" : "Ikke MVA registrert"}
          </Badge>
          <Badge variant="outline" className="border-[#D9E2EC] bg-white text-[10px] font-semibold text-[#52606D]">
            {company.registeredInBusinessRegistry ? "Foretaksregisteret" : "Ikke i Foretaksregisteret"}
          </Badge>
          {company.events.slice(0, 3).map((event) => (
            <Badge
              key={`${company.orgNumber}-${event.type}-${event.title}`}
              variant="outline"
              className={`border-transparent text-[10px] font-semibold ${eventSeverityClassName(event.severity)}`}
            >
              {formatEventType(event.type)}
            </Badge>
          ))}
        </div>
        {highlightedStructureSignals.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
            {highlightedStructureSignals.map((signal) => (
              <Badge
                key={`${company.orgNumber}-${signal.code}`}
                variant="outline"
                className={`border-transparent text-[10px] font-semibold ${listStructureSignalClassName(signal.severity)}`}
              >
                {signal.title}
              </Badge>
            ))}
            </div>
            {structureSummary ? (
              <p className="text-[12px] font-medium leading-relaxed text-[#52606D]">{structureSummary}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={`mt-4 border p-3 ${commercialOpportunity.cardClass}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52606D]">Kommersiell mulighet</p>
            <p className="mt-1 text-[13px] font-bold text-[#1F2933]">{commercialOpportunity.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#52606D]">{commercialOpportunity.summary}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-sm border border-[#1F5FA9] bg-[#1F5FA9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-white transition-colors hover:bg-[#2F6FB2]"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
          >
            {commercialOpportunity.actionLabel}
          </button>
        </div>
      </div>
      <OutreachCheckbox
        key={`${company.orgNumber}-${outreachStatus?.sentAt ?? "draft"}-${outreachStatus?.note ?? ""}`}
        compact
        saving={outreachSaving}
        status={outreachStatus}
        onToggle={onToggleOutreach}
      />
    </div>
  );
}

function OutreachCheckbox({
  status,
  saving,
  onToggle,
  className,
  compact = false,
}: {
  status: OutreachStatus | null;
  saving: boolean;
  onToggle: (sent: boolean, note?: string, statusOverride?: "sent" | "reverted" | "not_relevant") => void;
  className?: string;
  compact?: boolean;
}) {
  const sentPrice = status?.price ?? 4500;
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
      : "Marker når tilbudsmail er sendt, så unngår du dobbelt utsendelse.";
  const wrapperClassName = `${className ? `${className} ` : ""}${compact ? "mt-4 " : ""}border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3`;

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
    <div
      className={wrapperClassName}
      onClick={(event) => event.stopPropagation()}
    >
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
            E-post sendt om nettside til kr {formatNokPrice(sentPrice)}
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
          {!sentAlready && !markedNotRelevant && !compact ? (
            <span className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-sm border border-[#7B8794] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#52606D] transition-colors hover:bg-[#F0F4F8] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={() => onToggle(false, noteDraft, "not_relevant")}
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
  outreachStatus,
  outreachSaving,
  onBack,
  onGenerateEmail,
  onToggleOutreach,
}: {
  company: CompanyDetails;
  events: CompanyEvent[];
  generatedEmail: { subject: string; body: string } | null;
  generatingEmail: boolean;
  outreachStatus: OutreachStatus | null;
  outreachSaving: boolean;
  onBack: () => void;
  onGenerateEmail: () => void;
  onToggleOutreach: (sent: boolean, note?: string, statusOverride?: "sent" | "reverted" | "not_relevant") => void;
}) {
  const leadPriority = getLeadPriority(company);
  const config = detailLeadSignalConfig(leadPriority.label);
  const StatusIcon = config.icon;
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedHtmlEmail, setCopiedHtmlEmail] = useState(false);

  const scoreLabel = leadPriority.label;
  const scoreReasons = company.score?.reasons || [];
  const scoreEvidence = company.score?.evidence || [];
  const structureSignals = company.structureSignals || [];
  const elevatedActorContextSignal = structureSignals.find((signal) => signal.code === "ACTOR_CONTEXT_ELEVATED") ?? null;
  const commercialOpportunity = getCommercialOpportunity(company);
  const quickEvidence = scoreEvidence.slice(0, 3);
  const extendedEvidence = scoreEvidence.slice(3);
  const primaryReason = scoreEvidence[0]?.detail || scoreReasons[0] || "Ingen begrunnelse oppgitt.";
  const generatedEmailText = generatedEmail ? `Emne: ${generatedEmail.subject}\n\n${generatedEmail.body}` : "";
  const generatedEmailHtml = generatedEmail ? buildOutreachEmailHtml(generatedEmail.body) : "";
  const generatedEmailHref = generatedEmail && company.email
    ? `mailto:${company.email}?subject=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(generatedEmail.body)}`
    : null;

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
                      <a
                        key={candidate.url}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-2 text-[12px] font-semibold text-[#1F5FA9] hover:bg-white"
                        href={candidate.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span>{stripWebsiteProtocol(candidate.url)}</span>
                        <span className="text-[11px] font-medium text-[#52606D]">
                          {formatWebsiteCandidateStatus(candidate)}
                        </span>
                      </a>
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
                    </div>
                    <div className="border border-[#D9E2EC] bg-[#F8FBFF] p-3">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#52606D]">Mailtekst</p>
                      <textarea
                        className="min-h-[260px] w-full resize-y border border-[#D9E2EC] bg-white p-3 text-[13px] leading-6 text-[#1F2933] outline-none focus:border-[#2F6FB2]"
                        readOnly
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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}) {
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
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
  subvalue?: string | null;
  href?: string;
}) {
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

