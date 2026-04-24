"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import {
  Search,
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
  CompanyHistoryEntry,
  NetworkActor,
  CompanySummary,
  MetadataFiltersResponse,
  OutreachStatus,
  ScoreColor,
  StructureSignal,
} from "@/lib/company-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const dayOptions = ["5", "10", "30", "60", "180", "365", "0"];
const legend = [
  { status: "GREEN", label: "Ingen varselflagg", color: "bg-emerald-500" },
  { status: "YELLOW", label: "Begrenset info", color: "bg-amber-500" },
  { status: "RED", label: "Alvorlige signaler", color: "bg-rose-500" },
];

const legendDetails: Record<string, { title: string; text: string }> = {
  GREEN: {
    title: "Ingen varselflagg",
    text: "Åpne registerdata gir et ryddig førsteinntrykk. Det betyr ikke at alt er risikofritt, men vi ser ingen tydelige negative signaler i BRREG-dataene.",
  },
  YELLOW: {
    title: "Begrenset info",
    text: "Det finnes noen forhold som gjør bildet mindre tydelig, for eksempel kort historikk eller mangelfulle opplysninger. Dette er et signal om å sjekke litt nærmere.",
  },
  RED: {
    title: "Alvorlige signaler",
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
  FLI: {
    label: "Forening/lag/innretning",
    description: "Forening, lag eller ideell innretning.",
  },
};

export function CompanyCheckShell() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [backendReady, setBackendReady] = useState(false);
  const [initialResultsReady, setInitialResultsReady] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<CompanySummary[]>([]);
  const [metadata, setMetadata] = useState<MetadataFiltersResponse>({
    organizationForms: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listLoadProgress, setListLoadProgress] = useState(0);
  const [listLoadSeconds, setListLoadSeconds] = useState(0);
  const [daysFilter, setDaysFilter] = useState("5");
  const [countyFilter, setCountyFilter] = useState("");
  const [organizationFormFilter, setOrganizationFormFilter] = useState("AS");
  const [selectedLegend, setSelectedLegend] = useState<keyof typeof legendDetails | null>("GREEN");
  const [selectedCompanyEvents, setSelectedCompanyEvents] = useState<CompanyEvent[]>([]);
  const [selectedCompanyHistory, setSelectedCompanyHistory] = useState<CompanyHistoryEntry[]>([]);
  const [selectedCompanyNetwork, setSelectedCompanyNetwork] = useState<NetworkActor[]>([]);
  const [outreachStatusByOrg, setOutreachStatusByOrg] = useState<Record<string, OutreachStatus>>({});
  const [savingOutreachByOrg, setSavingOutreachByOrg] = useState<Record<string, boolean>>({});
  const [generatedEmailByOrg, setGeneratedEmailByOrg] = useState<Record<string, { subject: string; body: string }>>({});
  const [generatingEmailByOrg, setGeneratingEmailByOrg] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [, startTransition] = useTransition();
  const latestListRequestId = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hasDetailHistoryEntryRef = useRef(false);

  async function fetchOutreachStatuses(orgNumbers: string[]) {
    const uniqueOrgNumbers = Array.from(new Set(orgNumbers.filter(Boolean)));
    if (uniqueOrgNumbers.length === 0) {
      return;
    }

    try {
      const responses = await Promise.all(
        uniqueOrgNumbers.map(async (orgNumber) => {
          const response = await fetch(`/api/company-check/${orgNumber}/outreach-status`, {
            cache: "no-store",
          });
          if (!response.ok) {
            return null;
          }

          const payload = (await response.json()) as OutreachStatus;
          return [orgNumber, payload] as const;
        })
      );

      const nextEntries = responses.filter((entry): entry is readonly [string, OutreachStatus] => entry !== null);
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

  async function updateOutreachStatus(company: Pick<CompanySummary, "orgNumber" | "name">, sent: boolean) {
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
          sent,
          price: 4500,
          channel: "email",
          offerType: "website-offer",
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
    } catch (error) {
      console.error("Failed to update outreach status", error);
    } finally {
      setSavingOutreachByOrg((current) => ({
        ...current,
        [company.orgNumber]: false,
      }));
    }
  }

  async function generateOutreachEmail(company: Pick<CompanySummary, "orgNumber" | "name" | "contactPersonName" | "email" | "phone" | "municipality" | "county">) {
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
      await Promise.all([fetchFilters(), fetchRecent(0)]);
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
    query = activeQuery,
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
    if (query) params.set("q", query);
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
  }, [backendReady, initialResultsReady, daysFilter, countyFilter, organizationFormFilter, selectedLegend, selectedCompany, activeQuery]);

  useEffect(() => {
    if (!backendReady || !selectedCompany) {
      setSelectedCompanyEvents([]);
      setSelectedCompanyHistory([]);
      setSelectedCompanyNetwork([]);
      return;
    }

    let active = true;
    const orgNumber = selectedCompany.orgNumber;

    async function fetchSelectedCompanyData() {
      try {
        const [eventsResponse, historyResponse, networkResponse] = await Promise.all([
          fetch(`/api/company-check/${orgNumber}/events`, {
            cache: "no-store",
          }),
          fetch(`/api/company-check/${orgNumber}/history`, {
            cache: "no-store",
          }),
          fetch(`/api/company-check/${orgNumber}/network`, {
            cache: "no-store",
          }),
        ]);

        if (!active) {
          return;
        }

        const [eventsPayload, historyPayload, networkPayload] = await Promise.all([
          eventsResponse.ok ? eventsResponse.json() : Promise.resolve([]),
          historyResponse.ok ? historyResponse.json() : Promise.resolve([]),
          networkResponse.ok ? networkResponse.json() : Promise.resolve([]),
        ]);

        setSelectedCompanyEvents(Array.isArray(eventsPayload) ? (eventsPayload as CompanyEvent[]) : []);
        setSelectedCompanyHistory(Array.isArray(historyPayload) ? (historyPayload as CompanyHistoryEntry[]) : []);
        setSelectedCompanyNetwork(Array.isArray(networkPayload) ? (networkPayload as NetworkActor[]) : []);
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

  async function handleSearch(term: string) {
    if (!backendReady) {
      setError("Backend starter fortsatt. Prøv igjen om et øyeblikk.");
      return;
    }

    const trimmedTerm = term.trim();

    setError(null);

    if (!trimmedTerm) {
      setSelectedCompany(null);
      setActiveQuery("");
      await fetchRecent(0, "");
      return;
    }

    setIsLoading(true);

    try {
      const requestId = ++latestListRequestId.current;
      const isOrgNumber = /^\d{9}$/.test(trimmedTerm);
      const params = new URLSearchParams();
      params.set("dager", daysFilter);
      if (trimmedTerm) {
        params.set("q", trimmedTerm);
      }
      if (countyFilter) {
        params.set("county", countyFilter);
      }
      if (organizationFormFilter) {
        params.set("organizationForm", organizationFormFilter);
      }
      if (selectedLegend) {
        params.set("score", selectedLegend);
      }
      const endpoint = isOrgNumber 
        ? `/api/company-check/${trimmedTerm}`
        : `/api/company-check/search?${params.toString()}`;
      
      const response = await fetch(endpoint, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (requestId !== latestListRequestId.current) {
        return;
      }

      if (!response.ok) {
        setError(payload.detail ?? "Klarte ikke hente selskapsdata.");
        return;
      }

      startTransition(() => {
        if (isOrgNumber && payload.score) {
          if (!hasDetailHistoryEntryRef.current) {
            window.history.pushState({ view: "company-detail", orgNumber: trimmedTerm }, "", window.location.href);
            hasDetailHistoryEntryRef.current = true;
          }
          setSelectedCompany(payload as CompanyDetails);
        } else {
          // It's a search result list
          const items = Array.isArray(payload) ? payload : payload.items || [];
          setActiveQuery(trimmedTerm);
          setRecentCompanies(items);
          setSelectedCompany(null);
          if (items.length === 0) {
            setError("Ingen selskaper funnet.");
          }
        }
      });
    } catch {
      setError("Noe gikk galt ved kontakt med serveren.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

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
    setSelectedLegend("GREEN");
    setActiveQuery("");
    setSearchTerm("");
    setDaysFilter("5");
    setCountyFilter("");
    setOrganizationFormFilter("AS");
    searchInputRef.current?.focus({ preventScroll: true });
    void fetchRecent(0, "", {
      daysFilter: "5",
      countyFilter: "",
      organizationFormFilter: "AS",
      selectedLegend: "GREEN",
    });
  }

  function focusSearch() {
    searchInputRef.current?.focus({ preventScroll: true });
  }

  const filteredCompanies = (selectedLegend
    ? recentCompanies.filter((company) => company.scoreColor === selectedLegend)
    : recentCompanies
  ).sort(compareLeadPriority);
  const resultsSummary = buildResultsSummary(
    daysFilter,
    countyFilter,
    organizationFormFilter,
    metadata.organizationForms,
    selectedLegend,
  );
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
            <Button variant="ghost" size="sm" className="items-center gap-2 text-[#52606D]" onClick={focusSearch}>
              <Search className="size-4" />
              <span className="hidden sm:inline">Søk</span>
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
          {/* Search Area */}
          <section id="search" className="mx-auto max-w-7xl px-6 pt-6 sm:pt-8">
            <div className="grid gap-4">
              <div className="border border-[#D9E2EC] bg-white px-5 py-6 sm:px-7 sm:py-7">
                <p className="text-[12px] font-medium text-[#52606D]">Søk i virksomhetsopplysninger</p>
                <div className="mt-3 max-w-3xl">
                  <h1 className="text-2xl font-semibold tracking-tight text-[#1F2933] sm:text-3xl">
                    Finn nye virksomheter
                  </h1>
                  <p className="mt-3 text-[15px] leading-7 text-[#52606D]">
                    Bruk åpne registerdata til å finne nyregistrerte selskaper og vurdere om de mangler nettside, e-post eller tydelig kontaktpunkt.
                  </p>
                </div>

                <form className="mt-6" onSubmit={handleSubmit}>
                  <div className="group flex flex-col gap-3 border border-[#D9E2EC] bg-[#F8FBFF] p-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3 border border-[#D9E2EC] bg-white px-4 py-3 focus-within:border-[#2F6FB2]">
                      <Search className="size-5 text-[#7B8794] transition-colors group-focus-within:text-[#1F5FA9]" />
                      <input
                        ref={searchInputRef}
                        className="h-11 w-full bg-transparent text-[16px] font-medium outline-none placeholder:text-[#7B8794]"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Organisasjonsnummer eller navn"
                        type="text"
                        value={searchTerm}
                      />
                    </div>
                    <Button
                      className="h-11 rounded-sm bg-[#1F5FA9] px-5 text-[14px] font-semibold text-white hover:bg-[#2F6FB2]"
                      disabled={isLoading || !backendReady}
                      type="submit"
                    >
                      {!backendReady ? "Starter..." : isLoading ? "Søker..." : "Finn selskaper"}
                    </Button>
                  </div>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                  {["AS", "ENK", "NUF", "SA", "FLI"].map((code) => (
                    <div key={code} className="relative inline-flex items-center gap-1.5">
                      <button
                        className={`peer rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          organizationFormFilter === code
                            ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                            : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                        }`}
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
                  <span className="text-[#52606D]">Signalnivå:</span>
                  {legend.map((item) => (
                    <button
                      key={item.status}
                      className={`rounded-sm border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        selectedLegend === item.status
                          ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                          : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                      }`}
                      disabled={!initialResultsReady || isListLoading}
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
                  <span className="flex items-center gap-2 text-[#52606D]">
                    <CalendarDays className="size-4" />
                    Tidsrom:
                  </span>
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
                        }`}
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
                    setOrganizationFormFilter("AS");
                    setSelectedLegend("GREEN");
                    setActiveQuery("");
                    setSearchTerm("");
                    scrollToSection("search");
                  }}
                  type="button"
                >
                    Nullstill filtre
                  </button>
                </div>

                <p className="mt-4 text-[12px] leading-6 text-[#52606D]">
                  Data fra BRREG. Brukes som første signal, ikke som endelig vurdering.
                </p>
              </div>

              <div id="offer" className="overflow-hidden border border-[#D9E2EC] bg-[#F8FBFF] text-[#1F2933]">
                <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="p-6 sm:p-8">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1F5FA9]">
                      Nettside-startpakke
                    </p>
                    <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
                      Nettside, domene og e-post fra start.
                    </h2>
                    <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#52606D]">
                      Et enkelt tilbud for nyregistrerte selskaper uten tydelig digital flate.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                      {["Nettside", "Domene", "E-post", "Kontaktpunkt"].map((item) => (
                        <span key={item} className="rounded-full border border-[#C7DFF8] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1F5FA9]">
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      <OfferPackage
                        title="Start"
                        text="Nettside og kontaktpunkt."
                      />
                      <OfferPackage
                        title="Synlighet"
                        text="Startpakke med e-post."
                      />
                      <OfferPackage
                        title="Klar for salg"
                        text="Landingsside og kampanjespor."
                      />
                    </div>
                  </div>
                  <div className="border-t border-[#D9E2EC] bg-white p-6 sm:p-8 lg:border-l lg:border-t-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#52606D]">
                      Lead-kriterier
                    </p>
                    <div className="mt-5 space-y-5">
                      <CommercialOfferPoint
                        label="Sterkt signal"
                        text="Mangler nettside og har e-post eller telefon registrert."
                      />
                      <CommercialOfferPoint
                        label="Mulig signal"
                        text="Mangler digital flate, men krever litt mer manuell research."
                      />
                      <CommercialOfferPoint
                        label="Svakt signal"
                        text="Har eksisterende flate, røde registerspor eller svak kontaktbarhet."
                      />
                    </div>
                    <div className="mt-7 border border-[#D9E2EC] bg-[#F8FBFF] p-4">
                      <p className="text-[13px] font-semibold text-[#1F2933]">Flyt</p>
                      <p className="mt-2 text-[13px] leading-6 text-[#52606D]">
                        Filtrer, åpne hurtigsjekk og kontakt via registrert e-post eller telefon.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

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
                    Viser {filteredCompanies.length} treff på denne siden.
                  </p>
                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#1F5FA9]">
                    Treffene er sortert etter mulighetssignal, kontaktbarhet og hvor ferskt selskapet er.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 border border-[#D9E2EC] bg-white px-2 py-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0 || isLoading || isListLoading}
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
                      disabled={page + 1 >= totalPages || isLoading || isListLoading}
                      onClick={() => void fetchRecent(page + 1)}
                    >
                      Neste
                    </Button>
                  </div>
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
              ) : filteredCompanies.length > 0 ? (
                filteredCompanies.map((company, i) => (
                  <CompanyCard
                    key={`${company.orgNumber}-${i}`}
                    company={company}
                    onClick={() => handleSearch(company.orgNumber)}
                    outreachSaving={Boolean(savingOutreachByOrg[company.orgNumber])}
                    outreachStatus={outreachStatusByOrg[company.orgNumber] ?? null}
                    onToggleOutreach={(sent) => void updateOutreachStatus(company, sent)}
                  />
                ))
              ) : (
                  <div className="col-span-full rounded-[18px] border border-dashed border-[#D9E2EC] bg-[#F0F4F8] px-6 py-14 text-center">
                    <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-[#E4E7EB] bg-white">
                      <Search className="size-8 text-[#7B8794]" />
                    </div>
                    <p className="mb-2 text-[12px] font-medium text-[#52606D]">
                      Ingen selskaper funnet
                    </p>
                    <p className="mx-auto max-w-sm text-[16px] font-medium leading-relaxed text-[#52606D]">
                      Vi fant ingen virksomheter som samsvarer med valgte filtre eller søkeord.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                      <Button
                        variant="outline"
                        className="rounded-full bg-white font-bold"
                        onClick={() => {
                          setDaysFilter("5");
                          setSearchTerm("");
                          setActiveQuery("");
                          setCountyFilter("");
                          setOrganizationFormFilter("AS");
                          setSelectedLegend("GREEN");
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
            <div className="flex min-h-full items-start justify-center px-4 py-4 sm:px-6 sm:py-8">
              <div
                className="max-h-[94vh] w-full max-w-7xl overflow-y-auto border border-[#BCCCDC] bg-white shadow-[0_24px_80px_-32px_rgba(16,42,67,0.35)]"
                onClick={(event) => event.stopPropagation()}
              >
                <CompanyDetailView
                  company={selectedCompany}
                  events={selectedCompanyEvents.length > 0 ? selectedCompanyEvents : selectedCompany.events}
                  generatedEmail={generatedEmailByOrg[selectedCompany.orgNumber] ?? null}
                  generatingEmail={Boolean(generatingEmailByOrg[selectedCompany.orgNumber])}
                  history={selectedCompanyHistory}
                  network={selectedCompanyNetwork}
                  outreachSaving={Boolean(savingOutreachByOrg[selectedCompany.orgNumber])}
                  outreachStatus={outreachStatusByOrg[selectedCompany.orgNumber] ?? null}
                  onBack={resetToLanding}
                  onGenerateEmail={() => void generateOutreachEmail(selectedCompany)}
                  onToggleOutreach={(sent) => void updateOutreachStatus(selectedCompany, sent)}
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer
        id="footer"
        className={selectedCompany ? "border-t border-[#D9E2EC] bg-white text-[#1F2933] blur-[3px] transition-all duration-200" : "border-t border-[#D9E2EC] bg-white text-[#1F2933] transition-all duration-200"}
      >
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="max-w-md">
                <p className="text-[12px] font-medium text-[#52606D]">NyFirmasjekk</p>
                <p className="mt-4 text-2xl font-semibold tracking-tight">
                  Virksomhetssøk og registerinformasjon
                </p>
                <p className="mt-4 text-[14px] leading-7 text-[#52606D]">
                  Analyse av åpne registerdata fra Enhetsregisteret og Foretaksregisteret. Registersporene er veiledende og erstatter ikke manuell kontroll.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <FooterColumn
                  title="Tjenester"
                  links={["Søk", "Søkeresultater", "Startpakke", "Organisasjonsformer"]}
                  onNavigate={scrollToSection}
                />
                <FooterColumn
                  title="Data"
                  links={["BRREG", "Historikk", "Nettverk", "API"]}
                  onNavigate={scrollToSection}
                />
                <FooterColumn
                  title="Praktisk"
                  links={["Kontakt", "Tilgjengelighet", "Personvern", "Kilder"]}
                  onNavigate={scrollToSection}
                />
                <FooterColumn
                  title="Om"
                  links={["Om vurderingen", "Datakilder", "Forklaringer", "Min side"]}
                  onNavigate={scrollToSection}
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-[#D9E2EC] pt-6 text-[12px] text-[#52606D] sm:flex-row sm:items-center sm:justify-between">
              <span>Org.nr. 999 999 999</span>
              <span>Universell utforming, tydelig forklaring og en nøktern offentlig portalstil.</span>
            </div>
          </div>
      </footer>
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

function OfferPackage({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-[#D9E2EC] bg-white p-4">
      <p className="text-[13px] font-semibold text-[#1F2933]">{title}</p>
      <p className="mt-2 text-[12px] leading-5 text-[#52606D]">{text}</p>
    </div>
  );
}

function FooterColumn({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: string[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-[#52606D]">{title}</p>
      <ul className="mt-4 space-y-3 text-[14px] text-[#52606D]">
        {links.map((link) => (
          <li key={link}>
            <button
              className="text-left transition-colors hover:text-[#1F2933] hover:underline"
              onClick={() => onNavigate(resolveFooterTarget(link))}
              type="button"
            >
              {link}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function resolveFooterTarget(link: string) {
  switch (link) {
    case "Søk":
    case "Organisasjonsformer":
    case "BRREG":
    case "Min side":
      return "search";
    case "Startpakke":
      return "offer";
    case "Søkeresultater":
    case "Metode":
    case "Historikk":
    case "Nettverk":
    case "API":
    case "Kilder":
    case "Om vurderingen":
    case "Datakilder":
    case "Forklaringer":
      return "results";
    case "Kontakt":
    case "Tilgjengelighet":
    case "Personvern":
      return "footer";
    default:
      return "main-content";
  }
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
  onToggleOutreach: (sent: boolean) => void;
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

  return (
    <div
      className="group cursor-pointer border border-[#D9E2EC] bg-white p-4 transition-colors hover:border-[#2F6FB2]"
      onClick={onClick}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`size-3 rounded-full ${colorClass} shadow-sm`} />
          <Badge className={leadPriority.badgeClass}>
            {leadPriority.label}
          </Badge>
        </div>
        <Badge variant="outline" className="rounded-sm border-[#D9E2EC] bg-[#F0F4F8] px-2 py-0 text-[10px] font-medium text-[#52606D]">
          {company.organizationForm}
        </Badge>
      </div>
      <h3 className="mb-1 line-clamp-1 text-[15px] font-semibold text-[#1F2933] transition-colors group-hover:text-[#1F5FA9]">
        {company.name}
      </h3>
      <p className="mb-3 text-[12px] font-mono font-medium text-[#52606D]">{company.orgNumber}</p>

      <div className="mb-4 border border-[#E4E7EB] bg-[#F8FBFF] p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#52606D]">Mulighetssignal</p>
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
        {company.email ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Mail className="size-3.5" />
            <a
              className="truncate font-semibold text-[#1F5FA9] underline underline-offset-4 hover:text-[#2F6FB2]"
              href={`mailto:${company.email}`}
              onClick={(event) => event.stopPropagation()}
            >
              {company.email}
            </a>
          </div>
        ) : null}
        {company.website ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Globe className="size-3.5" />
            <a
              className="truncate text-[#1F5FA9] underline underline-offset-4 hover:text-[#2F6FB2]"
              href={normalizeWebsiteUrl(company.website)}
              onClick={(event) => event.stopPropagation()}
              rel="noreferrer"
              target="_blank"
            >
              {company.website}
            </a>
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
            <a
              className="truncate text-[#1F5FA9] underline underline-offset-4 hover:text-[#2F6FB2]"
              href={`tel:${company.phone.replace(/\s+/g, "")}`}
              onClick={(event) => event.stopPropagation()}
            >
              {company.phone}
            </a>
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
  onToggle: (sent: boolean) => void;
  className?: string;
  compact?: boolean;
}) {
  const sentPrice = status?.price ?? 4500;
  const sentAlready = status?.sent ?? false;
  const helpText = saving
    ? "Oppdaterer utsendelsesstatus ..."
    : sentAlready
      ? "Registrert som sendt. Ny utsendelse krever eksplisitt overstyring."
      : "Marker når tilbudsmail er sendt, så unngår du dobbelt utsendelse.";
  const wrapperClassName = `${className ? `${className} ` : ""}${compact ? "mt-4 " : ""}border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3`;

  return (
    <div
      className={wrapperClassName}
      onClick={(event) => event.stopPropagation()}
    >
      <label className="flex items-start gap-3">
        <input
          checked={sentAlready}
          className="mt-0.5 size-4 rounded-none border border-[#9FB3C8] accent-[#1F5FA9]"
          disabled={saving || sentAlready}
          onChange={(event) => onToggle(event.target.checked)}
          type="checkbox"
        />
        <span className="min-w-0">
          <span className="block text-[12px] font-semibold text-[#1F2933]">
            E-post sendt om nettside til kr {formatNokPrice(sentPrice)}
          </span>
          <span className="mt-1 block text-[12px] text-[#52606D]">{helpText}</span>
          {status?.sent && status.sentAt ? (
            <span className="mt-1 block text-[11px] font-medium text-[#52606D]">
              Sendt {formatDateTime(status.sentAt)}
            </span>
          ) : null}
          {sentAlready ? (
            <span className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-sm border border-[#D9E2EC] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#52606D] transition-colors hover:bg-[#F0F4F8] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={() => onToggle(false)}
              >
                Angre
              </button>
              <button
                type="button"
                className="rounded-sm border border-[#1F5FA9] bg-[#1F5FA9] px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#2F6FB2] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={() => onToggle(true)}
              >
                Send på nytt likevel
              </button>
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

function normalizeWebsiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getContactability(company: CompanySummary) {
  const points = [company.email, company.phone, company.website, company.contactPersonName].filter(Boolean).length;

  if (company.email) {
    return {
      label: "E-post registrert",
      shortLabel: "Kontaktbar",
      badgeClass: "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700",
    };
  }

  if (company.phone) {
    return {
      label: "Telefon registrert, men mangler e-post",
      shortLabel: "Delvis",
      badgeClass: "rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700",
    };
  }

  if (points >= 2) {
    return {
      label: "Kontakt mulig, men krever litt manuelt arbeid",
      shortLabel: "Delvis",
      badgeClass: "rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700",
    };
  }

  return {
    label: "Svak kontaktflate i åpne data",
    shortLabel: "Svak",
    badgeClass: "rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold text-rose-700",
  };
}

function getLeadPriority(company: CompanySummary) {
  const hasEmail = Boolean(company.email);
  const hasPhone = Boolean(company.phone);
  const hasPossibleWebsite = company.websiteDiscovery?.status === "POSSIBLE_MATCH";
  const hasLikelyWebsite = company.websiteDiscovery?.contentMatched === true;
  const missingWebsite = !company.website && !hasPossibleWebsite;

  if (missingWebsite && hasEmail && company.scoreColor !== "RED") {
    return {
      label: "Sterkt signal",
        badgeClass: "rounded-sm bg-[#E6F0FA] px-2.5 py-1 text-[10px] font-semibold text-[#1F5FA9]",
    };
  }

  if (hasLikelyWebsite && company.scoreColor !== "RED") {
    return {
      label: "Svakt signal",
      badgeClass: "rounded-sm bg-[#F0F4F8] px-2.5 py-1 text-[10px] font-semibold text-[#52606D]",
    };
  }

  if ((missingWebsite || hasEmail || hasPhone) && company.scoreColor !== "RED") {
    return {
      label: "Mulig signal",
      badgeClass: "rounded-sm bg-[#F0F4F8] px-2.5 py-1 text-[10px] font-semibold text-[#52606D]",
    };
  }

  return {
    label: "Svakt signal",
    badgeClass: "rounded-sm bg-[#F0F4F8] px-2.5 py-1 text-[10px] font-semibold text-[#52606D]",
  };
}

function detailLeadSignalConfig(label: string) {
  switch (label) {
    case "Sterkt signal":
      return {
        icon: CheckCircle2,
        text: "bg-[#E6F0FA] text-[#1F5FA9] border-[#C7DFF8]",
      };
    case "Mulig signal":
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

function getBestContactPoint(company: CompanySummary) {
  if (company.email) {
    return { label: `Start med e-post: ${company.email}` };
  }
  if (company.phone) {
    return { label: `Start med telefon: ${company.phone}` };
  }
  if (company.website) {
    return { label: "Gå via registrert nettside" };
  }
  if (company.websiteDiscovery?.contentMatched === true) {
    return { label: "Sannsynlig nettside funnet, sjekk før kontakt" };
  }
  if (company.websiteDiscovery?.verifiedReachable === true && company.websiteDiscovery?.contentMatched === false) {
    return { label: "Domene svarer, men kan være feiltreff" };
  }
  if (company.websiteDiscovery?.status === "POSSIBLE_MATCH") {
    return { label: "Mulig nettside funnet, må bekreftes manuelt" };
  }
  if (company.contactPersonName) {
    return { label: `Manuell kontakt mot ${company.contactPersonName}` };
  }
  return { label: "Krever manuell research" };
}

function getCommercialOpportunity(company: CompanySummary) {
  const hasEmail = Boolean(company.email);
  const hasPhone = Boolean(company.phone);
  const hasPossibleWebsite = company.websiteDiscovery?.status === "POSSIBLE_MATCH";
  const hasLikelyWebsite = company.websiteDiscovery?.contentMatched === true;
  const hasMismatchWebsite = company.websiteDiscovery?.verifiedReachable === true && company.websiteDiscovery?.contentMatched === false;
  const missingWebsite = !company.website && !hasPossibleWebsite;

  if (company.scoreColor === "RED") {
    return {
      title: "Avklar risiko før salgsarbeid",
      summary: "Røde registerspor gjør dette mindre egnet som ordinært lead før dyp analyse er vurdert.",
      actionLabel: "Åpne analyse",
      cardClass: "border-rose-100 bg-rose-50/60",
    };
  }

  if (missingWebsite && hasEmail) {
    return {
      title: "Nettside-startpakke aktuell",
      summary: "Mangler registrert nettside og har e-post registrert i åpne data.",
      actionLabel: "Åpne lead",
      cardClass: "border-[#C7DFF8] bg-[#F1F7FE]",
    };
  }

  if (missingWebsite && hasPhone) {
    return {
      title: "Mulig lead, men svakere kontaktgrunnlag",
      summary: "Mangler registrert nettside, men har bare telefon. Fravær av e-post gjør dette mindre egnet for rask utsendelse.",
      actionLabel: "Se detaljer",
      cardClass: "border-amber-100 bg-amber-50/70",
    };
  }

  if (hasLikelyWebsite) {
    return {
      title: "Sannsynlig nettside funnet",
      summary: "Kandidatdomenet svarer, og innholdet ligner på selskapet. Dette bør normalt ikke prioriteres som nettsideløst lead.",
      actionLabel: "Se detaljer",
      cardClass: "border-[#D9E2EC] bg-[#F8FAFC]",
    };
  }

  if (hasMismatchWebsite) {
    return {
      title: "Mulig feiltreff på nettside",
      summary: "Domenet svarer, men innholdet ser ikke ut til å matche selskapet. Krever manuell kontroll før det brukes i vurderingen.",
      actionLabel: "Se detaljer",
      cardClass: "border-amber-100 bg-amber-50/70",
    };
  }

  if (hasPossibleWebsite) {
    return {
      title: "Mulig nettside må bekreftes",
      summary: "Ingen nettside er registrert i BRREG, men vi har funnet en mulig kandidat. Bekreft før dette behandles som sterkt lead.",
      actionLabel: "Se detaljer",
      cardClass: "border-amber-100 bg-amber-50/70",
    };
  }

  if (missingWebsite) {
    return {
      title: "Digital tilstedeværelse mangler",
      summary: "Ingen nettside registrert, men uten e-post blir dette mer manuelt å følge opp.",
      actionLabel: "Vurder lead",
      cardClass: "border-amber-100 bg-amber-50/70",
    };
  }

  if (hasEmail || hasPhone) {
    return {
      title: "Kontaktbar virksomhet",
      summary: hasEmail
        ? "Har synlig kontaktpunkt. Vurder kvaliteten på eksisterende digital flate."
        : "Har telefon, men mangler e-post. Det gjør oppfølgingen mindre effektiv.",
      actionLabel: "Se kontakt",
      cardClass: "border-emerald-100 bg-emerald-50/60",
    };
  }

  return {
    title: "Lavere lead-klarhet",
    summary: "Har registrert nettside, men svak direkte kontaktflate i åpne data.",
    actionLabel: "Se detaljer",
    cardClass: "border-[#E4E7EB] bg-[#F8FAFC]",
  };
}

function compareLeadPriority(left: CompanySummary, right: CompanySummary) {
  const yellowEmailDifference = yellowEmailRank(left) - yellowEmailRank(right);
  if (yellowEmailDifference !== 0) {
    return yellowEmailDifference;
  }

  const emailDifference = emailRank(left) - emailRank(right);
  if (emailDifference !== 0) {
    return emailDifference;
  }

  const priorityDifference = leadPriorityRank(left) - leadPriorityRank(right);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const structureDifference = structureSignalRank(left) - structureSignalRank(right);
  if (structureDifference !== 0) {
    return structureDifference;
  }

  const contactabilityDifference = contactabilityRank(left) - contactabilityRank(right);
  if (contactabilityDifference !== 0) {
    return contactabilityDifference;
  }

  const registrationDateLeft = left.registrationDate ? new Date(left.registrationDate).getTime() : 0;
  const registrationDateRight = right.registrationDate ? new Date(right.registrationDate).getTime() : 0;
  if (registrationDateLeft !== registrationDateRight) {
    return registrationDateRight - registrationDateLeft;
  }

  return left.name.localeCompare(right.name, "nb");
}

function leadPriorityRank(company: CompanySummary) {
  const label = getLeadPriority(company).label;
  if (label === "Sterkt signal") return 0;
  if (label === "Mulig signal") return 1;
  return 2;
}

function yellowEmailRank(company: CompanySummary) {
  return company.scoreColor === "YELLOW" && Boolean(company.email) ? 0 : 1;
}

function emailRank(company: CompanySummary) {
  return company.email ? 0 : 1;
}

function structureSignalRank(company: CompanySummary) {
  const severities = prioritizedListStructureSignals(company.structureSignals || []).map((signal) => signal.severity);
  if (severities.includes("HIGH")) return 0;
  if (severities.includes("MEDIUM")) return 1;
  if (severities.includes("INFO")) return 2;
  return 3;
}

function prioritizedListStructureSignals(signals: StructureSignal[]) {
  return [...signals]
    .sort((left, right) => listStructureSignalPriority(left.code) - listStructureSignalPriority(right.code))
    .slice(0, 3);
}

function listStructureSignalPriority(code: string) {
  switch (code) {
    case "POSSIBLE_REORGANIZATION":
      return 0;
    case "ACTOR_CONTEXT_ELEVATED":
      return 1;
    case "RECENT_BANKRUPTCY_RELATION":
      return 2;
    case "RECENT_DISSOLUTION_RELATION":
      return 3;
    case "BANKRUPTCY_RELATION":
      return 4;
    case "DISSOLUTION_RELATION":
      return 5;
    case "CLUSTERED_NEW_COMPANY_PATTERN":
      return 6;
    case "BO_SIGNAL":
      return 7;
    case "BANKRUPTCY_SIGNAL":
      return 8;
    case "DISSOLUTION_SIGNAL":
      return 9;
    case "ACTOR_RISK_PATTERN":
      return 10;
    case "SHARED_ACTOR_PATTERN":
      return 11;
    case "NEW_COMPANY_WINDOW":
      return 12;
    case "LIMITED_DATA_PATTERN":
      return 13;
    default:
      return 20;
  }
}

function describeListStructureSummary(signals: StructureSignal[]) {
  if (signals.some((signal) => signal.code === "POSSIBLE_REORGANIZATION")) {
    return "Tidsnære og delte aktørspor peker mot mulig ny struktur rundt eksisterende aktivitet.";
  }
  if (signals.some((signal) => signal.code === "ACTOR_CONTEXT_ELEVATED")) {
    return "Aktørkonteksten er sterk nok til å løftes som eget signal i vurderingen.";
  }
  if (signals.some((signal) => signal.code === "RECENT_BANKRUPTCY_RELATION")) {
    return "Deler aktører med nylige konkursspor i andre selskaper.";
  }
  if (signals.some((signal) => signal.code === "RECENT_DISSOLUTION_RELATION")) {
    return "Deler aktører med nylige avviklingsspor i andre selskaper.";
  }
  if (signals.some((signal) => signal.code === "CLUSTERED_NEW_COMPANY_PATTERN")) {
    return "Ligger tett i tid med andre nye selskaper med samme aktører.";
  }
  return null;
}

function contactabilityRank(company: CompanySummary) {
  const label = getContactability(company).shortLabel;
  if (label === "Kontaktbar") return 0;
  if (label === "Delvis") return 1;
  return 2;
}

function CompanyDetailView({
  company,
  events,
  generatedEmail,
  generatingEmail,
  history,
  network,
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
  history: CompanyHistoryEntry[];
  network: NetworkActor[];
  outreachStatus: OutreachStatus | null;
  outreachSaving: boolean;
  onBack: () => void;
  onGenerateEmail: () => void;
  onToggleOutreach: (sent: boolean) => void;
}) {
  const leadPriority = getLeadPriority(company);
  const config = detailLeadSignalConfig(leadPriority.label);
  const StatusIcon = config.icon;
  const [copiedEmail, setCopiedEmail] = useState(false);

  const scoreLabel = leadPriority.label;
  const scoreReasons = company.score?.reasons || [];
  const scoreEvidence = company.score?.evidence || [];
  const structureSignals = company.structureSignals || [];
  const elevatedActorContextSignal = structureSignals.find((signal) => signal.code === "ACTOR_CONTEXT_ELEVATED") ?? null;
  const commercialOpportunity = getCommercialOpportunity(company);
  const quickEvidence = scoreEvidence.slice(0, 3);
  const extendedEvidence = scoreEvidence.slice(3);
  const primaryReason = scoreEvidence[0]?.detail || scoreReasons[0] || "Ingen begrunnelse oppgitt.";
  const historyPatterns = analyzeHistoryPatterns(history);
  const historyInsight = buildHistoryInsight(history);
  const generatedEmailText = generatedEmail ? `Emne: ${generatedEmail.subject}\n\n${generatedEmail.body}` : "";
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

  return (
    <div className="detail-shell mx-auto max-w-6xl">
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
                  Registerspor og mulighetssignal
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
                Et raskt mulighetssignal basert på offentlige registerspor, roller og grunnleggende virksomhetsdata.
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
                    Dette er det raske beslutningsbildet: mulighetssignal, viktigste registerspor og om selskapet ser kontaktbart ut.
                  </p>
                </div>
                <div className="grid min-w-[220px] gap-2 sm:grid-cols-3 md:grid-cols-1">
                  <InfoMetric label="Mulighetssignal" value={scoreLabel} />
                  <InfoMetric label="Hendelser" value={`${events.length}`} />
                  <InfoMetric label="Rollepunkter" value={`${company.roles?.length ?? 0}`} />
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DetailDataPoint icon={CalendarDays} label="Etablert" value={company.registrationDate || "Ukjent"} />
                <DetailDataPoint icon={CalendarDays} label="Stiftet" value={company.foundationDate || "Ikke oppgitt"} />
                <DetailDataPoint icon={Landmark} label="Bransje" value={company.naceDescription || "Ikke oppgitt"} />
                <DetailDataPoint icon={Globe} label="Nettside" value={company.website || "Ingen registrert"} isLink />
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
                  <p className="mb-2 text-[12px] font-medium text-[#52606D]">
                    {company.websiteDiscovery.contentMatched ? "Sannsynlig nettside" : "Mulig nettside"}
                  </p>
                  <p className="text-[15px] font-semibold leading-relaxed text-[#1F2933]">
                    {company.websiteDiscovery.contentMatched
                      ? "Ingen registrert nettside i BRREG, men kandidaten ser ut til å høre til selskapet."
                      : "Ingen registrert nettside i BRREG, men vi fant en mulig kandidat."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {company.websiteDiscovery.candidates.map((candidate) => (
                      <a
                        key={candidate}
                        className="inline-flex rounded-sm border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-1.5 text-[12px] font-semibold text-[#1F5FA9] hover:bg-white"
                        href={candidate}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {stripWebsiteProtocol(candidate)}
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
                        className="rounded-sm bg-[#1F5FA9] px-4 text-white hover:bg-[#2F6FB2]"
                        onClick={() => void handleCopyGeneratedEmail()}
                        type="button"
                      >
                        {copiedEmail ? "Kopiert" : "Kopier mailtekst"}
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
                  <h3 className="text-[18px] font-semibold text-[#1F2933]">Roller, historikk og nettverk</h3>
                  <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[#52606D]">
                    Her går vi dypere i rollebildet, historikken, hendelsene og nettverket rundt selskapet.
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
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Utvikling over tid</h4>
              {historyPatterns ? (
                <div className="space-y-3">
                  <p className="text-[14px] font-medium leading-relaxed text-[#52606D]">{historyPatterns.scoreTrend}</p>
                  <div className="flex flex-wrap gap-2">
                    {historyPatterns.changeSignals.map((signal) => (
                      <Badge
                        key={signal}
                        variant="outline"
                        className="border-[#D9E2EC] bg-[#FFFFFF] text-[11px] font-bold text-[#52606D]"
                      >
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[14px] text-[#52606D]">
                  Det finnes foreløpig for lite historikk til å vise tydelige endringsmønstre.
                </p>
              )}
            </div>

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
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Nettverk</h4>
              <div className="space-y-3">
                {network.length > 0 ? (
                  network.slice(0, 5).map((actor) => (
                    <div key={actor.actorKey} className="border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[13px] font-bold text-[#1F2933]">{actor.actorName}</p>
                          <p className="mt-1 text-[11px] font-medium text-[#52606D]">
                            {actor.roleTypesInSelectedCompany.map(formatRoleType).join(" · ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-[11px] font-semibold ${networkRiskTextClass(actor.riskLevel)}`}>
                            {formatRiskLabel(actor.riskLevel)}
                          </p>
                          <p className="mt-1 whitespace-nowrap text-[12px] font-medium text-[#52606D]">
                            {actor.totalCompanyCount} selskaper
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-[12px] font-medium text-[#52606D]">
                        Knyttet til {actor.totalCompanyCount} selskaper, hvorav {actor.redCompanyCount} røde og {actor.dissolvedCompanyCount} avviklede.
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-[#52606D]">
                        {actor.yellowCompanyCount} gule · {actor.greenCompanyCount} grønne
                      </p>
                      {formatActorSeenSummary(actor) ? (
                        <p className="mt-1 text-[12px] font-medium text-[#52606D]">
                          {formatActorSeenSummary(actor)}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[12px] leading-relaxed text-[#52606D]">{describeActorContext(actor)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {actor.relatedCompanies.slice(0, 4).map((link) => (
                          <div
                            key={`${actor.actorKey}-${link.orgNumber}`}
                            className="flex items-center gap-2 rounded-sm border border-[#D9E2EC] bg-white px-3 py-1.5"
                          >
                            <span className={`size-2 rounded-full ${scoreDotClass(link.scoreColor)}`} />
                            <span className={`text-[11px] font-bold ${networkRiskTextClass(link.scoreColor)}`}>
                              {link.companyName}
                            </span>
                            <span className="rounded-sm bg-[#F0F4F8] px-2 py-0.5 text-[10px] font-semibold text-[#52606D]">
                              {compactRiskLabel(link.scoreColor)}
                            </span>
                            {link.bankruptcySignal ? (
                              <span className="rounded-sm bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                Konkurs
                              </span>
                            ) : null}
                            {link.dissolvedSignal ? (
                              <span className="rounded-sm bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Avviklet
                              </span>
                            ) : null}
                            {link.registrationDate ? (
                              <span className="rounded-sm bg-[#F0F4F8] px-2 py-0.5 text-[10px] font-semibold text-[#52606D]">
                                Reg. {formatShortDate(link.registrationDate)}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen nettverksdata bygget opp ennå. Her kommer det først mer innsikt når rolledata er hentet og snapshottene har fått bygge historikk rundt aktørene.</p>
                )}
              </div>
            </div>

            <div className="insight-card border border-[#D9E2EC] bg-white p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Historikk</h4>
              <div className="space-y-3">
                {historyInsight.kind === "changes" ? (
                  historyInsight.groups.map((group, index) => (
                    <div key={`${group.latest.capturedAt}-${index}`} className="border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[13px] font-bold text-[#1F2933]">{group.latest.summary}</p>
                          <p className="mt-1 text-[12px] font-medium text-[#52606D]">
                            {group.latest.organizationForm ?? "Ukjent org.form"}{group.latest.naceCode ? ` · ${group.latest.naceCode}` : ""}
                          </p>
                          {group.count > 1 ? (
                            <p className="mt-2 text-[12px] font-medium text-[#1F5FA9]">
                              Samme vurdering observert {group.count} ganger fra {formatDateTime(group.oldest.capturedAt)} til {formatDateTime(group.latest.capturedAt)}.
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-bold text-[#52606D]">{formatDateTime(group.latest.capturedAt)}</p>
                          <p className="mt-1 text-[11px] font-medium text-[#52606D]">
                            {formatLegendLabel(group.latest.scoreColor)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : historyInsight.kind === "stable" ? (
                  <div className="border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-4">
                    <p className="text-[13px] font-bold text-[#1F2933]">Uendret over tid</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#52606D]">
                      Samme vurdering er observert {historyInsight.group.count} ganger fra{" "}
                      {formatDateTime(historyInsight.group.oldest.capturedAt)} til{" "}
                      {formatDateTime(historyInsight.group.latest.capturedAt)}.
                    </p>
                    <p className="mt-2 text-[12px] font-medium text-[#52606D]">
                      {historyInsight.group.latest.summary} · {historyInsight.group.latest.organizationForm ?? "Ukjent org.form"}
                      {historyInsight.group.latest.naceCode ? ` · ${historyInsight.group.latest.naceCode}` : ""}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-[#52606D]">
                      {formatLegendLabel(historyInsight.group.latest.scoreColor)}
                    </p>
                  </div>
                ) : history.length > 0 ? (
                  <p className="text-[14px] text-[#52606D]">
                    Historikken tilfører foreløpig lite, fordi vi bare har ett lagret punkt uten endringer over tid.
                  </p>
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen lagret historikk ennå. Historikk bygges opp når selskapet åpnes over tid, så dette er forventet for nye eller lite brukte oppslag.</p>
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

function DetailDataPoint({ icon: Icon, label, value, isLink }: { icon: LucideIcon; label: string; value: string; isLink?: boolean }) {
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
          <p className={`text-[14px] font-semibold text-[#1F2933] ${isLink && value.includes('.') ? 'text-[#1F5FA9] underline underline-offset-4' : ''}`}>
            {value}
          </p>
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
                target={href.startsWith("http") ? "_blank" : undefined}
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

function formatRegistryFlag(value: boolean | null) {
  if (value === true) return "Registrert";
  if (value === false) return "Ikke registrert";
  return "Ukjent";
}

function formatEmployeeCount(count: number | null, isRegistered: boolean | null) {
  if (typeof count === "number") {
    return `${count}`;
  }
  if (isRegistered === false) {
    return "Ikke rapportert";
  }
  return "Ukjent";
}

function formatEventType(type: string) {
  switch (type) {
    case "BANKRUPTCY":
      return "Konkurs";
    case "DISSOLUTION":
      return "Tvangsoppløsning";
    case "WINDING_UP":
      return "Avvikling";
    case "ANNUAL_ACCOUNTS":
      return "Årsregnskap";
    case "REGISTRATION":
      return "Registrering";
    case "ADDRESS_CHANGE":
      return "Adresseendring";
    case "ARTICLES_OF_ASSOCIATION":
      return "Vedtekter";
    default:
      return type.replaceAll("_", " ").toLowerCase();
  }
}

function formatEventSeverity(severity: CompanyEvent["severity"]) {
  switch (severity) {
    case "HIGH":
      return "Høy alvorlighet";
    case "MEDIUM":
      return "Middels alvorlighet";
    case "INFO":
      return "Informasjon";
  }
}

function formatEventDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const norwegianDateMatch = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (norwegianDateMatch) {
    const [, day, month, year] = norwegianDateMatch;
    return `${year}-${month}-${day}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function eventSeverityClassName(severity: CompanyEvent["severity"]) {
  switch (severity) {
    case "HIGH":
      return "bg-rose-50 text-rose-700";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700";
    case "INFO":
      return "bg-slate-100 text-slate-700";
  }
}

function formatRoleType(roleType: string) {
  switch (roleType) {
    case "DAGLIG_LEDER":
      return "Daglig leder";
    case "STYRELEDER":
      return "Styreleder";
    case "STYREMEDLEM":
      return "Styremedlem";
    default:
      return roleType.replaceAll("_", " ").toLowerCase();
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildOutreachEmailSubject(
  markdown: string,
  company: Pick<CompanySummary, "name" | "orgNumber" | "contactPersonName" | "email" | "phone" | "municipality" | "county">
) {
  const template = extractMailSubject(markdown) ?? "Tilbud om enkel nettside til {{companyName}}";
  return applyOutreachTemplate(template, company);
}

function buildOutreachEmailBody(
  markdown: string,
  company: Pick<CompanySummary, "name" | "orgNumber" | "contactPersonName" | "email" | "phone" | "municipality" | "county">
) {
  const template = extractMarkdownSection(markdown, "E-postmal") ?? defaultOutreachEmailTemplate();
  const cleanedTemplate = template.replace(/^Emne:\s*`?.+`?\s*$/m, "").trim();
  return applyOutreachTemplate(cleanedTemplate, company);
}

function extractMailSubject(markdown: string) {
  const section = extractMarkdownSection(markdown, "E-postmal");
  if (!section) {
    return null;
  }

  const match = section.match(/Emne:\s*`?([^\n`]+)`?/);
  return match?.[1]?.trim() ?? null;
}

function extractMarkdownSection(markdown: string, heading: string) {
  const marker = `## ${heading}`;
  const startIndex = markdown.indexOf(marker);
  if (startIndex < 0) {
    return null;
  }

  const contentStart = startIndex + marker.length;
  const remaining = markdown.slice(contentStart).trimStart();
  const nextHeadingIndex = remaining.search(/\n##\s+/);
  return (nextHeadingIndex >= 0 ? remaining.slice(0, nextHeadingIndex) : remaining).trim();
}

function applyOutreachTemplate(
  template: string,
  company: Pick<CompanySummary, "name" | "orgNumber" | "contactPersonName" | "email" | "phone" | "municipality" | "county">
) {
  const greeting = company.contactPersonName?.trim() || `dere i ${company.name}`;
  const location = [company.municipality, company.county].filter(Boolean).join(", ");

  const replacements: Record<string, string> = {
    "{{companyName}}": company.name,
    "{{orgNumber}}": company.orgNumber,
    "{{contactPerson}}": company.contactPersonName?.trim() || "",
    "{{companyEmail}}": company.email?.trim() || "",
    "{{companyPhone}}": company.phone?.trim() || "",
    "{{location}}": location,
    "{{greeting}}": greeting,
    "{{price}}": "4.500",
    "{{senderName}}": "[DITT NAVN]",
    "{{senderCompany}}": "[FIRMANAVN]",
    "{{senderPhone}}": "[DITT TELEFONNUMMER]",
    "{{senderEmail}}": "[DIN E-POST]",
  };

  let nextText = template;
  for (const [key, value] of Object.entries(replacements)) {
    nextText = nextText.replaceAll(key, value);
  }

  return nextText
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function defaultOutreachEmailTemplate() {
  return `Hei {{greeting}},

Jeg så at {{companyName}} er et nytt selskap, og ville derfor sende en kort henvendelse.

Jeg hjelper nye virksomheter med en enkel digital startpakke, slik at dere raskt får på plass en ryddig nettside med kontaktinformasjon, samt hjelp med domene og e-post ved behov.

Jeg kan levere dette som en enkel pakke til kr {{price}}.

Hvis dette er aktuelt, kan jeg sende et helt konkret forslag til oppsett og hva som kan være på siden.

Mvh
{{senderName}}
{{senderCompany}}
{{senderPhone}}
{{senderEmail}}`;
}

function formatNokPrice(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function stripWebsiteProtocol(value: string) {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function formatWebsiteConfidence(confidence: "HIGH" | "MEDIUM" | "LOW") {
  switch (confidence) {
    case "HIGH":
      return "Høy";
    case "MEDIUM":
      return "Middels";
    case "LOW":
      return "Lav";
  }
}

function formatWebsiteVerification(websiteDiscovery: NonNullable<CompanySummary["websiteDiscovery"]>) {
  if (websiteDiscovery.verifiedReachable === true) {
    return "Kandidaten svarte ved sjekk";
  }
  if (websiteDiscovery.verifiedReachable === false) {
    return "Kandidaten svarte ikke ved sjekk";
  }
  return "Kandidaten er ikke verifisert";
}

function formatWebsiteContentMatch(websiteDiscovery: NonNullable<CompanySummary["websiteDiscovery"]>) {
  if (websiteDiscovery.contentMatched === true) {
    return "innholdet ligner på selskapet";
  }
  if (websiteDiscovery.verifiedReachable === true) {
    return "ingen tydelig kobling funnet i innholdet";
  }
  return "innhold ikke sjekket";
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "short",
  }).format(date);
}

function formatRiskLabel(scoreColor: ScoreColor) {
  switch (scoreColor) {
    case "RED":
      return "Høy aktørrisiko";
    case "YELLOW":
      return "Noe aktørrisiko";
    case "GREEN":
      return "Lav aktørrisiko";
  }
}

function networkRiskTextClass(scoreColor: ScoreColor) {
  switch (scoreColor) {
    case "RED":
      return "text-rose-700";
    case "YELLOW":
      return "text-amber-700";
    case "GREEN":
      return "text-emerald-700";
  }
}

function scoreDotClass(scoreColor: ScoreColor) {
  switch (scoreColor) {
    case "RED":
      return "bg-rose-500";
    case "YELLOW":
      return "bg-amber-500";
    case "GREEN":
      return "bg-emerald-500";
  }
}

function compactRiskLabel(scoreColor: ScoreColor) {
  switch (scoreColor) {
    case "RED":
      return "Rød";
    case "YELLOW":
      return "Gul";
    case "GREEN":
      return "Grønn";
  }
}

function describeActorContext(actor: NetworkActor) {
  if (actor.bankruptcyCompanyCount > 0 && actor.dissolvedCompanyCount > 0) {
    return `Denne rolleholderen er knyttet til virksomheter med både konkurs- og avviklingsspor${formatActorRecencySuffix(actor)}, noe som gjør aktørkonteksten særlig relevant.`;
  }
  if (actor.bankruptcyCompanyCount > 0) {
    return `Denne rolleholderen er knyttet til virksomheter med konkursmarkering${formatActorRecencySuffix(actor)}, noe som gir et tydelig historisk faresignal.`;
  }
  if (actor.redCompanyCount > 0 && actor.dissolvedCompanyCount > 0) {
    return `Denne rolleholderen er knyttet til flere virksomheter med både røde signaler og avvikling${formatActorRecencySuffix(actor)}, noe som gjør aktørkonteksten særlig relevant.`;
  }
  if (actor.redCompanyCount > 0) {
    return "Denne rolleholderen er knyttet til virksomheter med røde signaler, noe som trekker opp aktørrisikoen.";
  }
  if (actor.dissolvedCompanyCount > 0) {
    return "Denne rolleholderen er knyttet til avviklede virksomheter, noe som gir et svakere historisk signal.";
  }
  if (actor.yellowCompanyCount > 0) {
    return "Denne rolleholderen er knyttet til flere virksomheter med begrenset datagrunnlag eller svakere signaler.";
  }
  return "Aktørkonteksten ser foreløpig rolig ut basert på selskapene som er lagret i nettverksgrunnlaget.";
}

function formatActorSeenSummary(actor: NetworkActor) {
  const parts = [
    actor.lastBankruptcySeenAt ? `konkurs sist sett ${formatShortDate(actor.lastBankruptcySeenAt)}` : null,
    actor.lastDissolvedSeenAt ? `avvikling sist sett ${formatShortDate(actor.lastDissolvedSeenAt)}` : null,
    actor.lastRedSeenAt ? `rødt signal sist sett ${formatShortDate(actor.lastRedSeenAt)}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatActorRecencySuffix(actor: NetworkActor) {
  const mostRelevantDate = actor.lastBankruptcySeenAt ?? actor.lastDissolvedSeenAt ?? actor.lastRedSeenAt;
  return mostRelevantDate ? `, sist sett ${formatShortDate(mostRelevantDate)}` : "";
}

function describeStructureSignal(signal: StructureSignal) {
  switch (signal.code) {
    case "ACTOR_CONTEXT_ELEVATED":
      return "Dette brukes når aktørhistorikken er sterk nok til å være et eget signal, ikke bare bakgrunnsstøy i nettverksdelen.";
    case "RECENT_BANKRUPTCY_RELATION":
      return "Dette er et tidsnært kryssselskapsmønster, ikke bare et generelt historisk faresignal.";
    case "RECENT_DISSOLUTION_RELATION":
      return "Dette peker på nærhet i tid mellom nytt selskap og tidligere avviklingsspor hos de samme aktørene.";
    case "CLUSTERED_NEW_COMPANY_PATTERN":
      return "Flere nye selskaper på kort tid med samme aktører bør leses som strukturmønster, ikke som enkeltstående oppslag.";
    case "POSSIBLE_REORGANIZATION":
      return "Dette er en heuristisk vurdering som bør undersøkes sammen med nettverk, hendelser og registreringsdatoer.";
    default:
      return null;
  }
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

function estimateListProgress(elapsedMs: number) {
  if (elapsedMs <= 4000) {
    return 12 + (elapsedMs / 4000) * 33;
  }
  if (elapsedMs <= 15000) {
    return 45 + ((elapsedMs - 4000) / 11000) * 30;
  }
  if (elapsedMs <= 45000) {
    return 75 + ((elapsedMs - 15000) / 30000) * 15;
  }
  return 90;
}

function analyzeHistoryPatterns(history: CompanyHistoryEntry[]) {
  if (history.length < 2) {
    return null;
  }

  const ordered = [...history].sort(
    (left, right) => new Date(left.capturedAt).getTime() - new Date(right.capturedAt).getTime()
  );

  let scoreChanges = 0;
  let organizationFormChanges = 0;
  let naceChanges = 0;
  let contactChanges = 0;
  let roleChanges = 0;

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];

    if (previous.scoreColor !== current.scoreColor) {
      scoreChanges += 1;
    }
    if ((previous.organizationForm ?? "") !== (current.organizationForm ?? "")) {
      organizationFormChanges += 1;
    }
    if ((previous.naceCode ?? "") !== (current.naceCode ?? "")) {
      naceChanges += 1;
    }
    if (previous.hasContactData !== current.hasContactData) {
      contactChanges += 1;
    }
    if (previous.hasRoles !== current.hasRoles) {
      roleChanges += 1;
    }
  }

  const first = ordered[0];
  const latest = ordered[ordered.length - 1];
  const changeSignals: string[] = [];

  if (scoreChanges > 0) {
    changeSignals.push(`${scoreChanges} scoreendringer`);
  }
  if (organizationFormChanges > 0) {
    changeSignals.push(`${organizationFormChanges} endringer i org.form`);
  }
  if (naceChanges > 0) {
    changeSignals.push(`${naceChanges} bransjeendringer`);
  }
  if (contactChanges > 0) {
    changeSignals.push(`${contactChanges} endringer i kontaktdata`);
  }
  if (roleChanges > 0) {
    changeSignals.push(`${roleChanges} endringer i roller`);
  }
  if (changeSignals.length === 0) {
    changeSignals.push("Stabil historikk så langt");
  }

  return {
    scoreTrend: buildScoreTrendText(first.scoreColor as ScoreColor, latest.scoreColor as ScoreColor, scoreChanges),
    changeSignals,
  };
}

type HistoryGroup = {
  count: number;
  latest: CompanyHistoryEntry;
  oldest: CompanyHistoryEntry;
};

type HistoryInsight =
  | { kind: "empty" }
  | { kind: "single" }
  | { kind: "stable"; group: HistoryGroup }
  | { kind: "changes"; groups: HistoryGroup[] };

function buildHistoryInsight(history: CompanyHistoryEntry[]): HistoryInsight {
  if (history.length === 0) {
    return { kind: "empty" };
  }

  const sortedHistory = [...history].sort(
    (left, right) => new Date(right.capturedAt).getTime() - new Date(left.capturedAt).getTime()
  );
  const groups: HistoryGroup[] = [];

  for (const entry of sortedHistory) {
    const previousGroup = groups.at(-1);
    if (previousGroup && historyEntrySignature(previousGroup.latest) === historyEntrySignature(entry)) {
      previousGroup.count += 1;
      previousGroup.oldest = entry;
      continue;
    }

    groups.push({
      count: 1,
      latest: entry,
      oldest: entry,
    });
  }

  if (groups.length === 1) {
    if (groups[0].count === 1) {
      return { kind: "single" };
    }
    return { kind: "stable", group: groups[0] };
  }

  return {
    kind: "changes",
    groups: groups.slice(0, 6),
  };
}

function historyEntrySignature(entry: CompanyHistoryEntry) {
  return JSON.stringify({
    summary: entry.summary,
    organizationForm: entry.organizationForm,
    scoreColor: entry.scoreColor,
    municipality: entry.municipality,
    county: entry.county,
    naceCode: entry.naceCode,
    latestAnnualAccountsYear: entry.latestAnnualAccountsYear,
    vatRegistered: entry.vatRegistered,
    registeredInBusinessRegistry: entry.registeredInBusinessRegistry,
    hasContactData: entry.hasContactData,
    hasRoles: entry.hasRoles,
    hasSeriousSignals: entry.hasSeriousSignals,
    registrationDate: entry.registrationDate,
  });
}

function structureSignalSeverityClassName(severity: "HIGH" | "MEDIUM" | "INFO") {
  if (severity === "HIGH") {
    return "bg-rose-50 text-rose-700";
  }
  if (severity === "MEDIUM") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

function formatStructureSignalSeverity(severity: "HIGH" | "MEDIUM" | "INFO") {
  if (severity === "HIGH") {
    return "Høy relevans";
  }
  if (severity === "MEDIUM") {
    return "Middels relevans";
  }
  return "Til orientering";
}

function listStructureSignalClassName(severity: "HIGH" | "MEDIUM" | "INFO") {
  if (severity === "HIGH") {
    return "bg-rose-50 text-rose-700";
  }
  if (severity === "MEDIUM") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-sky-50 text-sky-700";
}

function buildScoreTrendText(from: ScoreColor, to: ScoreColor, scoreChanges: number) {
  if (from === to && scoreChanges === 0) {
    return `Vurderingen har vært stabil på ${formatLegendLabel(to).toLowerCase()} i den lagrede historikken.`;
  }
  if (from === to) {
    return `Vurderingen har beveget seg underveis, men står nå igjen på ${formatLegendLabel(to).toLowerCase()}.`;
  }
  return `Vurderingen har beveget seg fra ${formatLegendLabel(from).toLowerCase()} til ${formatLegendLabel(to).toLowerCase()}.`;
}

function formatLegendLabel(scoreColor: ScoreColor) {
  switch (scoreColor) {
    case "GREEN":
      return "Ingen varselflagg";
    case "YELLOW":
      return "Begrenset info";
    case "RED":
      return "Alvorlige signaler";
  }
}
