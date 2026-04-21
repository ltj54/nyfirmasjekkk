"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

import type {
  CompanyEvent,
  CompanyDetails,
  CompanyHistoryEntry,
  NetworkActor,
  CompanySummary,
  MetadataFiltersResponse,
  ScoreColor,
} from "@/lib/company-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const dayOptions = ["10", "30", "60", "180", "365", "0"];
const structureSignalLabels: Record<string, string> = {
  NEW_COMPANY_WINDOW: "Nytt selskap",
  LIMITED_DATA_PATTERN: "Tynt datagrunnlag",
  BO_SIGNAL: "Bo-signal",
  BANKRUPTCY_SIGNAL: "Konkursspor",
  DISSOLUTION_SIGNAL: "Avviklingsspor",
  ACTOR_RISK_PATTERN: "Aktørrisiko",
  POSSIBLE_REORGANIZATION: "Mulig omregistrering",
};

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
    description: "Vanlig selskapsform med begrenset ansvar. Ofte den mest etablerte formen for aktive foretak.",
  },
  ENK: {
    label: "Enkeltpersonforetak",
    description: "Eies og drives av én person. Formen er enkel, men knytter virksomheten tett til personen bak.",
  },
  NUF: {
    label: "Norskregistrert utenlandsk foretak",
    description: "Utenlandsk virksomhet registrert i Norge. Gir ofte svakere innsyn enn et ordinært norsk selskap.",
  },
  SA: {
    label: "Samvirkeforetak",
    description: "Medlemsstyrt foretak der formålet er å skape nytte for medlemmene, ikke bare eiere.",
  },
  FLI: {
    label: "Forening/lag/innretning",
    description: "Brukes ofte av foreninger og andre medlemsbaserte eller ideelle organisasjoner uten eiere.",
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
    counties: [],
    scores: [],
    structureSignals: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listLoadProgress, setListLoadProgress] = useState(0);
  const [listLoadSeconds, setListLoadSeconds] = useState(0);
  const [daysFilter, setDaysFilter] = useState("10");
  const [countyFilter, setCountyFilter] = useState("");
  const [organizationFormFilter, setOrganizationFormFilter] = useState("AS");
  const [selectedLegend, setSelectedLegend] = useState<keyof typeof legendDetails | null>("GREEN");
  const [selectedStructureSignal, setSelectedStructureSignal] = useState("");
  const [selectedCompanyEvents, setSelectedCompanyEvents] = useState<CompanyEvent[]>([]);
  const [selectedCompanyHistory, setSelectedCompanyHistory] = useState<CompanyHistoryEntry[]>([]);
  const [selectedCompanyNetwork, setSelectedCompanyNetwork] = useState<NetworkActor[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [, startTransition] = useTransition();
  const latestListRequestId = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const hasDetailHistoryEntryRef = useRef(false);

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

    void hydrateLandingData();
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
      selectedStructureSignal?: string;
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
    const effectiveSelectedStructureSignal = overrides?.selectedStructureSignal ?? selectedStructureSignal;
    const params = new URLSearchParams();
    params.set("dager", effectiveDaysFilter);
    params.set("page", pageNum.toString());
    if (query) params.set("q", query);
    if (effectiveCountyFilter) params.set("county", effectiveCountyFilter);
    if (effectiveOrganizationFormFilter) params.set("organizationForm", effectiveOrganizationFormFilter);
    if (effectiveSelectedLegend) params.set("score", effectiveSelectedLegend);
    if (effectiveSelectedStructureSignal) params.set("structureSignal", effectiveSelectedStructureSignal);

    try {
      const response = await fetch(`/api/company-check/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (requestId !== latestListRequestId.current) {
          return;
        }
        const items = Array.isArray(data) ? data : data.items || [];
        const nextTotalElements = Array.isArray(data) ? items.length : (data.totalElements ?? items.length);
        const nextTotalPages = Array.isArray(data) ? (items.length > 0 ? 1 : 0) : (data.totalPages ?? 0);
        setRecentCompanies(items);
        setPage(pageNum);
        setTotalElements(nextTotalElements);
        setTotalPages(nextTotalPages);
        setError(null);
      } else if (response.status === 502) {
        const payload = await response.json().catch(() => null);
        if (requestId !== latestListRequestId.current) {
          return;
        }
        setRecentCompanies([]);
        setTotalElements(0);
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

  useEffect(() => {
    if (backendReady && initialResultsReady && !selectedCompany) {
      void fetchRecent(0);
    }
  }, [backendReady, initialResultsReady, daysFilter, countyFilter, organizationFormFilter, selectedLegend, selectedStructureSignal, selectedCompany, activeQuery]);

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
      if (selectedStructureSignal) {
        params.set("structureSignal", selectedStructureSignal);
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
    setDaysFilter("10");
    setCountyFilter("");
    setOrganizationFormFilter("AS");
    setSelectedStructureSignal("");
    searchInputRef.current?.focus({ preventScroll: true });
    void fetchRecent(0, "", {
      daysFilter: "10",
      countyFilter: "",
      organizationFormFilter: "AS",
      selectedLegend: "GREEN",
      selectedStructureSignal: "",
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
    selectedStructureSignal,
  );

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-[#1F5FA9]/10">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#1F5FA9] focus:shadow-lg"
        href="#main-content"
      >
        Hopp til innhold
      </a>

      <header className="sticky top-0 z-30 border-b border-[#D9E2EC] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <button
            className="flex items-center gap-3 text-left"
            onClick={resetToLanding}
            type="button"
          >
            <div className="flex size-10 items-center justify-center rounded-2xl border border-[#D9E2EC] bg-[#1F5FA9] text-sm font-bold text-white shadow-sm">
              N
            </div>
            <div>
              <p className="text-[12px] font-medium text-[#52606D]">
                Virksomhetssøk
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
            <Button variant="default" size="sm" className="rounded-full bg-[#1F5FA9] px-4 text-white hover:bg-[#2F6FB2]">
              <Menu className="size-4" />
              <span className="hidden sm:inline">Meny</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="pb-16">
        {/* Search Area */}
        {!selectedCompany && (
          <section id="search" className="mx-auto max-w-7xl px-6 pt-6 sm:pt-8">
            <div className="grid gap-4">
              <div className="rounded-[22px] border border-[#D9E2EC] bg-white px-5 py-6 sm:px-7 sm:py-7">
                <p className="text-[12px] font-medium text-[#52606D]">Finn nye firmaer som trenger en digital start</p>
                <div className="mt-3 max-w-3xl">
                  <h1 className="text-3xl font-semibold tracking-tight text-[#1F2933] sm:text-4xl">
                    Oppdag nye virksomheter som mangler nettside og digital synlighet
                  </h1>
                  <p className="mt-3 text-[15px] leading-7 text-[#52606D]">
                    Bruk åpne BRREG-data til å finne nyregistrerte selskaper, vurdere hvor synlige de er digitalt og identifisere hvem som sannsynligvis trenger hjelp med nettside, domene og e-post fra start.
                  </p>
                  <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#1F5FA9]">
                    Dette er et arbeidsverktøy for å finne relevante selskaper med tydelige mulighetssignaler og gå videre med et konkret tilbud om digital etablering.
                  </p>
                </div>

                <form className="mt-6" onSubmit={handleSubmit}>
                  <div className="group flex flex-col gap-3 rounded-[18px] border border-[#D9E2EC] bg-[#F0F4F8] p-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-3 rounded-[16px] border border-transparent bg-white px-4 py-3 focus-within:border-[#2F6FB2]">
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
                      className="h-11 rounded-full bg-[#1F5FA9] px-5 text-[14px] font-semibold text-white hover:bg-[#2F6FB2]"
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
                        className={`peer rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
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
                      className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
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
                  <span className="text-[#52606D]">Strukturspor:</span>
                  <button
                    className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      !selectedStructureSignal
                        ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                        : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                    }`}
                    disabled={!initialResultsReady || isListLoading}
                    onClick={() => setSelectedStructureSignal("")}
                    type="button"
                  >
                    Alle
                  </button>
                  {metadata.structureSignals.map((signal) => (
                    <button
                      key={signal}
                      className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                        selectedStructureSignal === signal
                          ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                          : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                      }`}
                      disabled={!initialResultsReady || isListLoading}
                      onClick={() => setSelectedStructureSignal((current) => current === signal ? "" : signal)}
                      type="button"
                    >
                      {structureSignalLabels[signal] ?? signal}
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
                        className={`rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
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
                    setDaysFilter("10");
                    setCountyFilter("");
                    setOrganizationFormFilter("AS");
                    setSelectedLegend("GREEN");
                    setSelectedStructureSignal("");
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
                  Data fra BRREG. Vurderingene brukes som første signal for hvem som kan være aktuelle å kontakte med tilbud om nettside og digital profil.
                </p>
              </div>

            </div>
          </section>
        )}

        {/* Dynamic Content */}
        <section id="results" className="mx-auto max-w-7xl px-6 pb-24 pt-10">
          {error && (
            <div className="mx-auto mb-12 max-w-2xl rounded-[18px] border border-rose-100/60 bg-rose-50/50 p-7 text-center animate-in zoom-in duration-300">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
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

          {selectedCompany ? (
            <CompanyDetailView
              company={selectedCompany}
              events={selectedCompanyEvents.length > 0 ? selectedCompanyEvents : selectedCompany.events}
              history={selectedCompanyHistory}
              network={selectedCompanyNetwork}
              onBack={resetToLanding}
            />
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
              {isListLoading && (
                <div className="rounded-[18px] border border-[#D9E2EC] bg-white px-5 py-4">
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
                  <div className="h-2 overflow-hidden rounded-full bg-[#E4E7EB]">
                    <div
                      className="h-full rounded-full bg-[#1F5FA9] transition-[width] duration-200 ease-out"
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
                  <div className="flex items-center gap-2 rounded-full border border-[#D9E2EC] bg-white px-2 py-1">
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
                          setDaysFilter("10");
                          setSearchTerm("");
                          setActiveQuery("");
                          setCountyFilter("");
                          setOrganizationFormFilter("AS");
                          setSelectedLegend("GREEN");
                          setSelectedStructureSignal("");
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
          )}
        </section>
      </main>

      {/* Footer */}
      {!selectedCompany && (
        <footer id="footer" className="border-t border-[#D9E2EC] bg-[#1F2933] text-white">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="max-w-md">
                <p className="text-[12px] font-medium text-white/60">NyFirmasjekk</p>
                <p className="mt-4 text-2xl font-semibold tracking-tight">
                  Virksomhetssøk og registerinformasjon
                </p>
                <p className="mt-4 text-[14px] leading-7 text-white/70">
                  Analyse av åpne registerdata fra Enhetsregisteret og Foretaksregisteret. Registersporene er veiledende og erstatter ikke manuell kontroll.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <FooterColumn
                  title="Tjenester"
                  links={["Søk", "Søkeresultater", "Metode", "Organisasjonsformer"]}
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

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-[12px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
              <span>Org.nr. 999 999 999</span>
              <span>Universell utforming, tydelig forklaring og en nøktern offentlig portalstil.</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[12px] font-medium text-[#52606D]">{eyebrow}</p>
      <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-[#1F2933] sm:text-[28px]">{title}</h2>
      <p className="mt-2 text-[14px] leading-7 text-[#52606D]">{description}</p>
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
      <p className="text-[12px] font-medium text-white/60">{title}</p>
      <ul className="mt-4 space-y-3 text-[14px] text-white/70">
        {links.map((link) => (
          <li key={link}>
            <button
              className="text-left transition-colors hover:text-white"
              onClick={() => {
                const idMap: Record<string, string> = {
                  Søk: "search",
                  "Søkeresultater": "results",
                  Metode: "results",
                  Organisasjonsformer: "search",
                  BRREG: "search",
                  Historikk: "results",
                  Nettverk: "results",
                  API: "results",
                  Kontakt: "footer",
                  Tilgjengelighet: "footer",
                  Personvern: "footer",
                  Kilder: "results",
                  "Om vurderingen": "results",
                  Datakilder: "results",
                  Forklaringer: "results",
                  "Min side": "search",
                };
                onNavigate(idMap[link] ?? "main-content");
              }}
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

function CompanyCard({ company, onClick }: { company: CompanySummary; onClick: () => void }) {
  const scoreColors = {
    GREEN: "bg-emerald-500",
    YELLOW: "bg-amber-500",
    RED: "bg-rose-500",
  };
  const leadPriority = getLeadPriority(company);
  const contactability = getContactability(company);
  const bestContactPoint = getBestContactPoint(company);
  const structureSignals = company.structureSignals || [];
  const colorClass = scoreColors[company.scoreColor] || scoreColors.YELLOW;

  return (
    <div
      className="group cursor-pointer rounded-[18px] border border-[#D9E2EC] bg-white p-4 transition-colors hover:border-[#2F6FB2]"
      onClick={onClick}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`size-3 rounded-full ${colorClass} shadow-sm`} />
          <Badge className={leadPriority.badgeClass}>
            {leadPriority.label}
          </Badge>
        </div>
        <Badge variant="outline" className="rounded-md border-[#D9E2EC] bg-[#F0F4F8] px-2 py-0 text-[10px] font-medium text-[#52606D]">
          {company.organizationForm}
        </Badge>
      </div>
      <h3 className="mb-1 line-clamp-1 text-[15px] font-semibold text-[#1F2933] transition-colors group-hover:text-[#1F5FA9]">
        {company.name}
      </h3>
      <p className="mb-3 text-[12px] font-mono font-medium text-[#52606D]">{company.orgNumber}</p>

      <div className="mb-4 rounded-[14px] border border-[#E4E7EB] bg-[#F8FBFF] p-3">
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
        {company.contactPersonName ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Building2 className="size-3.5" />
            <span className="truncate">
              {company.contactPersonName}
              {company.contactPersonRole ? ` · ${formatRoleType(company.contactPersonRole)}` : ""}
            </span>
          </div>
        ) : null}
        {company.email ? (
          <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
            <Mail className="size-3.5" />
            <a
              className="truncate text-[#1F5FA9] underline underline-offset-4 hover:text-[#2F6FB2]"
              href={`mailto:${company.email}`}
              onClick={(event) => event.stopPropagation()}
            >
              {company.email}
            </a>
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
        {structureSignals.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {structureSignals.map((signal) => (
              <Badge
                key={`${company.orgNumber}-${signal.code}`}
                variant="outline"
                className={`border-transparent text-[10px] font-semibold ${listStructureSignalClassName(signal.severity)}`}
              >
                {signal.title}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalizeWebsiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function getContactability(company: CompanySummary) {
  const points = [company.email, company.phone, company.website, company.contactPersonName].filter(Boolean).length;

  if (company.email || company.phone) {
    return {
      label: "Direkte kontaktpunkt registrert",
      shortLabel: "Kontaktbar",
      badgeClass: "rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700",
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
  const hasDirectContact = Boolean(company.email || company.phone);
  const missingWebsite = !company.website;

  if (missingWebsite && hasDirectContact && company.scoreColor !== "RED") {
    return {
      label: "Sterkt signal",
      badgeClass: "rounded-full bg-[#1F5FA9] px-2.5 py-1 text-[10px] font-semibold text-white",
    };
  }

  if ((missingWebsite || hasDirectContact) && company.scoreColor !== "RED") {
    return {
      label: "Mulig signal",
      badgeClass: "rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700",
    };
  }

  return {
    label: "Svakt signal",
    badgeClass: "rounded-full bg-[#F0F4F8] px-2.5 py-1 text-[10px] font-semibold text-[#52606D]",
  };
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
  if (company.contactPersonName) {
    return { label: `Manuell kontakt mot ${company.contactPersonName}` };
  }
  return { label: "Krever manuell research" };
}

function compareLeadPriority(left: CompanySummary, right: CompanySummary) {
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
  if (label === "Høy prioritet") return 0;
  if (label === "Aktuell") return 1;
  return 2;
}

function structureSignalRank(company: CompanySummary) {
  const severities = (company.structureSignals || []).map((signal) => signal.severity);
  if (severities.includes("HIGH")) return 0;
  if (severities.includes("MEDIUM")) return 1;
  if (severities.includes("INFO")) return 2;
  return 3;
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
  history,
  network,
  onBack,
}: {
  company: CompanyDetails;
  events: CompanyEvent[];
  history: CompanyHistoryEntry[];
  network: NetworkActor[];
  onBack: () => void;
}) {
  const scoreConfig = {
    GREEN: { icon: CheckCircle2, text: "bg-emerald-50 text-emerald-700 border-emerald-100", wash: "from-emerald-100/80 via-emerald-50/40 to-transparent", iconColor: "text-emerald-500" },
    YELLOW: { icon: AlertTriangle, text: "bg-amber-50 text-amber-700 border-amber-100", wash: "from-amber-100/80 via-amber-50/40 to-transparent", iconColor: "text-amber-500" },
    RED: { icon: AlertCircle, text: "bg-rose-50 text-rose-700 border-rose-100", wash: "from-rose-100/80 via-rose-50/40 to-transparent", iconColor: "text-rose-500" },
  };

  const config = scoreConfig[company.scoreColor] || scoreConfig.YELLOW;
  const StatusIcon = config.icon;

  const scoreLabel = company.score?.label || "Ukjent status";
  const scoreReasons = company.score?.reasons || [];
  const scoreEvidence = company.score?.evidence || [];
  const structureSignals = company.structureSignals || [];
  const quickEvidence = scoreEvidence.slice(0, 3);
  const extendedEvidence = scoreEvidence.slice(3);
  const primaryReason = scoreEvidence[0]?.detail || scoreReasons[0] || "Ingen begrunnelse oppgitt.";
  const historyPatterns = analyzeHistoryPatterns(history);
  const [detailMode, setDetailMode] = useState<"quick" | "deep">("quick");

  return (
    <div className="detail-shell mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full border border-[#D9E2EC] bg-white text-[#1F2933] hover:bg-[#F0F4F8]"
          onClick={onBack}
          type="button"
        >
          <ArrowLeft className="size-4" />
          Tilbake til treff
        </Button>
      </div>

      <div className="detail-panel overflow-hidden rounded-[24px] border border-[#D9E2EC]">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${config.wash}`} />
        {/* Header Section */}
        <div className="relative p-5 sm:p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-5">
              <div className={`flex size-14 items-center justify-center rounded-[18px] ${config.text} border shadow-sm`}>
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
                  <span className="rounded border border-[#E4E7EB] bg-[#FFFFFF] px-2 py-0.5 font-mono">
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
              <div className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-semibold ${config.text} border`}>
                {scoreLabel}
              </div>
              <p className="max-w-xs text-[13px] font-medium leading-relaxed text-[#52606D] md:text-right">
                Et raskt mulighetssignal basert på offentlige registerspor, roller og grunnleggende virksomhetsdata.
              </p>
            </div>
          </div>

          <Separator className="bg-[#E4E7EB]" />

          <div className="mt-6 inline-flex flex-wrap gap-2 rounded-full border border-[#D9E2EC] bg-[#F8FAFC] p-1">
            <Button
              type="button"
              variant={detailMode === "quick" ? "default" : "outline"}
              className={detailMode === "quick"
                ? "rounded-full border border-[#1F2933] bg-[#1F2933] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_6px_18px_rgba(31,41,51,0.18)] hover:bg-[#1F2933]"
                : "rounded-full border border-transparent bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52606D] hover:bg-white"}
              onClick={() => setDetailMode("quick")}
            >
              <span className={`mr-2 inline-block size-1.5 rounded-full ${detailMode === "quick" ? "bg-white" : "bg-[#9AA5B1]"}`} />
              Hurtigsjekk
            </Button>
            <Button
              type="button"
              variant={detailMode === "deep" ? "default" : "outline"}
              className={detailMode === "deep"
                ? "rounded-full border border-[#1F2933] bg-[#1F2933] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-white shadow-[0_6px_18px_rgba(31,41,51,0.18)] hover:bg-[#1F2933]"
                : "rounded-full border border-transparent bg-transparent px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52606D] hover:bg-white"}
              onClick={() => setDetailMode("deep")}
            >
              <span className={`mr-2 inline-block size-1.5 rounded-full ${detailMode === "deep" ? "bg-white" : "bg-[#9AA5B1]"}`} />
              Dyp analyse
            </Button>
          </div>

          {detailMode === "quick" ? (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-150 rounded-[20px] border border-[#D9E2EC] bg-[#F8FBFF] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[#52606D]">Nivå 1</p>
                  <h3 className="mt-1 text-[20px] font-semibold text-[#1F2933]">Hurtigsjekk</h3>
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

              <div className={`mt-8 rounded-[18px] border p-5 ${config.text} border-opacity-50`}>
                <p className="mb-2 text-[12px] font-medium opacity-70">Kort registerspor</p>
                <p className="text-[15px] font-semibold leading-relaxed">{primaryReason}</p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[18px] border border-[#D9E2EC] bg-white p-5">
                  <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Viktigste registerspor</h4>
                  <div className="space-y-3">
                    {quickEvidence.length > 0 ? (
                      quickEvidence.map((item) => (
                        <div key={`${item.label}-${item.source}`} className="rounded-[14px] border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
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

                <div className="rounded-[18px] border border-[#D9E2EC] bg-white p-5">
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
          ) : null}
        </div>

        {detailMode === "deep" ? (
          <>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-150 border-t border-[#E4E7EB] bg-[#F0F4F8] p-5 sm:p-6 md:p-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="mb-2 text-[12px] font-medium text-[#52606D]">Nivå 2</p>
                  <h3 className="text-[18px] font-semibold text-[#1F2933]">Dyp analyse</h3>
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
                    <div key={`${role.type}-${role.name}-${i}`} className="rounded-[16px] border border-[#D9E2EC] bg-white px-4 py-3">
                      <p className="mb-1 text-[11px] font-medium text-[#52606D]">{role.type}</p>
                      <p className="text-[14px] font-bold text-[#1F2933]">{role.name}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-[#7B8794]">Ingen roller funnet i åpne data.</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {detailMode === "deep" ? (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-200 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {extendedEvidence.map((item, i) => (
              <div key={`evidence-${item.label}-${i}`} className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
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
            <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
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

            <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Strukturmønstre</h4>
              <div className="space-y-3">
                {structureSignals.length > 0 ? (
                  structureSignals.map((signal) => (
                    <div key={signal.code} className="rounded-[14px] border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13px] font-bold text-[#1F2933]">{signal.title}</p>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${structureSignalSeverityClassName(signal.severity)}`}>
                          {formatStructureSignalSeverity(signal.severity)}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#52606D]">{signal.detail}</p>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#7B8794]">{signal.source}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen tydelige strukturmønstre er bygget ut ennå.</p>
                )}
              </div>
            </div>

            <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Nettverk</h4>
              <div className="space-y-3">
                {network.length > 0 ? (
                  network.slice(0, 5).map((actor) => (
                    <div key={actor.actorKey} className="rounded-[14px] border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
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
                      <p className="mt-2 text-[12px] leading-relaxed text-[#52606D]">{describeActorContext(actor)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {actor.relatedCompanies.slice(0, 4).map((link) => (
                          <div
                            key={`${actor.actorKey}-${link.orgNumber}`}
                            className="flex items-center gap-2 rounded-full border border-[#D9E2EC] bg-white px-3 py-1.5"
                          >
                            <span className={`size-2 rounded-full ${scoreDotClass(link.scoreColor)}`} />
                            <span className={`text-[11px] font-bold ${networkRiskTextClass(link.scoreColor)}`}>
                              {link.companyName}
                            </span>
                            <span className="rounded-full bg-[#F0F4F8] px-2 py-0.5 text-[10px] font-semibold text-[#52606D]">
                              {compactRiskLabel(link.scoreColor)}
                            </span>
                            {link.bankruptcySignal ? (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                Konkurs
                              </span>
                            ) : null}
                            {link.dissolvedSignal ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Avviklet
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen nettverksdata bygget opp ennå.</p>
                )}
              </div>
            </div>

            <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Historikk</h4>
              <div className="space-y-3">
                {history.length > 0 ? (
                  history.slice(0, 6).map((entry, index) => (
                    <div key={`${entry.capturedAt}-${index}`} className="rounded-[14px] border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[13px] font-bold text-[#1F2933]">{entry.summary}</p>
                          <p className="mt-1 text-[12px] font-medium text-[#52606D]">
                            {entry.organizationForm ?? "Ukjent org.form"}{entry.naceCode ? ` · ${entry.naceCode}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[12px] font-bold text-[#52606D]">{formatDateTime(entry.capturedAt)}</p>
                          <p className="mt-1 text-[11px] font-medium text-[#52606D]">
                            {entry.scoreColor === "GREEN" ? "Ingen varselflagg" : entry.scoreColor === "YELLOW" ? "Begrenset info" : "Alvorlige signaler"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen lagret historikk ennå. Historikk bygges opp når selskapet åpnes over tid.</p>
                )}
              </div>
            </div>

            <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Registrerte hendelser</h4>
              <div className="space-y-3">
                {events.length > 0 ? (
                  events.slice(0, 8).map((event, index) => (
                    <div key={`${event.type}-${event.date}-${index}`} className="rounded-[14px] border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[13px] font-bold text-[#1F2933]">{event.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-medium text-[#52606D]">{formatEventType(event.type)}</p>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${eventSeverityClassName(event.severity)}`}>
                              {formatEventSeverity(event.severity)}
                            </span>
                          </div>
                        </div>
                        <p className="whitespace-nowrap text-[12px] font-medium text-[#52606D]">{event.date ?? "Udatert"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen registrerte hendelser funnet.</p>
                )}
              </div>
            </div>

            <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
              <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Registerspor bak vurderingen</h4>
              <div className="flex flex-wrap gap-2">
                {scoreEvidence.length > 0 ? (
                  scoreEvidence.map((item) => (
                    <Badge key={`${item.label}-${item.source}`} variant="outline" className="rounded-md border-[#D9E2EC] bg-[#FFFFFF] text-[11px] font-medium text-[#52606D]">
                      {item.label}
                    </Badge>
                  ))
                ) : (
                  <p className="text-[14px] text-[#52606D]">Ingen tydelige signaler trekker vurderingen i en bestemt retning.</p>
                )}
              </div>
            </div>

            <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
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
      ) : null}
    </div>
  );
}

const scoreColors = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-500",
  RED: "bg-rose-500",
};

function DetailDataPoint({ icon: Icon, label, value, isLink }: { icon: any; label: string; value: string; isLink?: boolean }) {
  return (
    <div className="rounded-[16px] border border-[#D9E2EC] bg-white p-4">
      <div className="flex items-start gap-3.5">
        <div className="mt-1 rounded-lg border border-[#E4E7EB] bg-[#F0F4F8] p-2 text-[#52606D]">
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
  icon: any;
  label: string;
  value: string | null;
  subvalue?: string | null;
  href?: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg border border-[#E4E7EB] bg-[#F0F4F8] p-2 text-[#52606D]">
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
    return "Denne rolleholderen er knyttet til virksomheter med både konkurs- og avviklingsspor, noe som gjør aktørkonteksten særlig relevant.";
  }
  if (actor.bankruptcyCompanyCount > 0) {
    return "Denne rolleholderen er knyttet til virksomheter med konkursmarkering, noe som gir et tydelig historisk faresignal.";
  }
  if (actor.redCompanyCount > 0 && actor.dissolvedCompanyCount > 0) {
    return "Denne rolleholderen er knyttet til flere virksomheter med både røde signaler og avvikling, noe som gjør aktørkonteksten særlig relevant.";
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

function buildResultsSummary(
  daysFilter: string,
  countyFilter: string,
  organizationFormFilter: string,
  organizationForms: string[],
  selectedLegend: keyof typeof legendDetails | null,
  selectedStructureSignal: string,
) {
  const days = daysFilter || "30";
  const timePart = days === "0" ? "Alle data" : `Siste ${days} dager`;
  const countyPart = countyFilter ? `i ${countyFilter}` : "i hele landet";
  const organizationFormLabel = organizationForms.find((item) => item.startsWith(`${organizationFormFilter} - `));
  const formPart = organizationFormFilter
    ? `for ${organizationFormLabel ?? organizationFormFilter}`
    : "";
  const signalPart = selectedLegend ? `med ${legendDetails[selectedLegend].title.toLowerCase()}` : "";
  const structurePart = selectedStructureSignal
    ? `med ${structureSignalLabels[selectedStructureSignal]?.toLowerCase() ?? selectedStructureSignal.toLowerCase()}`
    : "";

  return [timePart, countyPart, formPart, signalPart, structurePart].filter(Boolean).join(" ");
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
