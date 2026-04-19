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
} from "lucide-react";

import type {
  Announcement,
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

const ruleLabels: Record<string, string> = {
  ALDER: "Selskapet er nytt",
  KONTAKTDATA: "Kontaktopplysninger mangler eller er begrensede",
  TELEFON: "Telefonopplysninger mangler",
  NAERINGSKODE: "Næringskode mangler eller er utydelig",
  AKTIVITET: "Aktivitetsbeskrivelse mangler",
  DATAKVALITET: "Det finnes få grunnopplysninger i registeret",
  ROLLER: "Ledelse eller roller er ufullstendige",
  AKTORRISIKO: "Tilknyttede aktører har urovekkende historikk",
  ALVORLIGE_REGISTRERINGSSIGNALER: "Alvorlige registreringssignaler er funnet",
  REGISTRERING: "Virksomheten er registrert",
  ORGANISASJONSNUMMER: "Virksomheten finnes i registeret",
};

const analysisTitles = [
  "Vår vurdering",
  "Verdt å merke seg",
  "Offentlig signal",
  "Bak vurderingen",
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
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [listLoadProgress, setListLoadProgress] = useState(0);
  const [listLoadSeconds, setListLoadSeconds] = useState(0);
  const [daysFilter, setDaysFilter] = useState("0");
  const [countyFilter, setCountyFilter] = useState("");
  const [organizationFormFilter, setOrganizationFormFilter] = useState("");
  const [selectedLegend, setSelectedLegend] = useState<keyof typeof legendDetails | null>(null);
  const [onlyWithoutWebsite, setOnlyWithoutWebsite] = useState(true);
  const [selectedCompanyAnnouncements, setSelectedCompanyAnnouncements] = useState<Announcement[]>([]);
  const [selectedCompanyHistory, setSelectedCompanyHistory] = useState<CompanyHistoryEntry[]>([]);
  const [selectedCompanyNetwork, setSelectedCompanyNetwork] = useState<NetworkActor[]>([]);
  const [page, setPage] = useState(0);
  const [, startTransition] = useTransition();
  const latestListRequestId = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
      onlyWithoutWebsite?: boolean;
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
    const effectiveOnlyWithoutWebsite = overrides?.onlyWithoutWebsite ?? onlyWithoutWebsite;
    const params = new URLSearchParams();
    params.set("dager", effectiveDaysFilter);
    params.set("page", pageNum.toString());
    if (query) params.set("q", query);
    if (effectiveCountyFilter) params.set("county", effectiveCountyFilter);
    if (effectiveOrganizationFormFilter) params.set("organizationForm", effectiveOrganizationFormFilter);
    if (effectiveSelectedLegend) params.set("score", effectiveSelectedLegend);
    params.set("utenNettside", String(effectiveOnlyWithoutWebsite));

    try {
      const response = await fetch(`/api/company-check/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (requestId !== latestListRequestId.current) {
          return;
        }
        const items = Array.isArray(data) ? data : data.items || [];
        setRecentCompanies(items);
        setPage(pageNum);
        setError(null);
      } else if (response.status === 502) {
        const payload = await response.json().catch(() => null);
        if (requestId !== latestListRequestId.current) {
          return;
        }
        setRecentCompanies([]);
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
  }, [backendReady, initialResultsReady, daysFilter, countyFilter, organizationFormFilter, selectedLegend, onlyWithoutWebsite, selectedCompany, activeQuery]);

  useEffect(() => {
    if (!backendReady || !selectedCompany) {
      setSelectedCompanyAnnouncements([]);
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

        setSelectedCompanyAnnouncements(Array.isArray(eventsPayload) ? (eventsPayload as Announcement[]) : []);
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
      params.set("utenNettside", String(onlyWithoutWebsite));
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
    setSelectedCompany(null);
    setSelectedLegend(null);
    setOnlyWithoutWebsite(true);
    setActiveQuery("");
    setSearchTerm("");
    scrollToSection("search");
    searchInputRef.current?.focus();
    void fetchRecent(0, "", {
      selectedLegend: null,
      onlyWithoutWebsite: true,
    });
  }

  function focusSearch() {
    scrollToSection("search");
    searchInputRef.current?.focus();
  }

  const filteredCompanies = selectedLegend
    ? recentCompanies.filter((company) => company.scoreColor === selectedLegend)
    : recentCompanies;
  const resultsSummary = buildResultsSummary(
    daysFilter,
    countyFilter,
    organizationFormFilter,
    metadata.organizationForms,
    onlyWithoutWebsite,
    selectedLegend,
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
        <section id="search" className="mx-auto max-w-7xl px-6 pt-6 sm:pt-8">
          <div className="grid gap-4">
            <div className="rounded-[22px] border border-[#D9E2EC] bg-white px-5 py-6 sm:px-7 sm:py-7">
              <p className="text-[12px] font-medium text-[#52606D]">Offentlig virksomhetssøk</p>
              <div className="mt-3 max-w-2xl">
                <h1 className="text-3xl font-semibold tracking-tight text-[#1F2933] sm:text-4xl">
                  Søk i virksomhetsopplysninger
                </h1>
                <p className="mt-3 text-[15px] leading-7 text-[#52606D]">
                  Finn norske virksomheter, se åpne registersignaler og filtrer på organisasjonsform eller fylke når du trenger et raskt førsteinntrykk.
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
                    {!backendReady ? "Starter..." : isLoading ? "Søker..." : "Søk"}
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
                        scrollToSection("results");
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
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    onlyWithoutWebsite
                      ? "border-[#2F6FB2] bg-[#E6F0FA] text-[#1F5FA9]"
                      : "border-[#D9E2EC] bg-white text-[#52606D] hover:border-[#2F6FB2] hover:text-[#1F2933]"
                  }`}
                >
                  <input
                    checked={onlyWithoutWebsite}
                    className="size-4 rounded border-[#D9E2EC] accent-[#1F5FA9]"
                    onChange={(event) => {
                      setOnlyWithoutWebsite(event.target.checked);
                      scrollToSection("results");
                    }}
                    type="checkbox"
                  />
                  <span>Søkeresultat uten nettside</span>
                </label>
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
                        scrollToSection("results");
                      }}
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] font-medium text-[#1F5FA9]">
                <button className="hover:underline" onClick={() => scrollToSection("results")} type="button">
                  Åpne treff
                </button>
                <button
                  className="hover:underline"
                  onClick={() => {
                    setCountyFilter("");
                    setOrganizationFormFilter("");
                    setSelectedLegend(null);
                    setOnlyWithoutWebsite(true);
                    scrollToSection("search");
                  }}
                  type="button"
                >
                  Nullstill filtre
                </button>
              </div>

              <p className="mt-4 text-[12px] leading-6 text-[#52606D]">
                Data fra BRREG. Vurderingene er veiledende og skal brukes som første signal.
              </p>
            </div>

          </div>
        </section>

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
              announcements={selectedCompanyAnnouncements.length > 0 ? selectedCompanyAnnouncements : selectedCompany.announcements}
              history={selectedCompanyHistory}
              network={selectedCompanyNetwork}
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
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#1F2933]">Søkeresultater</h2>
                  <p className="mt-1 text-[14px] font-medium leading-6 text-[#52606D]">{resultsSummary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0 || isLoading || isListLoading}
                      onClick={() => void fetchRecent(page - 1)}
                    >
                      Forrige
                    </Button>
                    <span className="text-sm font-medium">Side {page + 1}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={recentCompanies.length < 100 || isLoading || isListLoading}
                      onClick={() => void fetchRecent(page + 1)}
                    >
                      Neste
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full border-[#D9E2EC] font-bold text-[#1F2933]"
                    disabled={isListLoading}
                    onClick={() => void fetchRecent(0)}
                  >
                    {isListLoading ? "Laster..." : "Oppdater"}
                  </Button>
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
                          setSearchTerm("");
                          setCountyFilter("");
                          setOrganizationFormFilter("");
                          setSelectedLegend(null);
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
                  Analyse av åpne registerdata fra Enhetsregisteret og Foretaksregisteret. Vurderingene er veiledende og erstatter ikke manuell kontroll.
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
  
  const colorClass = scoreColors[company.scoreColor] || scoreColors.YELLOW;

  return (
    <div
      className="group cursor-pointer rounded-[18px] border border-[#D9E2EC] bg-white p-4 transition-colors hover:border-[#2F6FB2]"
      onClick={onClick}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`size-3 rounded-full ${colorClass} shadow-sm`} />
        <Badge variant="outline" className="rounded-md border-[#D9E2EC] bg-[#F0F4F8] px-2 py-0 text-[10px] font-medium text-[#52606D]">
          {company.organizationForm}
        </Badge>
      </div>
      <h3 className="mb-1 line-clamp-1 text-[15px] font-semibold text-[#1F2933] transition-colors group-hover:text-[#1F5FA9]">
        {company.name}
      </h3>
      <p className="mb-4 text-[12px] font-mono font-medium text-[#52606D]">{company.orgNumber}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
          <MapPin className="size-3.5" />
          <span>{company.municipality || "Ukjent sted"}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#52606D]">
          <CalendarDays className="size-3.5" />
          <span>{company.registrationDate || "Nylig"}</span>
        </div>
      </div>
    </div>
  );
}

