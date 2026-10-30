"use client";

import { useState } from "react";

import type { WebsiteInspectionResponse } from "@/lib/company-check";
import type { SwedishPilotCompany, SwedishPilotResult, SwedishRecentEnrichment, SwedishSoleEnrichment } from "@/lib/sweden-pilot";
import type { SwedishRecentCompany, SwedishRecentResult, SwedishRecentSoleProprietorship } from "@/lib/sweden-recent";
import { pilotCompaniesWithEmail, recentCompaniesWithEmail, soleProprietorshipsWithEmail } from "@/lib/sweden-lead-visibility";
import type { WebsiteReview, WebsiteReviewStatus } from "@/lib/sweden-websites";
import type { SwedishWebsiteSuggestion } from "@/lib/sweden-website-suggestions";

const RECENT_PAGE_SIZE = 25;

function activityPeriod(company: SwedishPilotCompany): string {
  if (company.statusCode === "1") return company.startDate ? `Aktiv fra ${company.startDate}` : "Aktiv · startdato ikke oppgitt";
  if (company.startDate && company.endDate) return `${company.startDate} – ${company.endDate}`;
  if (company.endDate) return `Avsluttet ${company.endDate}`;
  return company.startDate ?? "Ikke oppgitt";
}

function contactStatusClass(assessment: SwedishPilotCompany["contactAssessment"]): string {
  if (assessment === "eligible") return "bg-emerald-50 text-emerald-800";
  if (assessment === "unknown") return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-800";
}

function contactStatusLabel(assessment: SwedishPilotCompany["contactAssessment"]): string {
  if (assessment === "eligible") return "Kan vurderes";
  if (assessment === "blocked") return "Reservert mot kontakt";
  if (assessment === "inactive") return "Ikke aktiv";
  return "Uavklart – ikke kontakt";
}

