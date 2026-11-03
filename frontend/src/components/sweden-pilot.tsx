"use client";

import { useState } from "react";

import type { WebsiteInspectionResponse } from "@/lib/company-check";
import { SwedishEmailDraft } from "@/components/sweden-email-draft";
import { swedishEmailDraftAvailability } from "@/lib/sweden-email-draft";
import type { SwedishPilotCompany, SwedishRecentEnrichment } from "@/lib/sweden-pilot";
import type { PreparedSwedishRecentResult } from "@/lib/sweden-prepared";
import { readSwedishPreparationStream, type SwedishPreparationState } from "@/lib/sweden-preparation-stream";
import type { SwedishRecentCompany, SwedishRecentSoleProprietorship } from "@/lib/sweden-recent";
import { recentCompaniesWithEmail, soleProprietorshipsWithEmail } from "@/lib/sweden-lead-visibility";
import type { WebsiteReview, WebsiteReviewStatus } from "@/lib/sweden-websites";
import type { SwedishWebsiteSuggestion } from "@/lib/sweden-website-suggestions";

const RECENT_PAGE_SIZE = 25;

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

function preparationPhaseLabel(phase: SwedishPreparationState["phase"]): string {
  if (phase === "source") return "Laster ned eller leser Bolagsverkets registerfil …";
  if (phase === "checking_ab") return "Kontrollerer AB hos SCB …";
  if (phase === "resolving_sole") return "Finner E-oppføringene i registerfilen …";
  if (phase === "checking_sole") return "Kontrollerer E hos SCB …";
  if (phase === "saving") return "Lagrer klargjort liste …";
  return "Klargjøringen er fullført.";
}

function SwedishPreparationProgressBar({ state }: Readonly<{ state: SwedishPreparationState }>) {
  if (state.phase !== "source" && state.total === 0) return null;
  const determinate = state.phase !== "source";
  let percentage = 0;
  if (state.total > 0) percentage = Math.round((state.completed / state.total) * 100);
  else if (state.phase === "complete") percentage = 100;
  return <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4">
    <p className="text-sm font-medium text-slate-800">{preparationPhaseLabel(state.phase)}</p>
    <progress aria-label="Fremdrift for svensk registerklargjøring" max={100} value={determinate ? percentage : undefined}
      className="mt-2 h-3 w-full accent-emerald-700" />
    <p className="mt-1 text-xs text-slate-600">{determinate ? `${state.completed} av ${state.total} kandidater kontrollert hos SCB` : "Antall kandidater blir kjent når registerfilen er lest."}</p>
    {state.phase === "resolving_sole" ? <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="text-xs text-slate-700">Leser stor registerfil for E: {state.scanPercent ?? 0} %</p>
      <progress aria-label="Fremdrift for lesing av E-oppføringer" max={100} value={state.scanPercent ?? 0}
        className="mt-1 h-2 w-full accent-blue-700" />
    </div> : null}
  </div>;
}

