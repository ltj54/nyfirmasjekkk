"use client";

import { useEffect, useState, useTransition } from "react";
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
} from "lucide-react";

import type {
  CompanyDetails,
  CompanySummary,
  MetadataFiltersResponse,
} from "@/lib/company-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const dayOptions = ["30", "90", "180", "365"];

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

export function CompanyCheckShell() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<CompanySummary[]>([]);
  const [metadata, setMetadata] = useState<MetadataFiltersResponse>({
    organizationForms: [],
    counties: [],
    scores: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [daysFilter, setDaysFilter] = useState("30");
  const [countyFilter, setCountyFilter] = useState("");
  const [organizationFormFilter, setOrganizationFormFilter] = useState("");
  const [selectedLegend, setSelectedLegend] = useState<keyof typeof legendDetails | null>(null);
  const [, startTransition] = useTransition();

  // Fetch recent companies on mount
  useEffect(() => {
    void fetchFilters();
    void fetchRecent();
  }, []);

  async function fetchFilters() {
    try {
      const response = await fetch("/api/company-check/filters", {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as MetadataFiltersResponse;
      setMetadata(data);
    } catch (err) {
      console.error("Failed to fetch filters", err);
    }
  }

  async function fetchRecent() {
    const params = new URLSearchParams();
    params.set("dager", daysFilter);
    if (countyFilter) params.set("county", countyFilter);
    if (organizationFormFilter) params.set("organizationForm", organizationFormFilter);

    try {
      const response = await fetch(`/api/company-check/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecentCompanies(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent companies", err);
    }
  }

  useEffect(() => {
    if (!selectedCompany) {
      void fetchRecent();
    }
  }, [daysFilter, countyFilter, organizationFormFilter, selectedCompany]);

  async function handleSearch(term: string) {
    const trimmedTerm = term.trim();
    if (!trimmedTerm && !countyFilter && !organizationFormFilter) return;

    setError(null);
    setIsLoading(true);

    try {
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
      const endpoint = isOrgNumber 
        ? `/api/company-check/${trimmedTerm}`
        : `/api/company-check/search?${params.toString()}`;
      
      const response = await fetch(endpoint, {
        cache: "no-store",
      });

      const payload = await response.json();

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

  const filteredCompanies = selectedLegend
    ? recentCompanies.filter((company) => company.scoreColor === selectedLegend)
    : recentCompanies;
  const resultsSummary = buildResultsSummary(
    daysFilter,
    countyFilter,
    organizationFormFilter,
    metadata.organizationForms,
    selectedLegend,
  );

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-[#064e3b]/10">
      {/* Navigation */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setSelectedCompany(null)}>
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#064e3b] font-bold text-white shadow-sm">
              N
            </div>
            <span className="text-xl font-bold tracking-tight text-[#171717]">
              NyFirmasjekk
            </span>
          </div>
          <div className="hidden items-center gap-8 text-[13px] font-semibold text-[#737373] md:flex">
            <a className="hover:text-[#171717] transition-colors" href="#">Om vurderingen</a>
            <a className="hover:text-[#171717] transition-colors" href="#">Datakilder</a>
            <a className="hover:text-[#171717] transition-colors" href="#">API & Data</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-[13px] font-semibold text-[#737373]">Logg inn</Button>
          <Button className="rounded-full bg-[#064e3b] px-5 text-[13px] font-semibold text-white hover:bg-[#065f46]">Kom i gang</Button>
        </div>
      </nav>

      <main>
        {/* Hero & Search */}
        <section className={`mx-auto flex flex-col items-center px-6 transition-all duration-700 ${selectedCompany ? 'pt-12 pb-12' : 'pt-24 pb-20'}`}>
          {!selectedCompany && (
            <div className="text-center animate-in fade-in slide-in-from-top-4 duration-1000">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#064e3b]/5 px-3 py-1 text-[12px] font-bold text-[#064e3b]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#064e3b] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#064e3b]"></span>
                </span>
                Sanntidsoppdatert fra BRREG
              </span>
              <h1 className="mb-6 text-5xl font-extrabold tracking-tight text-[#171717] sm:text-6xl lg:text-7xl">
                Sjekk nye firmaer <br />
                <span className="text-[#064e3b]">på sekunder.</span>
              </h1>
              <p className="mb-12 max-w-2xl text-lg font-medium text-[#737373]">
                Umiddelbar risikoanalyse av norske virksomheter basert på <br className="hidden sm:block" />
                åpne registerdata og smarte algoritmer.
              </p>
            </div>
          )}

          {/* Search Container */}
          <div className={`w-full max-w-2xl transition-all duration-500 ${selectedCompany ? 'scale-95 opacity-90' : ''}`}>
            <div className="group relative rounded-[28px] bg-white p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#eeeeee] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <form className="flex items-center gap-2 px-2" onSubmit={handleSubmit}>
                <div className="flex flex-1 items-center gap-4 px-4">
                  <Search className="size-5 text-[#a3a3a3] group-focus-within:text-[#064e3b] transition-colors" />
                  <input
                    className="h-14 w-full bg-transparent text-lg font-medium outline-none placeholder:text-[#a3a3a3]"
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Søk på firmanavn eller org.nummer…"
                    type="text"
                    value={searchTerm}
                  />
                </div>
                <Button
                  className="h-12 rounded-full bg-[#064e3b] px-8 text-[15px] font-bold text-white hover:bg-[#065f46] shadow-lg shadow-[#064e3b]/10 transition-all active:scale-95"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? "Søker..." : "Søk"}
                </Button>
              </form>
            </div>

            {!selectedCompany && (
              <div className="mt-8 flex flex-wrap justify-center gap-3 animate-in fade-in duration-1000 delay-300">
                <label className="flex items-center rounded-full border border-[#e5e5e5] bg-white pr-4 text-[13px] font-bold text-[#525252] transition-all hover:border-[#064e3b] hover:text-[#064e3b] hover:shadow-md">
                  <select
                    aria-label="Siste 30 dager"
                    className="rounded-full bg-transparent px-5 py-2 outline-none"
                    onChange={(event) => setDaysFilter(event.target.value)}
                    value={daysFilter}
                  >
                    <option value="">Siste 30 dager</option>
                    {dayOptions.map((option) => (
                      <option key={option} value={option}>
                        {option} dager
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center rounded-full border border-[#e5e5e5] bg-white pr-4 text-[13px] font-bold text-[#525252] transition-all hover:border-[#064e3b] hover:text-[#064e3b] hover:shadow-md">
                  <select
                    aria-label="Alle fylker"
                    className="rounded-full bg-transparent px-5 py-2 outline-none"
                    onChange={(event) => setCountyFilter(event.target.value)}
                    value={countyFilter}
                  >
                    <option value="">Alle fylker</option>
                    {metadata.counties.map((county) => (
                      <option key={county} value={county}>
                        {county}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center rounded-full border border-[#e5e5e5] bg-white pr-4 text-[13px] font-bold text-[#525252] transition-all hover:border-[#064e3b] hover:text-[#064e3b] hover:shadow-md">
                  <select
                    aria-label="Alle org.former"
                    className="rounded-full bg-transparent px-5 py-2 outline-none"
                    onChange={(event) => setOrganizationFormFilter(event.target.value)}
                    value={organizationFormFilter}
                  >
                    <option value="">Alle org.former</option>
                    {metadata.organizationForms.map((organizationForm) => {
                      const code = organizationForm.split(" - ")[0];
                      return (
                        <option key={organizationForm} value={code}>
                          {organizationForm}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>
            )}
          </div>

          {!selectedCompany && (
            <div className="mt-16 flex flex-col items-center gap-5 animate-in fade-in duration-1000 delay-500">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-[12px] font-bold uppercase tracking-widest text-[#a3a3a3]">
              {legend.map((item) => (
                <button
                  key={item.status}
                  className={`flex items-center gap-3 rounded-full border px-4 py-2 transition-all ${
                    selectedLegend === item.status
                      ? "border-[#d9d4c7] bg-white text-[#171717] shadow-sm"
                      : "border-transparent bg-transparent hover:border-[#e7e2d8] hover:bg-white/80 hover:text-[#525252]"
                  }`}
                  onClick={() =>
                    setSelectedLegend((current) =>
                      current === item.status ? null : (item.status as keyof typeof legendDetails)
                    )
                  }
                  type="button"
                >
                  <span className={`size-2.5 rounded-full ${item.color} shadow-sm`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {selectedLegend && (
              <div className="max-w-2xl rounded-[24px] border border-[#ece6da] bg-white/90 px-6 py-5 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)] backdrop-blur-sm">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#a3a3a3]">
                  {legendDetails[selectedLegend].title}
                </p>
                <p className="text-[14px] font-medium leading-relaxed text-[#626262]">
                  {legendDetails[selectedLegend].text}
                </p>
              </div>
            )}
            </div>
          )}
        </section>

        {/* Dynamic Content */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          {error && (
            <div className="mx-auto max-w-2xl rounded-2xl bg-rose-50 p-4 text-center border border-rose-100 text-rose-700 animate-in zoom-in duration-300">
              <AlertCircle className="mx-auto mb-2 size-6" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {selectedCompany ? (
            <CompanyDetailView company={selectedCompany} />
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#171717]">Nye selskaper</h2>
                  <p className="text-[14px] font-medium text-[#737373]">{resultsSummary}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="rounded-full border-[#e5e5e5] font-bold text-[#171717]"
                  onClick={() => void fetchRecent()}
                >
                  Se alle
                </Button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company) => (
                    <CompanyCard
                      key={company.orgNumber}
                      company={company}
                      onClick={() => handleSearch(company.orgNumber)}
                    />
                  ))
                ) : (
                  <div className="col-span-full rounded-[26px] border border-[#ece6da] bg-white/90 px-6 py-10 text-center shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#a3a3a3]">
                      Ingen treff
                    </p>
                    <p className="text-[15px] font-medium leading-relaxed text-[#626262]">
                      Vi fant ingen selskaper som matcher denne perioden og denne signaltypen.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      {!selectedCompany && (
        <footer className="border-t border-[#eeeeee] bg-white py-16">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <p className="mb-4 text-[14px] font-bold text-[#171717]">NyFirmasjekk</p>
            <p className="mx-auto max-w-xl text-[12px] leading-relaxed text-[#a3a3a3]">
              Dette er en automatisert analyse basert på åpne data fra Enhetsregisteret og Foretaksregisteret.
              Vurderingene er veiledende og utgjør ikke en fullstendig kredittsjekk eller juridisk rådgivning.
            </p>
          </div>
        </footer>
      )}
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
      className="group cursor-pointer rounded-2xl border border-[#eeeeee] bg-white p-5 transition-all hover:border-[#064e3b]/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`size-3 rounded-full ${colorClass} shadow-sm`} />
        <Badge variant="outline" className="rounded-md border-[#f0f0f0] bg-[#fafafa] px-2 py-0 text-[10px] font-bold text-[#737373]">
          {company.organizationForm}
        </Badge>
      </div>
      <h3 className="mb-1 line-clamp-1 text-[15px] font-bold text-[#171717] group-hover:text-[#064e3b] transition-colors">
        {company.name}
      </h3>
      <p className="mb-4 text-[12px] font-mono font-medium text-[#a3a3a3]">{company.orgNumber}</p>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#737373]">
          <MapPin className="size-3.5" />
          <span>{company.municipality || "Ukjent sted"}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#737373]">
          <CalendarDays className="size-3.5" />
          <span>{company.registrationDate || "Nylig"}</span>
        </div>
      </div>
    </div>
  );
}

function CompanyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-5 animate-pulse">
      <div className="mb-4 flex justify-between">
        <div className="size-3 rounded-full bg-gray-100" />
        <div className="h-4 w-12 rounded bg-gray-100" />
      </div>
      <div className="mb-2 h-5 w-3/4 rounded bg-gray-100" />
      <div className="mb-4 h-4 w-1/2 rounded bg-gray-100" />
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-gray-50" />
        <div className="h-3 w-2/3 rounded bg-gray-50" />
      </div>
    </div>
  );
}

function CompanyDetailView({ company }: { company: CompanyDetails }) {
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

  return (
    <div className="detail-shell mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="detail-panel overflow-hidden rounded-[32px] border border-white/70">
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${config.wash}`} />
        {/* Header Section */}
        <div className="relative p-8 md:p-12">
          <div className="mb-8 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-5">
              <div className={`flex size-16 items-center justify-center rounded-[22px] ${config.text} border shadow-sm`}>
                <StatusIcon className="size-8" />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#a3a3a3]">
                  Registerbasert vurdering
                </p>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#171717] md:text-4xl">
                  {company.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-3 text-[13px] font-bold text-[#737373]">
                  <span className="font-mono bg-[#fafafa] px-2 py-0.5 rounded border border-[#f0f0f0]">
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
              <div className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[14px] font-extrabold ${config.text} border`}>
                {scoreLabel}
              </div>
              <p className="max-w-xs text-[13px] font-medium leading-relaxed text-[#737373] md:text-right">
                En rask indikasjon basert på offentlige registerspor, roller og grunnleggende virksomhetsdata.
              </p>
            </div>
          </div>

          <Separator className="bg-[#f5f5f5]" />

          {/* Quick Facts Grid */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
          <div className={`mt-12 rounded-[28px] border p-7 ${config.text} border-opacity-50`}>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.24em] opacity-70">
              Kort oppsummert
            </p>
            <p className="text-[16px] font-semibold leading-relaxed">
              {primaryReason}
            </p>
          </div>
        </div>

        {/* Roles Section */}
        <div className="bg-[linear-gradient(180deg,#f8f7f4_0%,#f4f4f1_100%)] p-8 md:p-12 border-t border-[#eeeeee]">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#a3a3a3]">Personer og ansvar</p>
              <h3 className="text-[18px] font-extrabold text-[#171717]">Sentrale roller</h3>
            </div>
            <p className="hidden max-w-sm text-right text-[13px] font-medium leading-relaxed text-[#737373] md:block">
              Roller gir et raskt bilde av hvem som faktisk står synlig bak virksomheten i åpne registerdata.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {company.roles && company.roles.length > 0 ? (
              company.roles.map((role, i) => (
                <div key={i} className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3]">{role.type}</p>
                  <p className="text-[14px] font-bold text-[#171717]">{role.name}</p>
                </div>
              ))
            ) : (
              <p className="text-sm italic text-[#a3a3a3]">Ingen roller funnet i åpne data.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6 md:grid-cols-2">
        {scoreReasons.slice(1).map((reason, i) => (
          <div key={i} className="insight-card rounded-[26px] border border-white/80 p-6">
            <div className="mb-3 flex items-center gap-2">
              <div className={`size-2 rounded-full ${scoreColors[company.scoreColor] || scoreColors.YELLOW}`} />
              <h4 className="text-[14px] font-bold text-[#171717]">{analysisTitles[i % analysisTitles.length]}</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-[#737373] font-medium">
              {softenReason(reason)}
            </p>
          </div>
        ))}
        </div>

        <div className="space-y-6">
        <div className="insight-card rounded-[26px] border border-white/80 p-6">
          <h4 className="mb-4 text-[14px] font-bold text-[#171717]">Det som påvirker vurderingen</h4>
          <div className="flex flex-wrap gap-2">
            {triggeredRules.length > 0 ? (
              triggeredRules.map((rule) => (
                <Badge key={rule} variant="outline" className="border-[#e5e5e5] bg-[#fafafa] text-[11px] font-bold text-[#525252]">
                  {formatRuleLabel(rule)}
                </Badge>
              ))
            ) : (
              <p className="text-[14px] text-[#737373]">Ingen tydelige signaler trekker vurderingen i en bestemt retning.</p>
            )}
          </div>
        </div>

        <div className="insight-card rounded-[26px] border border-white/80 p-6">
          <h4 className="mb-4 text-[14px] font-bold text-[#171717]">Hvordan vi vurderer</h4>
          <div className="space-y-3">
            {modelRules.map((rule) => (
              <p key={rule} className="text-[14px] leading-relaxed text-[#737373] font-medium">
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
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3.5">
      <div className="mt-1 rounded-xl bg-[#faf8f1] p-2 text-[#8b7355] border border-[#f2eadc]">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#a3a3a3]">
          {label}
        </p>
        <p className={`text-[14px] font-bold text-[#171717] ${isLink && value.includes('.') ? 'text-[#064e3b] underline underline-offset-4' : ''}`}>
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
  selectedLegend: keyof typeof legendDetails | null,
) {
  const days = daysFilter || "30";
  const countyPart = countyFilter ? `i ${countyFilter}` : "i hele landet";
  const organizationFormLabel = organizationForms.find((item) => item.startsWith(`${organizationFormFilter} - `));
  const formPart = organizationFormFilter
    ? `for ${organizationFormLabel ?? organizationFormFilter}`
    : "";
  const signalPart = selectedLegend ? `med ${legendDetails[selectedLegend].title.toLowerCase()}` : "";

  return [`Siste ${days} dager`, countyPart, formPart, signalPart].filter(Boolean).join(" ");
}