function CompanyDetailView({
  company,
  announcements,
  history,
  network,
}: {
  company: CompanyDetails;
  announcements: Announcement[];
  history: CompanyHistoryEntry[];
  network: NetworkActor[];
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
  const triggeredRules = company.score?.rulesTriggered || [];
  const primaryReason = scoreReasons.length > 0 ? scoreReasons[0] : "Ingen begrunnelse oppgitt.";
  const historyPatterns = analyzeHistoryPatterns(history);

  return (
    <div className="detail-shell mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                  Registerbasert vurdering
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
                En rask indikasjon basert på offentlige registerspor, roller og grunnleggende virksomhetsdata.
              </p>
            </div>
          </div>

          <Separator className="bg-[#E4E7EB]" />

          {/* Quick Facts Grid */}
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

          {/* Summary Box */}
          <div className={`mt-8 rounded-[18px] border p-5 ${config.text} border-opacity-50`}>
            <p className="mb-2 text-[12px] font-medium opacity-70">
              Kort oppsummert
            </p>
            <p className="text-[15px] font-semibold leading-relaxed">
              {primaryReason}
            </p>
          </div>
        </div>

        {/* Roles Section */}
        <div className="border-t border-[#E4E7EB] bg-[#F0F4F8] p-5 sm:p-6 md:p-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[12px] font-medium text-[#52606D]">Personer og ansvar</p>
              <h3 className="text-[18px] font-semibold text-[#1F2933]">Sentrale roller</h3>
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
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4 md:grid-cols-2">
        {scoreReasons.slice(1).map((reason, i) => (
          <div key={`reason-${i}`} className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className={`size-2 rounded-full ${scoreColors[company.scoreColor] || scoreColors.YELLOW}`} />
              <h4 className="text-[14px] font-semibold text-[#1F2933]">{analysisTitles[i % analysisTitles.length]}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-[#52606D] font-medium">
              {softenReason(reason)}
            </p>
          </div>
        ))}
        </div>

        <div className="space-y-4">
        <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
          <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Utvikling over tid</h4>
          {historyPatterns ? (
            <div className="space-y-3">
              <p className="text-[14px] font-medium leading-relaxed text-[#52606D]">
                {historyPatterns.scoreTrend}
              </p>
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
                    {actor.redCompanyCount} røde · {actor.yellowCompanyCount} gule · {actor.greenCompanyCount} grønne
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actor.relatedCompanies.slice(0, 4).map((link) => (
                      <Badge
                        key={`${actor.actorKey}-${link.orgNumber}`}
                        variant="outline"
                        className={`border-[#D9E2EC] bg-white text-[11px] font-bold ${networkRiskTextClass(link.scoreColor)}`}
                      >
                        {link.companyName}
                      </Badge>
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
            {announcements.length > 0 ? (
              announcements.slice(0, 8).map((announcement, index) => (
                <div key={`${announcement.type}-${announcement.date}-${index}`} className="rounded-[14px] border border-[#E4E7EB] bg-[#FFFFFF] px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-bold text-[#1F2933]">{announcement.title}</p>
                      <p className="mt-1 text-[11px] font-medium text-[#52606D]">
                        {formatAnnouncementType(announcement.type)}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-[12px] font-medium text-[#52606D]">
                      {announcement.date ?? "Udatert"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[14px] text-[#52606D]">Ingen registrerte hendelser funnet.</p>
            )}
          </div>
        </div>

        <div className="insight-card rounded-[18px] border border-[#D9E2EC] p-5">
          <h4 className="mb-4 text-[14px] font-semibold text-[#1F2933]">Det som påvirker vurderingen</h4>
          <div className="flex flex-wrap gap-2">
            {triggeredRules.length > 0 ? (
              triggeredRules.map((rule) => (
                <Badge key={rule} variant="outline" className="rounded-md border-[#D9E2EC] bg-[#FFFFFF] text-[11px] font-medium text-[#52606D]">
                  {formatRuleLabel(rule)}
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
              <p key={rule} className="text-[14px] leading-relaxed text-[#52606D] font-medium">
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

function formatRuleLabel(rule: string) {
  return ruleLabels[rule] ?? rule.replaceAll("_", " ").toLowerCase();
}

function formatAnnouncementType(type: string) {
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

function softenReason(reason: string) {
  return reason
    .replace("Åpne registerdata viser alvorlige forhold som bør sjekkes før samarbeid.", "Det finnes alvorlige registersignaler som bør undersøkes før man går videre.")
    .replace("Det finnes få kontaktopplysninger i åpne registerdata.", "Det er begrenset med kontaktinformasjon i åpne registerdata.")
    .replace("Telefonopplysninger mangler i åpne registerdata.", "Telefoninformasjon er ikke synlig i åpne registerdata.")
    .replace("Bransjeopplysninger mangler eller er uklare.", "Bransjeinformasjonen er mangelfull eller uklar.")
    .replace("Selskapet mangler en tydelig aktivitetsbeskrivelse i åpne data.", "Det er lite offentlig beskrivelse av hva selskapet faktisk gjør.")
    .replace("Rolleopplysninger kunne ikke vurderes i denne visningen.", "Rolleinformasjonen er ikke komplett nok til å vurdere fullt ut her.")
    .replace("Selskapet er helt nytt og har lite historikk.", "Selskapet er helt nytt, så det finnes naturlig nok lite historikk ennå.")
    .replace("Selskapet er forholdsvis nytt og har begrenset historikk.", "Selskapet er fortsatt ungt og har begrenset historikk.")
    .replace("Det finnes lite offentlig informasjon å støtte vurderingen på.", "Det finnes foreløpig lite offentlig informasjon å bygge vurderingen på.")
    .replace("Sentrale rolleopplysninger mangler for en selskapsform som normalt skal ha dem.", "Viktige rolleopplysninger mangler for denne typen selskap.")
    .replace("Ledelse eller sentrale roller er registrert.", "Sentrale roller ser ut til å være registrert.")
    .replace("Ingen tydelige rolleavvik er funnet for denne organisasjonsformen.", "Vi ser ingen tydelige rolleavvik for denne selskapsformen.")
    .replace("Selskapet er registrert i Enhetsregisteret.", "Selskapet finnes i Enhetsregisteret.")
    .replace("Det finnes synlige kontaktopplysninger i registeret.", "Det finnes kontaktopplysninger i registeret.")
    .replace("Telefonopplysninger er registrert.", "Telefonopplysninger er registrert.")
    .replace("Bransje er registrert.", "Bransje er registrert.")
    .replace("Selskapet har en registrert aktivitetsbeskrivelse.", "Selskapet har en registrert aktivitetsbeskrivelse.")
    .replace("Det finnes et greit grunnlag i åpne registerdata.", "Det finnes et greit offentlig grunnlag for vurderingen.");
}

function buildResultsSummary(
  daysFilter: string,
  countyFilter: string,
  organizationFormFilter: string,
  organizationForms: string[],
  onlyWithoutWebsite: boolean,
  selectedLegend: keyof typeof legendDetails | null,
) {
  const days = daysFilter || "30";
  const timePart = days === "0" ? "Alle data" : `Siste ${days} dager`;
  const countyPart = countyFilter ? `i ${countyFilter}` : "i hele landet";
  const websitePart = onlyWithoutWebsite ? "(uten nettside)" : "";
  const organizationFormLabel = organizationForms.find((item) => item.startsWith(`${organizationFormFilter} - `));
  const formPart = organizationFormFilter
    ? `for ${organizationFormLabel ?? organizationFormFilter}`
    : "";
  const signalPart = selectedLegend ? `med ${legendDetails[selectedLegend].title.toLowerCase()}` : "";

  return [timePart, countyPart, websitePart, formPart, signalPart].filter(Boolean).join(" ");
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
