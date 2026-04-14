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
  ChevronDown,
  MapPin,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import type { CompanyDetails, CompanySummary, ScoreColor } from "@/lib/company-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const filters = [
  { id: "days", label: "Siste 30 dager", options: ["30 dager", "90 dager", "180 dager", "365 dager"] },
  { id: "county", label: "Alle fylker", options: ["Oslo", "Viken", "Rogaland", "Vestland", "Trøndelag"] },
  { id: "form", label: "Alle org.former", options: ["AS", "ENK", "ASA", "SA"] },
];

const legend = [
  { status: "GREEN", label: "Ingen varselflagg", color: "bg-emerald-500" },
  { status: "YELLOW", label: "Begrenset info", color: "bg-amber-500" },
  { status: "RED", label: "Alvorlige signaler", color: "bg-rose-500" },
];

export function CompanyCheckShell() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetails | null>(null);
  const [recentCompanies, setRecentCompanies] = useState<CompanySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Fetch recent companies on mount
  useEffect(() => {
    fetchRecent();
  }, []);

  async function fetchRecent() {
    try {
      const response = await fetch("/api/company-check/search?dager=30");
      if (response.ok) {
        const data = await response.json();
        // The old API returns a list, the new one returns a search response
        setRecentCompanies(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error("Failed to fetch recent companies", err);
    }
  }

  async function handleSearch(term: string) {
    if (!term.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/company-check/${term.trim()}`, {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail ?? "Klarte ikke hente selskapsdata.");
      }

      startTransition(() => {
        // Handle both old and new API formats for compatibility during migration
        if (payload.score) {
          setSelectedCompany(payload as CompanyDetails);
        } else {
          // Map old format to new format if necessary, or just use as is for now
          // For simplicity, we assume v1 API is active
          setSelectedCompany(payload as CompanyDetails);
        }
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Noe gikk galt.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

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
                {filters.map((filter) => (
                  <button
                    className="group flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-5 py-2 text-[13px] font-bold text-[#525252] transition-all hover:border-[#064e3b] hover:text-[#064e3b] hover:shadow-md"
                    key={filter.id}
                  >
                    {filter.label}
                    <ChevronDown className="size-3.5 text-[#a3a3a3] group-hover:text-[#064e3b]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {!selectedCompany && (
            <div className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-4 text-[12px] font-bold uppercase tracking-widest text-[#a3a3a3] animate-in fade-in duration-1000 delay-500">
              {legend.map((item) => (
                <div className="flex items-center gap-3" key={item.status}>
                  <span className={`size-2.5 rounded-full ${item.color} shadow-sm`} />
                  <span>{item.label}</span>
                </div>
              ))}
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
                  <p className="text-[14px] font-medium text-[#737373]">Siste 30 dager i hele landet</p>
                </div>
                <Button variant="outline" className="rounded-full border-[#e5e5e5] font-bold text-[#171717]">Se alle</Button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {recentCompanies.length > 0 ? (
                  recentCompanies.map((company) => (
                    <CompanyCard
                      key={company.orgNumber}
                      company={company}
                      onClick={() => handleSearch(company.orgNumber)}
                    />
                  ))
                ) : (
                  Array.from({ length: 8 }).map((_, i) => <CompanyCardSkeleton key={i} />)
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

  return (
    <div
      className="group cursor-pointer rounded-2xl border border-[#eeeeee] bg-white p-5 transition-all hover:border-[#064e3b]/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:-translate-y-1"
      onClick={onClick}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className={`size-3 rounded-full ${scoreColors[company.scoreColor]} shadow-sm`} />
        <Badge variant="outline" className="rounded-md border-[#f0f0f0] bg-[#fafafa] px-2 py-0 text-[10px] font-bold text-[#737373]">
          {company.organizationFormCode}
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
    GREEN: { icon: CheckCircle2, text: "bg-emerald-50 text-emerald-700 border-emerald-100", iconColor: "text-emerald-500" },
    YELLOW: { icon: AlertTriangle, text: "bg-amber-50 text-amber-700 border-amber-100", iconColor: "text-amber-500" },
    RED: { icon: AlertCircle, text: "bg-rose-50 text-rose-700 border-rose-100", iconColor: "text-rose-500" },
  };

  const config = scoreConfig[company.scoreColor];
  const StatusIcon = config.icon;

  return (
    <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-hidden rounded-3xl border border-[#eeeeee] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
        {/* Header Section */}
        <div className="p-8 md:p-12">
          <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <div className={`flex size-14 items-center justify-center rounded-2xl ${config.text} border shadow-sm`}>
                <StatusIcon className="size-8" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#171717]">
                  {company.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-3 text-[13px] font-bold text-[#737373]">
                  <span className="font-mono bg-[#fafafa] px-2 py-0.5 rounded border border-[#f0f0f0]">
                    {company.orgNumber}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    {company.organizationFormCode}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {company.municipality}
                  </span>
                </div>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[14px] font-extrabold ${config.text} border`}>
              {company.score.scoreLabel}
            </div>
          </div>

          <Separator className="bg-[#f5f5f5]" />

          {/* Quick Facts Grid */}
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            <DetailDataPoint icon={CalendarDays} label="Etablert" value={company.registrationDate || "Ukjent"} />
            <DetailDataPoint icon={Landmark} label="Bransje" value={company.naceDescription || "Ikke oppgitt"} />
            <DetailDataPoint icon={Globe} label="Nettside" value={company.hjemmeside || "Ingen registrert"} isLink />
            <DetailDataPoint icon={Mail} label="E-post" value="Ikke tilgjengelig" />
            <DetailDataPoint icon={Phone} label="Telefon" value="Ikke tilgjengelig" />
            <DetailDataPoint icon={MapPin} label="Fylke" value={company.county || "Ukjent"} />
          </div>

          {/* Summary Box */}
          <div className={`mt-12 rounded-2xl p-6 text-[15px] font-medium leading-relaxed ${config.text} border border-opacity-50`}>
            {company.score.scoreReasons[0]}
          </div>
        </div>

        {/* Roles Section */}
        <div className="bg-[#fafafa] p-8 md:p-12 border-t border-[#eeeeee]">
          <h3 className="mb-6 text-[16px] font-extrabold text-[#171717]">Sentrale roller</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {company.roles && company.roles.length > 0 ? (
              company.roles.map((role, i) => (
                <div key={i} className="rounded-xl border border-[#eeeeee] bg-white p-4">
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

      {/* Findings Grid */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {company.score.scoreReasons.slice(1).map((reason, i) => (
          <div key={i} className="rounded-2xl border border-[#eeeeee] bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className={`size-2 rounded-full ${scoreColors[company.scoreColor]}`} />
              <h4 className="text-[14px] font-bold text-[#171717]">Analysepunkt</h4>
            </div>
            <p className="text-[14px] leading-relaxed text-[#737373] font-medium">
              {reason}
            </p>
          </div>
        ))}
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
    <div className="flex items-start gap-3.5">
      <div className="mt-1 rounded-xl bg-[#fafafa] p-2 text-[#a3a3a3] border border-[#f0f0f0]">
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
  );
}
