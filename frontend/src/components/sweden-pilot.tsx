"use client";

import { useState } from "react";

import type { SwedishPilotCompany, SwedishPilotResult, SwedishRecentEnrichment } from "@/lib/sweden-pilot";
import type { SwedishRecentCompany, SwedishRecentResult, SwedishRecentSoleProprietorship } from "@/lib/sweden-recent";
import type { WebsiteReview, WebsiteReviewStatus } from "@/lib/sweden-websites";

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
  const [solePage, setSolePage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [recentBusy, setRecentBusy] = useState(false);
  const [enrichmentBusy, setEnrichmentBusy] = useState(false);
  const [enriched, setEnriched] = useState<Record<string, SwedishPilotCompany>>({});
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [websiteReviews, setWebsiteReviews] = useState<Record<string, WebsiteReview>>({});
  const [error, setError] = useState("");
  const [recentError, setRecentError] = useState("");

  async function loadRecent() {
    setRecentBusy(true);
    setRecentError("");
    try {
      const response = await fetch("/api/sweden-recent", { method: "POST", cache: "no-store" });
      const body = await response.json() as SwedishRecentResult & { error?: string };
      if (response.ok) {
        setRecentResult(body);
        setRecentPage(0);
        setSolePage(0);
        setEnriched({});
        setUnavailable([]);
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
    } catch {
      setRecentError("Forbindelsen til SCB ble brutt. Prøv igjen senere.");
    } finally {
      setEnrichmentBusy(false);
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
        <p className="mt-2 text-sm text-slate-700">Henter AB og registrerte enskilda firmor fra Bolagsverkets ukentlige bulkfil. Formene vises separat. Dette er et første kandidatgrunnlag, ikke kontaktklare leads.</p>
        <button type="button" disabled={recentBusy} onClick={() => void loadRecent()} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{recentBusy ? "Leser registerfil …" : "Hent nye AB og enskild firma · siste 7 dager"}</button>
        <p className="mt-3 text-sm text-slate-600">For AB kan du kontrollere e-post, SNI 2025 og reservasjonskoder hos SCB og registrere nettsider manuelt. Enskild firma vises bare med virksomhetsnavn og beskrivelse; personnummer, e-post og kontaktfunksjoner er utelatt. Ingen e-post sendes og ingen oppfølging opprettes.</p>
      </section>
      <div aria-live="polite" aria-busy={recentBusy}>
        {recentError ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{recentError}</p> : null}
        {recentResult ? <><RecentResults result={recentResult} page={recentPage} onPageChange={setRecentPage} enriched={enriched} unavailable={unavailable} configured={configured} enrichmentBusy={enrichmentBusy} onEnrich={() => void enrichVisiblePage()} websiteReviews={websiteReviews} onSaveWebsiteReview={saveWebsiteReview} /><SoleProprietorshipResults result={recentResult} page={solePage} onPageChange={setSolePage} /></> : null}
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
  return "Nettside ikke undersøkt";
}

function recentLeadStatus(detail: SwedishPilotCompany | undefined, unavailable: boolean): string {
  if (detail) return `${contactStatusLabel(detail.contactAssessment)} – ${detail.contactAssessmentReason}`;
  if (unavailable) return "Ikke funnet hos SCB ennå – ingen e-post eller reservasjon kontrollert";
  return "Ikke SCB-kontrollert – ingen kontakt fra denne listen";
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

function RecentCompanyCard({ company, detail, unavailable, review, onSaveWebsiteReview }: Readonly<{
  company: SwedishRecentCompany;
  detail?: SwedishPilotCompany;
  unavailable: boolean;
  review?: WebsiteReview;
  onSaveWebsiteReview: (input: { orgNumber: string; status: WebsiteReviewStatus; url: string; note: string }) => Promise<string | null>;
}>) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{company.name}</h3>
      <p className="mt-1 text-sm text-slate-500">SE:{company.orgNumber} · AB · {company.postalCity || "Ukjent sted"}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-slate-500">Registrert hos Bolagsverket</dt><dd>{company.registrationDate}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsbeskrivelse</dt><dd>{company.businessDescription || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">E-post hos SCB</dt><dd className="break-all">{detail?.email || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Leadstatus</dt><dd>{recentLeadStatus(detail, unavailable)}</dd></div>
        {detail ? <div><dt className="text-slate-500">Reservasjon / virksomhetsstatus</dt><dd>{detail.emailReservationLabel} · {detail.advertisingReservationLabel} · {detail.statusLabel}</dd></div> : null}
        <div><dt className="text-slate-500">Bransje (SNI 2025)</dt><dd>{detail ? detail.industryCodes.join(", ") || "Ikke oppgitt hos SCB" : "Ikke hentet fra SCB"}</dd></div>
        <div><dt className="text-slate-500">Nettside</dt><dd>{websiteReviewLabel(review)}{review?.url ? <> · <a href={review.url} target="_blank" rel="noreferrer" className="break-all text-blue-800 underline">{review.url}</a></> : null}</dd></div>
      </dl>
      <WebsiteReviewEditor key={review?.reviewedAt ?? "new"} company={company} review={review} onSave={onSaveWebsiteReview} />
    </article>
  );
}

function RecentResults({ result, page, onPageChange, enriched, unavailable, configured, enrichmentBusy, onEnrich, websiteReviews, onSaveWebsiteReview }: Readonly<{
  result: SwedishRecentResult;
  page: number;
  onPageChange: (page: number) => void;
  enriched: Record<string, SwedishPilotCompany>;
  unavailable: string[];
  configured: boolean;
  enrichmentBusy: boolean;
  onEnrich: () => void;
  websiteReviews: Record<string, WebsiteReview>;
  onSaveWebsiteReview: (input: { orgNumber: string; status: WebsiteReviewStatus; url: string; note: string }) => Promise<string | null>;
}>) {
  const pageCount = Math.max(1, Math.ceil(result.companies.length / RECENT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = result.companies.slice(safePage * RECENT_PAGE_SIZE, (safePage + 1) * RECENT_PAGE_SIZE);
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">Nye svenske AB</h2>
      <p className="mt-2 text-sm text-slate-600">{result.companies.length} registreringer fra og med {result.cutoffDate}. Registerfil sist endret {new Date(result.sourceFileModifiedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
      <p className="mt-2 text-sm text-slate-600">Viser {visible.length ? safePage * RECENT_PAGE_SIZE + 1 : 0}–{safePage * RECENT_PAGE_SIZE + visible.length} av {result.companies.length}.</p>
      <button type="button" disabled={!configured || enrichmentBusy || visible.length === 0} onClick={onEnrich} className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{enrichmentBusy ? "Kontrollerer hos SCB …" : "Kontroller e-post, SNI og reservasjon for denne siden"}</button>
      {!configured ? <p className="mt-2 text-sm text-slate-600">SCB-nøkkelen må være konfigurert lokalt før kontroll.</p> : null}
      <p className="mt-2 text-sm text-slate-600">SCB kan mangle helt ferske registreringer. En oppgitt adresse er ikke kontrollert for levering eller automatisk godkjent for markedsføring.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{visible.map((company) => <RecentCompanyCard key={company.id} company={company} detail={enriched[company.orgNumber]} unavailable={unavailable.includes(company.orgNumber)} review={websiteReviews[company.orgNumber]} onSaveWebsiteReview={onSaveWebsiteReview} />)}</div>
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

function SoleProprietorshipCard({ company }: Readonly<{ company: SwedishRecentSoleProprietorship }>) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{company.name}</h3>
      <p className="mt-1 text-sm text-slate-500">Enskild firma · {company.postalCity || "Ukjent sted"}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-slate-500">Registrert hos Bolagsverket</dt><dd>{company.registrationDate}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsbeskrivelse</dt><dd>{company.businessDescription || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Kontaktstatus</dt><dd>Kun registeroversikt – ikke kontrollert for e-post, reservasjon eller egnethet</dd></div>
      </dl>
    </article>
  );
}

function SoleProprietorshipResults({ result, page, onPageChange }: Readonly<{
  result: SwedishRecentResult;
  page: number;
  onPageChange: (page: number) => void;
}>) {
  const total = result.soleProprietorships.length;
  const pageCount = Math.max(1, Math.ceil(total / RECENT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = result.soleProprietorships.slice(safePage * RECENT_PAGE_SIZE, (safePage + 1) * RECENT_PAGE_SIZE);
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">Nye svenske enskilda firmor</h2>
      <p className="mt-2 text-sm text-slate-600">{total} registreringer fra og med {result.cutoffDate}. Bare virksomheter registrert hos Bolagsverket inngår. Personnummer vises ikke og lagres ikke i resultatlisten.</p>
      <p className="mt-2 text-sm text-slate-600">Viser {visible.length ? safePage * RECENT_PAGE_SIZE + 1 : 0}–{safePage * RECENT_PAGE_SIZE + visible.length} av {total}. Dette er ikke en kontaktliste.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{visible.map((company) => <SoleProprietorshipCard key={company.id} company={company} />)}</div>
      {pageCount > 1 ? (
        <nav aria-label="Sider med nye svenske enskilda firmor" className="mt-4 flex items-center gap-3">
          <button type="button" disabled={safePage === 0} onClick={() => onPageChange(safePage - 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Forrige</button>
          <span className="text-sm text-slate-600">Side {safePage + 1} av {pageCount}</span>
          <button type="button" disabled={safePage + 1 >= pageCount} onClick={() => onPageChange(safePage + 1)} className="rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">Neste</button>
        </nav>
      ) : null}
    </section>
  );
}

function PilotResults({ result }: Readonly<{ result: SwedishPilotResult }>) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">Datakvalitet i prøveutvalget</h2>
      <p className="mt-2 text-sm text-slate-600">{result.companies.length} oppføringer · {result.withEmail} med oppgitt e-post · {result.withRegistrationDate} med registreringsdato. Hentet {new Date(result.fetchedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
      <p className="mt-2 text-sm text-slate-600">Oppgitt e-post er ikke kontrollert for levering. Virksomhetsstatus, reservasjoner og egnethet må avklares før eventuell kontakt vurderes.</p>
      {result.companies.length === 0 ? <p className="mt-4 text-sm text-slate-600">SCB returnerte ingen oppføringer i prøveutvalget.</p> : null}
      <div className="mt-4 grid gap-4 md:grid-cols-2">{result.companies.map((company) => <CompanyCard key={company.id} company={company} />)}</div>
    </section>
  );
}