function CompanyCard({ company }: Readonly<{ company: SwedishPilotCompany }>) {
  const statusClass = contactStatusClass(company.contactAssessment);
  const statusLabel = contactStatusLabel(company.contactAssessment);
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">{company.name}</h2>
      <p className="mt-1 text-sm text-slate-500">{company.id} · AB · {company.city || "Ukjent sted"}</p>
      <p className={`mt-3 inline-flex rounded px-2 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</p>
      <p className="mt-2 text-xs text-slate-600">{company.contactAssessmentReason}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-slate-500">Registrert i SCBs foretaksregister</dt><dd>{company.registrationDate || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Aktivitetsperiode</dt><dd>{activityPeriod(company)}</dd></div>
        <div><dt className="text-slate-500">E-post i registeret</dt><dd className="break-all">{company.email || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Reservasjon mot e-postreklame</dt><dd>{company.emailReservationLabel}</dd></div>
        <div><dt className="text-slate-500">Generell reklamereservasjon</dt><dd>{company.advertisingReservationLabel}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsstatus</dt><dd>{company.statusLabel}</dd></div>
        <div><dt className="text-slate-500">F-skatt / MVA</dt><dd>{company.fTaxStatusLabel} · {company.vatStatusLabel}</dd></div>
        <div><dt className="text-slate-500">Størrelse</dt><dd>{company.employeeClassLabel} · {company.turnoverClassLabel} · {company.workplaceCount ?? "Ukjent antall"} arbeidssteder</dd></div>
        <div><dt className="text-slate-500">Bransje (SNI 2025)</dt><dd>{company.industryCodes.join(", ") || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Nettside</dt><dd>Ikke undersøkt</dd></div>
      </dl>
    </article>
  );
}

export function SwedenPilot({ configured }: Readonly<{ configured: boolean }>) {
  const [result, setResult] = useState<SwedishPilotResult | null>(null);
  const [recentResult, setRecentResult] = useState<SwedishRecentResult | null>(null);
  const [recentPage, setRecentPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [recentBusy, setRecentBusy] = useState(false);
  const [enrichmentBusy, setEnrichmentBusy] = useState(false);
  const [soleEnrichmentBusy, setSoleEnrichmentBusy] = useState(false);
  const [enriched, setEnriched] = useState<Record<string, SwedishPilotCompany>>({});
  const [soleEnriched, setSoleEnriched] = useState<Record<string, SwedishPilotCompany>>({});
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [soleUnavailable, setSoleUnavailable] = useState<string[]>([]);
  const [websiteReviews, setWebsiteReviews] = useState<Record<string, WebsiteReview>>({});
  const [websiteSuggestions, setWebsiteSuggestions] = useState<Record<string, SwedishWebsiteSuggestion[]>>({});
  const [error, setError] = useState("");
  const [recentError, setRecentError] = useState("");
  const [soleError, setSoleError] = useState("");

  async function loadRecent() {
    setRecentBusy(true);
    setRecentError("");
    try {
      const response = await fetch("/api/sweden-recent", { method: "POST", cache: "no-store" });
      const body = await response.json() as SwedishRecentResult & { error?: string };
      if (response.ok) {
        setRecentResult(body);
        setRecentPage(0);
        setEnriched({});
        setSoleEnriched({});
        setUnavailable([]);
        setSoleUnavailable([]);
        setSoleError("");
        setWebsiteSuggestions({});
        const reviewsResponse = await fetch("/api/sweden-website-reviews", { cache: "no-store" });
        if (reviewsResponse.ok) {
          const reviewsBody = await reviewsResponse.json() as { reviews: Record<string, WebsiteReview> };
          setWebsiteReviews(reviewsBody.reviews);
        }
      } else {
        setRecentError(body.error ?? "Kunne ikke hente nye svenske selskaper.");
      }
    } catch {
      setRecentError("Forbindelsen ble brutt. Prøv igjen når appen er tilgjengelig.");
    } finally {
      setRecentBusy(false);
    }
  }

  async function saveWebsiteReview(input: { orgNumber: string; status: WebsiteReviewStatus; url: string; note: string }): Promise<string | null> {
    try {
      const response = await fetch("/api/sweden-website-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        cache: "no-store",
      });
      const body = await response.json() as { review?: WebsiteReview; error?: string };
      if (!response.ok || !body.review) return body.error ?? "Kunne ikke lagre nettsidevurderingen.";
      setWebsiteReviews((previous) => ({ ...previous, [body.review!.orgNumber]: body.review! }));
      return null;
    } catch {
      return "Forbindelsen ble brutt. Prøv igjen.";
    }
  }

  async function enrichVisiblePage() {
    if (!recentResult || !configured) return;
    const orgNumbers = recentResult.companies.slice(recentPage * RECENT_PAGE_SIZE, (recentPage + 1) * RECENT_PAGE_SIZE)
      .map((company) => company.orgNumber);
    if (orgNumbers.length === 0) return;
    setEnrichmentBusy(true);
    setRecentError("");
    try {
      const response = await fetch("/api/sweden-recent/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgNumbers }),
        cache: "no-store",
      });
      const body = await response.json() as SwedishRecentEnrichment & { error?: string };
      if (!response.ok) {
        setRecentError(body.error ?? "Kunne ikke kontrollere selskapene hos SCB.");
        return;
      }
      setEnriched((previous) => Object.fromEntries([
        ...Object.entries(previous),
        ...body.companies.map((company) => [company.id.slice(3), company] as const),
      ]));
      setUnavailable((previous) => Array.from(new Set([...previous, ...body.unavailableOrgNumbers])));
      setWebsiteSuggestions((previous) => ({ ...previous, ...body.websiteSuggestions }));
    } catch {
      setRecentError("Forbindelsen til SCB ble brutt. Prøv igjen senere.");
    } finally {
      setEnrichmentBusy(false);
    }
  }

  async function enrichSoleProprietorships() {
    if (!recentResult || !configured) return;
    setSoleEnrichmentBusy(true);
    setSoleError("");
    try {
      const response = await fetch("/api/sweden-recent/enrich-sole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutoffDate: recentResult.cutoffDate, sourceFileModifiedAt: recentResult.sourceFileModifiedAt }),
        cache: "no-store",
      });
      const body = await response.json() as SwedishSoleEnrichment & { error?: string };
      if (!response.ok) {
        setSoleError(body.error ?? "Kunne ikke kontrollere E hos SCB.");
        return;
      }
      setSoleEnriched(Object.fromEntries(body.companies.map((company) => [company.id, company])));
      setSoleUnavailable(body.unavailableIds);
    } catch {
      setSoleError("Forbindelsen til SCB ble brutt. Prøv igjen senere.");
    } finally {
      setSoleEnrichmentBusy(false);
    }
  }

  async function loadSample() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/sweden-pilot", { method: "POST", cache: "no-store" });
      const body = await response.json() as SwedishPilotResult & { error?: string };
      if (response.ok) setResult(body);
      else setError(body.error ?? "Kunne ikke hente prøveutvalget.");
    } catch {
      setError("Forbindelsen ble brutt. Prøv igjen når appen er tilgjengelig.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="font-semibold text-slate-900">Nye svenske virksomheter · siste 7 dager</h2>
        <p className="mt-2 text-sm text-slate-700">Henter nye AB og registrerte enkeltpersonforetak (E) fra Bolagsverkets bulkfil. Bare virksomheter med e-post bekreftet hos SCB vises etter kontroll. Dette er ikke kontaktklare leads.</p>
        <button type="button" disabled={recentBusy} onClick={() => void loadRecent()} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{recentBusy ? "Leser registerfil …" : "Hent nye AB og E · siste 7 dager"}</button>
        <p className="mt-3 text-sm text-slate-600">Første gjennomgang av en ny registerfil kan ta et par minutter. Senere hentinger bruker et lokalt utvalg så lenge kildefilen er uendret. E-post og reservasjonsstatus kontrolleres separat hos SCB, kun når du trykker på en kontrollknapp. E-identifikatoren vises ikke og lagres ikke i resultatfilen, men Bolagsverkets nedlastede råfil inneholder personnummer og ligger lokalt. Ingen e-post sendes og ingen oppfølging opprettes.</p>
      </section>
      <div aria-live="polite" aria-busy={recentBusy}>
        {recentError ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{recentError}</p> : null}
        {recentResult ? <SoleResults result={recentResult} enriched={soleEnriched} unavailable={soleUnavailable} configured={configured} busy={soleEnrichmentBusy} error={soleError} onEnrich={() => void enrichSoleProprietorships()} /> : null}
        {recentResult ? <RecentResults result={recentResult} page={recentPage} onPageChange={setRecentPage} enriched={enriched} unavailable={unavailable} configured={configured} enrichmentBusy={enrichmentBusy} onEnrich={() => void enrichVisiblePage()} websiteReviews={websiteReviews} websiteSuggestions={websiteSuggestions} onSaveWebsiteReview={saveWebsiteReview} /> : null}
      </div>
      <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="font-semibold text-slate-900">Teknisk SCB-prøve</h2>
        <p className="mt-2 text-sm text-slate-700">Henting starter bare når du trykker på knappen. Resultatene beholdes i denne visningen til du forlater eller oppdaterer siden. Gjentatt henting kan gi samme utvalg.</p>
        {!configured ? (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <p>SCB godkjente API-tilgangen 27.10.2026. Nøkkelen er mottatt, men er ikke konfigurert i denne lokale installasjonen ennå.</p>
            <p>Legg nøkkelen lokalt i <code>frontend/.env.local</code> som <code>SCB_API_KEY=din_nøkkel</code>, og start frontend på nytt. Nøkkelen skal ikke sendes i chatten, legges i kildekoden eller lagres i Git.</p>
            <p>Ingen automatisk e-post, CRM-registrering eller oppfølging er satt opp.</p>
          </div>
        ) : null}
        <button type="button" disabled={!configured || busy} onClick={() => void loadSample()} className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Henter prøveutvalg …" : "Hent inntil 10 svenske AB"}</button>
        <p className="mt-3 text-sm text-slate-600">SCB oppgir ikke nettside i dette datasettet. Manglende nettadresse betyr derfor ikke at selskapet mangler nettside. Registreringsdatoen gjelder SCBs register og brukes foreløpig ikke til aldersfiltrering. API-et er normalt utilgjengelig under nattlig oppdatering kl. 04.00–04.30.</p>
        <a href="https://www.scb.se/vara-tjanster/bestall-data-och-statistik/foretagsregistret/avgiftsfria-uppgifter-i-foretagsregistret/" target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-blue-800 underline">Om SCBs datakilde og tilgang</a>
      </section>
      <div aria-live="polite" aria-busy={busy}>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p> : null}
        {result ? <PilotResults result={result} /> : null}
      </div>
    </>
  );
}

function websiteReviewLabel(review?: WebsiteReview): string {
  if (review?.status === "confirmed") return "Nettside bekreftet manuelt";
  if (review?.status === "candidate") return "Mulig nettside – ikke bekreftet";
  if (review?.status === "not_found") return "Ikke funnet ved manuell kontroll";
  return "Ingen nettside bekreftet manuelt";
}

function recentLeadStatus(detail: SwedishPilotCompany | undefined, unavailable: boolean): string {
  if (detail) return `${contactStatusLabel(detail.contactAssessment)} – ${detail.contactAssessmentReason}`;
  if (unavailable) return "Ikke funnet hos SCB ennå – ingen e-post eller reservasjon kontrollert";
  return "Ikke SCB-kontrollert – ingen kontakt fra denne listen";
}

function SoleCard({ candidate, detail }: Readonly<{
  candidate: SwedishRecentSoleProprietorship;
  detail: SwedishPilotCompany;
}>) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{candidate.name}</h3>
      <p className="mt-1 text-sm text-slate-500">E · Enskild näringsverksamhet · {candidate.postalCity || "Ukjent sted"}</p>
      <p className={`mt-3 inline-flex rounded px-2 py-1 text-xs font-semibold ${contactStatusClass(detail.contactAssessment)}`}>{contactStatusLabel(detail.contactAssessment)}</p>
      <p className="mt-2 text-xs text-slate-600">{detail.contactAssessmentReason}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-slate-500">Registrert hos Bolagsverket</dt><dd>{candidate.registrationDate}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsbeskrivelse</dt><dd>{candidate.businessDescription || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">E-post hos SCB</dt><dd className="break-all">{detail.email}</dd></div>
        <div><dt className="text-slate-500">Reservasjon mot e-postreklame</dt><dd>{detail.emailReservationLabel}</dd></div>
        <div><dt className="text-slate-500">Generell reklamereservasjon</dt><dd>{detail.advertisingReservationLabel}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsstatus</dt><dd>{detail.statusLabel}</dd></div>
        <div><dt className="text-slate-500">F-skatt / MVA</dt><dd>{detail.fTaxStatusLabel} · {detail.vatStatusLabel}</dd></div>
        <div><dt className="text-slate-500">Størrelse</dt><dd>{detail.employeeClassLabel} · {detail.turnoverClassLabel}</dd></div>
        <div><dt className="text-slate-500">Bransje (SNI 2025)</dt><dd>{detail.industryCodes.join(", ") || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Nettside</dt><dd>Ikke undersøkt</dd></div>
      </dl>
    </article>
  );
}

function SoleResults({ result, enriched, unavailable, configured, busy, error, onEnrich }: Readonly<{
  result: SwedishRecentResult;
  enriched: Record<string, SwedishPilotCompany>;
  unavailable: string[];
  configured: boolean;
  busy: boolean;
  error: string;
  onEnrich: () => void;
}>) {
  const [page, setPage] = useState(0);
  const withEmail = soleProprietorshipsWithEmail(result.soleProprietorships, enriched);
  const checkedCount = result.soleProprietorships.filter((candidate) => Boolean(enriched[candidate.id]) || unavailable.includes(candidate.id)).length;
  const pageCount = Math.max(1, Math.ceil(withEmail.length / RECENT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = withEmail.slice(safePage * RECENT_PAGE_SIZE, (safePage + 1) * RECENT_PAGE_SIZE);
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-semibold text-slate-900">Nye svenske E med e-post</h2>
      <p className="mt-2 text-sm text-slate-600">{result.soleProprietorships.length} E-registreringer fra og med {result.cutoffDate} i Bolagsverkets ukefil. {checkedCount} kontrollert hos SCB · {withEmail.length} med e-post vises. Personnummer vises ikke og legges ikke i resultatfilen; nedlastet råfil inneholder dem. Utvalget omfatter bare E som er registrert hos Bolagsverket, ikke alle svenske enkeltpersonforetak.</p>
      <button type="button" disabled={!configured || busy || result.soleProprietorships.length < 1 || result.soleProprietorships.length > 100}
        onClick={onEnrich} className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Kontrollerer E hos SCB …" : "Kontroller E-post, SNI og reservasjon for E"}
      </button>
      {result.soleProprietorships.length > 100 ? <p className="mt-2 text-sm text-amber-900">Mer enn 100 E-registreringer. Denne prøveversjonen gjør ingen delvise oppslag.</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-800">{error}</p> : null}
      {withEmail.length === 0 ? <p className="mt-3 text-sm text-slate-600">{checkedCount === 0 ? "Ingen E vises før e-post og reservasjon er kontrollert hos SCB." : "Ingen av de kontrollerte E-registreringene har e-post hos SCB."}</p> : null}
      {withEmail.length > 0 ? <div className="mt-4 grid gap-4 md:grid-cols-2">{visible.map((candidate) => <SoleCard key={candidate.id} candidate={candidate} detail={enriched[candidate.id]} />)}</div> : null}
      {pageCount > 1 ? <nav aria-label="Sider med svenske E" className="mt-4 flex items-center gap-3">
        <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Forrige</button>
        <span className="text-sm text-slate-600">Side {safePage + 1} av {pageCount}</span>
        <button type="button" disabled={safePage + 1 >= pageCount} onClick={() => setPage(safePage + 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Neste</button>
      </nav> : null}
      <p className="mt-3 text-xs text-slate-600">E-kontrollen leser hele kildefilen på nytt og kan ta noen minutter. Oppgitt e-post er ikke leveringskontrollert. Ingen e-post sendes eller CRM-sak opprettes her.</p>
    </section>
  );
}

function registerStatus(company: SwedishRecentCompany): string {
  if (company.deregistrationDate) {
    const reason = company.deregistrationReason ? ` · ${company.deregistrationReason}` : "";
    return `Avregistrert ${company.deregistrationDate}${reason} – ikke kontakt`;
  }
  if (company.deregistrationReason) return `Avregistreringsårsak: ${company.deregistrationReason} – ikke kontakt før manuell avklaring`;
  if (company.ongoingProceedings?.length) {
    const proceedings = company.ongoingProceedings.map((item) => {
      const since = item.since ? ` fra ${item.since}` : "";
      return `${item.label}${since}`;
    }).join(", ");
    return `${proceedings} – ikke kontakt før manuell avklaring`;
  }
  return "Ingen avregistrering eller pågående sak oppgitt i ukefilen";
}

function SwedishWebsiteInspection({ review }: Readonly<{ review?: WebsiteReview }>) {
  const [inspection, setInspection] = useState<WebsiteInspectionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (review?.status !== "confirmed" || !review.url) return null;
  async function inspect() {
    if (!review?.url) return;
    setBusy(true);
    setError("");
    setInspection(null);
    try {
      const response = await fetch(`/api/company-check/website-inspection?url=${encodeURIComponent(review.url)}`, { cache: "no-store" });
      if (!response.ok) {
        setError("Nettsidesjekken kunne ikke fullføres. Prøv igjen senere.");
        return;
      }
      setInspection(await response.json() as WebsiteInspectionResponse);
    } catch {
      setError("Nettsidesjekken kunne ikke fullføres. Prøv igjen senere.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm">
      <button type="button" disabled={busy} onClick={() => void inspect()} className="rounded bg-blue-800 px-3 py-2 text-white disabled:opacity-50">{busy ? "Sjekker nettsiden …" : "Sjekk bekreftet nettside"}</button>
      <p className="mt-2 text-xs text-slate-600">Teknisk førstevurdering av adressen du bekreftet manuelt. Ingen e-post sendes. Funn må kontrolleres før de brukes overfor virksomheten.</p>
      {error ? <p role="alert" className="mt-2 text-red-800">{error}</p> : null}
      {inspection ? <div className="mt-3">
        <p className="font-medium">{inspection.websiteQuality.label}: {inspection.websiteQuality.summary}</p>
        {inspection.websiteQuality.signals.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5">{inspection.websiteQuality.signals.slice(0, 6).map((signal) => <li key={signal.code}>{signal.title}: {signal.detail}</li>)}</ul> : null}
        <p className="mt-2 text-xs text-slate-600">Analysen gjelder bare nettsiden, ikke selskapets registerstatus eller sikker tilhørighet utover din manuelle bekreftelse.</p>
      </div> : null}
    </section>
  );
}

function WebsiteReviewEditor({ company, review, onSave }: Readonly<{
  company: SwedishRecentCompany;
  review?: WebsiteReview;
  onSave: (input: { orgNumber: string; status: WebsiteReviewStatus; url: string; note: string }) => Promise<string | null>;
}>) {
  const [status, setStatus] = useState<WebsiteReviewStatus>(review?.status ?? "unchecked");
  const [url, setUrl] = useState(review?.url ?? "");
  const [note, setNote] = useState(review?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsUrl = status === "candidate" || status === "confirmed";
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const failure = await onSave({ orgNumber: company.orgNumber, status, url: needsUrl ? url : "", note });
    if (failure) setError(failure);
    setBusy(false);
  }
  const searchQuery = `${company.name} ${company.orgNumber} webbplats`;
  return (
    <details className="mt-4 border-t border-slate-200 pt-3 text-sm">
      <summary className="cursor-pointer font-medium text-blue-800">Undersøk nettside manuelt</summary>
      <a href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-blue-800 underline">Søk på navn og organisasjonsnummer ↗</a>
      <p className="mt-2 text-xs text-slate-600">Kontroller at treffet faktisk tilhører virksomheten. Et domene fra e-post eller et navneliknende treff er ikke nok alene.</p>
      <form onSubmit={(event) => void submit(event)} className="mt-3 space-y-3">
        <label className="block"><span className="block">Vurdering</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as WebsiteReviewStatus)} className="mt-1 block w-full rounded border border-slate-300 p-2">
            <option value="unchecked">Ikke undersøkt</option>
            <option value="candidate">Mulig treff – ikke bekreftet</option>
            <option value="confirmed">Bekreftet nettside</option>
            <option value="not_found">Ikke funnet ved søk</option>
          </select>
        </label>
        {needsUrl ? <label className="block"><span className="block">Nettsideadresse</span>
          <input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://eksempel.se/" className="mt-1 block w-full rounded border border-slate-300 p-2" />
        </label> : null}
        <label className="block"><span className="block">Grunnlag / notat {status === "confirmed" ? "(påkrevd)" : "(valgfritt)"}</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} required={status === "confirmed"} maxLength={1000} rows={2} className="mt-1 block w-full rounded border border-slate-300 p-2" />
        </label>
        {error ? <p role="alert" className="text-red-800">{error}</p> : null}
        <button type="submit" disabled={busy} className="rounded bg-blue-800 px-3 py-2 text-white disabled:opacity-50">{busy ? "Lagrer …" : "Lagre vurdering lokalt"}</button>
      </form>
    </details>
  );
}

function RecentCompanyCard({ company, detail, unavailable, review, suggestions, onSaveWebsiteReview }: Readonly<{
  company: SwedishRecentCompany;
  detail?: SwedishPilotCompany;
  unavailable: boolean;
  review?: WebsiteReview;
  suggestions: SwedishWebsiteSuggestion[];
  onSaveWebsiteReview: (input: { orgNumber: string; status: WebsiteReviewStatus; url: string; note: string }) => Promise<string | null>;
}>) {
  const registerNeedsReview = Boolean(company.deregistrationDate || company.deregistrationReason || company.ongoingProceedings?.length);
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{company.name}</h3>
      <p className="mt-1 text-sm text-slate-500">SE:{company.orgNumber} · AB · {company.postalCity || "Ukjent sted"}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-slate-500">Registrert hos Bolagsverket</dt><dd>{company.registrationDate}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsbeskrivelse</dt><dd>{company.businessDescription || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">E-post hos SCB</dt><dd className="break-all">{detail?.email || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Registerstatus fra Bolagsverket</dt><dd>{registerStatus(company)}</dd></div>
        <div><dt className="text-slate-500">Leadstatus</dt><dd>{registerNeedsReview ? "Ikke kontakt – registerstatus må avklares" : recentLeadStatus(detail, unavailable)}</dd></div>
        {detail ? <div><dt className="text-slate-500">Reservasjon / virksomhetsstatus</dt><dd>{detail.emailReservationLabel} · {detail.advertisingReservationLabel} · {detail.statusLabel}</dd></div> : null}
        <div><dt className="text-slate-500">Bransje (SNI 2025)</dt><dd>{detail ? detail.industryCodes.join(", ") || "Ikke oppgitt hos SCB" : "Ikke hentet fra SCB"}</dd></div>
        <div><dt className="text-slate-500">Nettside</dt><dd>{websiteReviewLabel(review)}{review?.url ? <> · <a href={review.url} target="_blank" rel="noreferrer" className="break-all text-blue-800 underline">{review.url}</a></> : null}</dd></div>
      </dl>
      {suggestions.length > 0 ? <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
        <p className="font-medium text-amber-950">Mulige nettsideadresser · ikke bekreftet tilhørighet</p>
        <ul className="mt-2 space-y-2">{suggestions.map((suggestion) => <li key={suggestion.url}>
          <a href={suggestion.url} target="_blank" rel="noreferrer" className="break-all text-blue-800 underline">{suggestion.url}</a>
          <span className="ml-2 text-slate-700">{suggestion.basis} · {suggestion.status}{suggestion.httpStatus ? ` (HTTP ${suggestion.httpStatus})` : ""}</span>
        </li>)}</ul>
        <p className="mt-2 text-xs text-amber-950">Et teknisk svar eller et e-postdomene beviser ikke at nettsiden tilhører virksomheten.</p>
      </div> : null}
      <WebsiteReviewEditor key={`editor-${review?.reviewedAt ?? "new"}`} company={company} review={review} onSave={onSaveWebsiteReview} />
      <SwedishWebsiteInspection key={`inspection-${review?.reviewedAt ?? "new"}`} review={review} />
    </article>
  );
}

function RecentResults({ result, page, onPageChange, enriched, unavailable, configured, enrichmentBusy, onEnrich, websiteReviews, websiteSuggestions, onSaveWebsiteReview }: Readonly<{
  result: SwedishRecentResult;
  page: number;
  onPageChange: (page: number) => void;
  enriched: Record<string, SwedishPilotCompany>;
  unavailable: string[];
  configured: boolean;
  enrichmentBusy: boolean;
  onEnrich: () => void;
  websiteReviews: Record<string, WebsiteReview>;
  websiteSuggestions: Record<string, SwedishWebsiteSuggestion[]>;
  onSaveWebsiteReview: (input: { orgNumber: string; status: WebsiteReviewStatus; url: string; note: string }) => Promise<string | null>;
}>) {
  const pageCount = Math.max(1, Math.ceil(result.companies.length / RECENT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = result.companies.slice(safePage * RECENT_PAGE_SIZE, (safePage + 1) * RECENT_PAGE_SIZE);
  const withEmail = recentCompaniesWithEmail(visible, enriched);
  const checkedCount = visible.filter((company) => Boolean(enriched[company.orgNumber]) || unavailable.includes(company.orgNumber)).length;
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">Nye svenske AB med e-post</h2>
      <p className="mt-2 text-sm text-slate-600">{result.companies.length} registreringer fra og med {result.cutoffDate}. Lokal registerfil lastet ned {new Date(result.sourceFileModifiedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}. Sist kontrollert mot Bolagsverket {new Date(result.sourceCheckedAt ?? result.sourceFileModifiedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
      {result.sourceWarning ? <output className="mt-2 block rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{result.sourceWarning} Listen kan derfor mangle nyere registreringer.</output> : null}
      <p className="mt-2 text-sm text-slate-600">Registerkandidater {visible.length ? safePage * RECENT_PAGE_SIZE + 1 : 0}–{safePage * RECENT_PAGE_SIZE + visible.length} av {result.companies.length}. {checkedCount} kontrollert på denne siden · {withEmail.length} med e-post vises.</p>
      <button type="button" disabled={!configured || enrichmentBusy || visible.length === 0} onClick={onEnrich} className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{enrichmentBusy ? "Kontrollerer hos SCB og nettsider …" : "Kontroller e-post, SNI, reservasjon og nettsider for denne siden"}</button>
      {!configured ? <p className="mt-2 text-sm text-slate-600">SCB-nøkkelen må være konfigurert lokalt før kontroll.</p> : null}
      {withEmail.length === 0 ? <p className="mt-3 text-sm text-slate-600">{checkedCount === 0 ? "Ingen selskaper vises før e-post er kontrollert hos SCB." : "Ingen av de kontrollerte selskapene på denne siden har oppgitt e-post hos SCB."}</p> : null}
      <p className="mt-2 text-sm text-slate-600">SCB kan mangle helt ferske registreringer. En oppgitt adresse er ikke kontrollert for levering eller automatisk godkjent for markedsføring. Registerstatus er fra Bolagsverkets ukentlige fil og kan ha endret seg etter siste oppdatering. <a href="https://bolagsverket.se/apierochoppnadata/hamtaforetagsinformation/nedladdningsbarafiler.2517.html" target="_blank" rel="noreferrer" className="text-blue-800 underline">Om Bolagsverkets datakilde ↗</a></p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{withEmail.map((company) => <RecentCompanyCard key={company.id} company={company} detail={enriched[company.orgNumber]} unavailable={false} review={websiteReviews[company.orgNumber]} suggestions={websiteSuggestions[company.orgNumber] ?? []} onSaveWebsiteReview={onSaveWebsiteReview} />)}</div>
      {pageCount > 1 ? (
        <nav aria-label="Sider med nye svenske selskaper" className="mt-4 flex items-center gap-3">
          <button type="button" disabled={safePage === 0} onClick={() => onPageChange(safePage - 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Forrige</button>
          <span className="text-sm text-slate-600">Side {safePage + 1} av {pageCount}</span>
          <button type="button" disabled={safePage + 1 >= pageCount} onClick={() => onPageChange(safePage + 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Neste</button>
        </nav>
      ) : null}
    </section>
  );
}

function PilotResults({ result }: Readonly<{ result: SwedishPilotResult }>) {
  const withEmail = pilotCompaniesWithEmail(result.companies);
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">Datakvalitet i prøveutvalget</h2>
      <p className="mt-2 text-sm text-slate-600">{result.companies.length} oppføringer · {result.withEmail} med oppgitt e-post · {result.withRegistrationDate} med registreringsdato. Hentet {new Date(result.fetchedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
      <p className="mt-2 text-sm text-slate-600">Oppgitt e-post er ikke kontrollert for levering. Virksomhetsstatus, reservasjoner og egnethet må avklares før eventuell kontakt vurderes.</p>
      {withEmail.length === 0 ? <p className="mt-4 text-sm text-slate-600">Ingen oppføringer med e-post i prøveutvalget.</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{withEmail.map((company) => <CompanyCard key={company.id} company={company} />)}</div>
    </section>
  );
}