function SwedishEmptyRecentState({ result }: Readonly<{ result: PreparedSwedishRecentResult }>) {
  const modifiedAt = new Date(result.sourceFileModifiedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" });
  return <div aria-live="polite" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800">
    <p className="font-semibold">Ingen AB- eller E-registreringer i den siste tilgjengelige uken i filen</p>
    <p className="mt-1">Datovinduet begynner {result.cutoffDate}. Nyeste AB- eller E-registrering i filen er {result.sourceLatestRegistrationDate ?? "ikke kjent"}. Kildefilen er sist endret {modifiedAt}.</p>
    <p className="mt-1">Ingen SCB-oppslag ble gjort. Dette sier ikke at det ikke er registrert nye virksomheter i Sverige; en nyere bulkfil kan ennå mangle her. Trykk «Sjekk etter ny kildefil nå» for å kontrollere kilden igjen.</p>
    {result.sourceWarning ? <p className="mt-2 font-medium text-amber-900">{result.sourceWarning}</p> : null}
  </div>;
}

function SwedishPreparationSummary({ result }: Readonly<{ result: PreparedSwedishRecentResult }>) {
  const checked = result.prepared.checkedAbCount + result.prepared.checkedSoleCount;
  if (checked === 0) return <SwedishEmptyRecentState result={result} />;
  const withEmail = result.companies.length + result.soleProprietorships.length;
  const unavailable = result.prepared.unavailableAbCount + result.prepared.unavailableSoleCount;
  const withoutEmail = checked - withEmail - unavailable;
  const summary = result.prepared.summaryIncomplete
    ? `${withEmail} med oppgitt e-post beholdt; ${checked - withEmail} øvrige er ikke med i listen. Fordelingen mellom manglende e-post og manglende SCB-treff er ikke bevart fra den forrige klargjøringen.`
    : `${withEmail} med oppgitt e-post beholdt; ${withoutEmail} uten e-post utelatt; ${unavailable} ikke funnet hos SCB.`;
  return <div aria-live="polite" className="mt-4 rounded-lg border border-emerald-300 bg-white p-4 text-sm text-slate-800">
    <p className="font-semibold">Klargjøringen er fullført</p>
    <p className="mt-1">{result.prepared.reusedCache ? "Brukte den klargjorte lokale listen for denne kildefilen." : "Leste registerfilen og kontrollerte kandidatene hos SCB."}</p>
    <p className="mt-1">{result.prepared.checkedAbCount} AB og {result.prepared.checkedSoleCount} E registrert fra {result.cutoffDate} til {result.sourceLatestRegistrationDate ?? "ukjent dato"}. {summary}</p>
    <p className="mt-1 text-xs text-slate-600">Dette er siste tilgjengelige registreringsuke i kildefilen, ikke nødvendigvis de siste sju kalenderdagene.</p>
    <p className="mt-1 text-xs text-slate-600">SCB-data kontrollert {new Date(result.prepared.preparedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}. Opplysningene kan ha endret seg; reservasjoner må kontrolleres på nytt før eventuell kontakt. E-postadressene er ikke leveringskontrollert, og ingen kontakt er sendt.</p>
  </div>;
}

function recentButtonLabel(busy: boolean, emptySelection: boolean): string {
  if (busy) return "Henter og klargjør listen …";
  if (emptySelection) return "Sjekk etter ny kildefil nå";
  return "Hent og klargjør siste tilgjengelige uke";
}

export function SwedenPilot({ configured }: Readonly<{ configured: boolean }>) {
  const [recentResult, setRecentResult] = useState<PreparedSwedishRecentResult | null>(null);
  const [recentPage, setRecentPage] = useState(0);
  const [recentBusy, setRecentBusy] = useState(false);
  const [recentProgress, setRecentProgress] = useState<SwedishPreparationState | null>(null);
  const [enrichmentBusy, setEnrichmentBusy] = useState(false);
  const [soleWebsiteBusy, setSoleWebsiteBusy] = useState(false);
  const [enriched, setEnriched] = useState<Record<string, SwedishPilotCompany>>({});
  const [soleEnriched, setSoleEnriched] = useState<Record<string, SwedishPilotCompany>>({});
  const [websiteReviews, setWebsiteReviews] = useState<Record<string, WebsiteReview>>({});
  const [websiteSuggestions, setWebsiteSuggestions] = useState<Record<string, SwedishWebsiteSuggestion[]>>({});
  const [recentError, setRecentError] = useState("");
  const emptyRecentSelection = recentResult?.prepared.checkedAbCount === 0 && recentResult.prepared.checkedSoleCount === 0;

  async function loadRecent() {
    setRecentBusy(true);
    setRecentError("");
    setRecentProgress({ phase: "source", completed: 0, total: 0 });
    setRecentResult(null);
    try {
      const response = await fetch("/api/sweden-recent", { method: "POST", cache: "no-store" });
      if (!response.ok) {
        const errorBody = await response.json() as { error?: string };
        setRecentError(errorBody.error ?? "Kunne ikke hente nye svenske selskaper.");
        setRecentProgress(null);
        return;
      }
      const result = await readSwedishPreparationStream(response.body, setRecentProgress);
      setRecentResult(result);
      setRecentPage(0);
      setEnriched(Object.fromEntries(result.enrichment.companies.map((company) => [company.id.slice(3), company])));
      setSoleEnriched(Object.fromEntries(result.enrichment.soleProprietorships.map((company) => [company.id, company])));
      setWebsiteSuggestions({});
      try {
        const reviewsResponse = await fetch("/api/sweden-website-reviews", { cache: "no-store" });
        if (reviewsResponse.ok) {
          const reviewsBody = await reviewsResponse.json() as { reviews: Record<string, WebsiteReview> };
          setWebsiteReviews(reviewsBody.reviews);
        }
      } catch {
        // The prepared list is still complete when optional manual website reviews are unavailable.
      }
    } catch (error) {
      setRecentError(error instanceof Error ? error.message : "Forbindelsen ble brutt. Prøv igjen når appen er tilgjengelig.");
      setRecentProgress(null);
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
      setWebsiteSuggestions((previous) => ({ ...previous, ...body.websiteSuggestions }));
    } catch {
      setRecentError("Forbindelsen til SCB ble brutt. Prøv igjen senere.");
    } finally {
      setEnrichmentBusy(false);
    }
  }

  async function inspectVisibleSoleWebsites(ids: string[]) {
    if (!recentResult || ids.length === 0) return;
    setSoleWebsiteBusy(true);
    setRecentError("");
    try {
      const response = await fetch("/api/sweden-recent/website-suggestions-sole", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, cutoffDate: recentResult.cutoffDate,
          sourceFileModifiedAt: recentResult.sourceFileModifiedAt }),
        cache: "no-store",
      });
      const body = await response.json() as { websiteSuggestions?: Record<string, SwedishWebsiteSuggestion[]>; error?: string };
      if (!response.ok || !body.websiteSuggestions) {
        setRecentError(body.error ?? "Kunne ikke undersøke mulige nettsider for E-virksomhetene.");
        return;
      }
      setWebsiteSuggestions((previous) => ({ ...previous, ...body.websiteSuggestions }));
    } catch {
      setRecentError("Nettsidesøket ble avbrutt. Prøv igjen senere.");
    } finally {
      setSoleWebsiteBusy(false);
    }
  }

  return (
    <>
      <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="font-semibold text-slate-900">Nye svenske virksomheter · siste tilgjengelige registreringsuke</h2>
        <p className="mt-2 text-sm text-slate-700">Henter nye AB og registrerte enkeltpersonforetak (E) fra Bolagsverkets bulkfil, kontrollerer dem hos SCB og viser bare virksomheter med oppgitt e-post. Dette er ikke kontaktklare leads.</p>
        <button type="button" disabled={!configured || recentBusy} onClick={() => void loadRecent()} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{recentButtonLabel(recentBusy, emptyRecentSelection)}</button>
        <p className="mt-3 text-sm text-slate-600">Første kjøring for en ny bulkfil kan ta flere minutter. Utvalget følger den nyeste AB- eller E-registreringen i filen og kan derfor være eldre enn sju kalenderdager. Så lenge kildefilen er uendret, gjenbrukes den klargjorte listen uten ny full E-skanning eller SCB-kontroll. E-identifikatoren vises ikke og lagres ikke i resultatfilen, men Bolagsverkets nedlastede råfil inneholder personnummer og ligger lokalt. Ingen e-post sendes og ingen oppfølging opprettes.</p>
        {recentProgress ? <SwedishPreparationProgressBar state={recentProgress} /> : null}
        {recentResult && !recentBusy && !recentError ? <SwedishPreparationSummary result={recentResult} /> : null}
      </section>
      <div aria-live="polite" aria-busy={recentBusy}>
        {recentError ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{recentError}</p> : null}
        {recentResult && recentResult.prepared.checkedSoleCount > 0 ? <SoleResults result={recentResult} enriched={soleEnriched} websiteSuggestions={websiteSuggestions} websiteBusy={soleWebsiteBusy} onInvestigate={(ids) => void inspectVisibleSoleWebsites(ids)} /> : null}
        {recentResult && recentResult.prepared.checkedAbCount > 0 ? <RecentResults result={recentResult} page={recentPage} onPageChange={setRecentPage} enriched={enriched} configured={configured} enrichmentBusy={enrichmentBusy} onEnrich={() => void enrichVisiblePage()} websiteReviews={websiteReviews} websiteSuggestions={websiteSuggestions} onSaveWebsiteReview={saveWebsiteReview} /> : null}
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

function recentLeadStatus(detail: SwedishPilotCompany | undefined): string {
  if (detail) return `${contactStatusLabel(detail.contactAssessment)} – ${detail.contactAssessmentReason}`;
  return "Ikke SCB-kontrollert – ingen kontakt fra denne listen";
}

function SoleCard({ candidate, detail, suggestions, selected, onSelectionChange }: Readonly<{
  candidate: SwedishRecentSoleProprietorship;
  detail: SwedishPilotCompany;
  suggestions?: SwedishWebsiteSuggestion[];
  selected: boolean;
  onSelectionChange: (id: string, selected: boolean) => void;
}>) {
  const searchQuery = `${candidate.name} ${candidate.postalCity} webbplats`;
  const draftAvailability = swedishEmailDraftAvailability(detail.contactAssessment, suggestions);
  const websiteBlocksOffer = draftAvailability === "possible_website";
  const websiteCheckNeeded = draftAvailability === "needs_website_check";
  let leadLabel = contactStatusLabel(detail.contactAssessment);
  if (websiteBlocksOffer) leadLabel = "Mulig nettside – tilbud sperret";
  else if (websiteCheckNeeded) leadLabel = "Nettsidesjekk gjenstår";
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{candidate.name}</h3>
      <p className="mt-1 text-sm text-slate-500">E · Enskild näringsverksamhet · {candidate.postalCity || "Ukjent sted"}</p>
      <p className={`mt-3 inline-flex rounded px-2 py-1 text-xs font-semibold ${websiteBlocksOffer || websiteCheckNeeded ? "bg-amber-50 text-amber-800" : contactStatusClass(detail.contactAssessment)}`}>{leadLabel}</p>
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
        <div><dt className="text-slate-500">Nettside</dt><dd>{suggestions ? "Mulige adresser undersøkt – tilhørighet ikke bekreftet" : "Ikke undersøkt"}</dd></div>
      </dl>
      {suggestions ? <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
        <p className="font-medium text-amber-950">Mulige nettsideadresser · ikke bekreftet tilhørighet</p>
        {suggestions.length > 0 ? <ul className="mt-2 space-y-2">{suggestions.map((suggestion) => <li key={suggestion.url}>
          <a href={suggestion.url} target="_blank" rel="noreferrer" className="break-all text-blue-800 underline">{suggestion.url}</a>
          <span className="ml-2 text-slate-700">{suggestion.basis} · {suggestion.status}{suggestion.httpStatus ? ` (HTTP ${suggestion.httpStatus})` : ""}</span>
        </li>)}</ul> : <p className="mt-2 text-slate-700">Ingen treff i den begrensede domenesjekken. Virksomheten kan likevel ha nettside under et annet navn eller på en handelsplattform.</p>}
        <a href={`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-blue-800 underline">Søk manuelt på navn og sted ↗</a>
        <p className="mt-2 text-xs text-amber-950">Et teknisk svar eller et e-postdomene beviser ikke at nettsiden tilhører virksomheten.</p>
      </div> : null}
      {websiteBlocksOffer ? <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">E-postutkast sperret: En mulig nettsideadresse svarer. Kontroller tilhørigheten manuelt; denne siden lager ikke et tilbud om ny nettside for virksomheten.</p> : null}
      {websiteCheckNeeded ? <p className="mt-4 text-xs text-slate-600">Undersøk mulige nettsider før et e-postutkast kan lages.</p> : null}
      {draftAvailability === "available" ? <label className="mt-4 flex items-start gap-2 text-sm font-medium text-slate-800">
        <input type="checkbox" checked={selected} onChange={(event) => onSelectionChange(candidate.id, event.target.checked)} className="mt-1" />
        <span>Velg for manuell e-postvurdering</span>
      </label> : null}
      {draftAvailability === "available" ? <SwedishEmailDraft companyName={candidate.name} businessDescription={candidate.businessDescription} /> : null}
    </article>
  );
}

function SoleResults({ result, enriched, websiteSuggestions, websiteBusy, onInvestigate }: Readonly<{
  result: PreparedSwedishRecentResult;
  enriched: Record<string, SwedishPilotCompany>;
  websiteSuggestions: Record<string, SwedishWebsiteSuggestion[]>;
  websiteBusy: boolean;
  onInvestigate: (ids: string[]) => void;
}>) {
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const withEmail = soleProprietorshipsWithEmail(result.soleProprietorships, enriched);
  const selected = withEmail.filter((candidate) => selectedIds.has(candidate.id)
    && swedishEmailDraftAvailability(enriched[candidate.id].contactAssessment, websiteSuggestions[candidate.id]) === "available");
  function changeSelection(id: string, isSelected: boolean) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  const pageCount = Math.max(1, Math.ceil(withEmail.length / RECENT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = withEmail.slice(safePage * RECENT_PAGE_SIZE, (safePage + 1) * RECENT_PAGE_SIZE);
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-semibold text-slate-900">Nye svenske E med e-post</h2>
      <p className="mt-2 text-sm text-slate-600">{result.prepared.checkedSoleCount} E-registreringer fra og med {result.cutoffDate} ble kontrollert hos SCB · {withEmail.length} med e-post vises. Personnummer vises ikke og legges ikke i resultatfilen; nedlastet råfil inneholder dem. Utvalget omfatter bare E som er registrert hos Bolagsverket, ikke alle svenske enkeltpersonforetak.</p>
      <p className="mt-2 text-sm text-slate-600">{selected.length} valgt for manuell e-postvurdering. Valget beholdes bare i denne visningen; ingen e-post sendes.</p>
      {visible.length > 0 ? <button type="button" disabled={websiteBusy} onClick={() => onInvestigate(visible.map((company) => company.id))} className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{websiteBusy ? "Undersøker mulige nettsider …" : "Undersøk mulige nettsider for denne siden"}</button> : null}
      {withEmail.length === 0 ? <p className="mt-3 text-sm text-slate-600">Ingen av E-registreringene har oppgitt e-post hos SCB.</p> : null}
      {withEmail.length > 0 ? <div className="mt-4 grid gap-4 md:grid-cols-2">{visible.map((candidate) => <SoleCard key={candidate.id} candidate={candidate} detail={enriched[candidate.id]} suggestions={websiteSuggestions[candidate.id]} selected={selected.some((item) => item.id === candidate.id)} onSelectionChange={changeSelection} />)}</div> : null}
      {pageCount > 1 ? <nav aria-label="Sider med svenske E" className="mt-4 flex items-center gap-3">
        <button type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Forrige</button>
        <span className="text-sm text-slate-600">Side {safePage + 1} av {pageCount}</span>
        <button type="button" disabled={safePage + 1 >= pageCount} onClick={() => setPage(safePage + 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Neste</button>
      </nav> : null}
      <p className="mt-3 text-xs text-slate-600">Oppgitt e-post er ikke leveringskontrollert. Ingen e-post sendes eller CRM-sak opprettes her.</p>
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

function RecentCompanyCard({ company, detail, review, suggestions, onSaveWebsiteReview }: Readonly<{
  company: SwedishRecentCompany;
  detail?: SwedishPilotCompany;
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
        <div><dt className="text-slate-500">Leadstatus</dt><dd>{registerNeedsReview ? "Ikke kontakt – registerstatus må avklares" : recentLeadStatus(detail)}</dd></div>
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

function RecentResults({ result, page, onPageChange, enriched, configured, enrichmentBusy, onEnrich, websiteReviews, websiteSuggestions, onSaveWebsiteReview }: Readonly<{
  result: PreparedSwedishRecentResult;
  page: number;
  onPageChange: (page: number) => void;
  enriched: Record<string, SwedishPilotCompany>;
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
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">Nye svenske AB med e-post</h2>
      <p className="mt-2 text-sm text-slate-600">{result.prepared.checkedAbCount} registreringer fra og med {result.cutoffDate} ble kontrollert hos SCB · {result.companies.length} med e-post vises. Lokal registerfil lastet ned {new Date(result.sourceFileModifiedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}. Sist kontrollert mot Bolagsverket {new Date(result.sourceCheckedAt ?? result.sourceFileModifiedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
      {result.sourceWarning ? <output className="mt-2 block rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{result.sourceWarning} Listen kan derfor mangle nyere registreringer.</output> : null}
      <p className="mt-2 text-sm text-slate-600">Viser {visible.length ? safePage * RECENT_PAGE_SIZE + 1 : 0}–{safePage * RECENT_PAGE_SIZE + visible.length} av {result.companies.length} AB med e-post.</p>
      <button type="button" disabled={!configured || enrichmentBusy || visible.length === 0} onClick={onEnrich} className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{enrichmentBusy ? "Undersøker mulige nettsider …" : "Undersøk mulige nettsider for denne siden"}</button>
      {!configured ? <p className="mt-2 text-sm text-slate-600">SCB-nøkkelen må være konfigurert lokalt før kontroll.</p> : null}
      {withEmail.length === 0 ? <p className="mt-3 text-sm text-slate-600">Ingen AB med oppgitt e-post hos SCB i dette utvalget.</p> : null}
      <p className="mt-2 text-sm text-slate-600">SCB kan mangle helt ferske registreringer. En oppgitt adresse er ikke kontrollert for levering eller automatisk godkjent for markedsføring. Registerstatus er fra Bolagsverkets ukentlige fil og kan ha endret seg etter siste oppdatering. <a href="https://bolagsverket.se/apierochoppnadata/hamtaforetagsinformation/nedladdningsbarafiler.2517.html" target="_blank" rel="noreferrer" className="text-blue-800 underline">Om Bolagsverkets datakilde ↗</a></p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{withEmail.map((company) => <RecentCompanyCard key={company.id} company={company} detail={enriched[company.orgNumber]} review={websiteReviews[company.orgNumber]} suggestions={websiteSuggestions[company.orgNumber] ?? []} onSaveWebsiteReview={onSaveWebsiteReview} />)}</div>
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

