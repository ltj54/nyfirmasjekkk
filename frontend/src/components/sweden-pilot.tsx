"use client";

import { useState } from "react";

import type { SwedishPilotCompany, SwedishPilotResult } from "@/lib/sweden-pilot";
import type { SwedishRecentCompany, SwedishRecentResult } from "@/lib/sweden-recent";

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
        <div><dt className="text-slate-500">Bransje (SNI)</dt><dd>{company.industryCodes.join(", ") || "Ikke oppgitt"}</dd></div>
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
      } else {
        setRecentError(body.error ?? "Kunne ikke hente nye svenske selskaper.");
      }
    } catch {
      setRecentError("Forbindelsen ble brutt. Prøv igjen når appen er tilgjengelig.");
    } finally {
      setRecentBusy(false);
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
        <h2 className="font-semibold text-slate-900">Nye svenske aktiebolag · siste 7 dager</h2>
        <p className="mt-2 text-sm text-slate-700">Henter registreringer fra Bolagsverkets ukentlige bulkfil. Dette er et første kandidatgrunnlag, ikke kontaktklare leads.</p>
        <button type="button" disabled={recentBusy} onClick={() => void loadRecent()} className="mt-4 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">{recentBusy ? "Leser registerfil …" : "Hent nye AB · siste 7 dager"}</button>
        <p className="mt-3 text-sm text-slate-600">Listen inneholder foreløpig ikke e-post, nettside, virksomhetsstatus eller reservasjonskontroll. Ingen e-post sendes og ingen oppfølging opprettes.</p>
      </section>
      <div aria-live="polite" aria-busy={recentBusy}>
        {recentError ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">{recentError}</p> : null}
        {recentResult ? <RecentResults result={recentResult} page={recentPage} onPageChange={setRecentPage} /> : null}
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

function RecentCompanyCard({ company }: Readonly<{ company: SwedishRecentCompany }>) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{company.name}</h3>
      <p className="mt-1 text-sm text-slate-500">SE:{company.orgNumber} · AB · {company.postalCity || "Ukjent sted"}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-slate-500">Registrert hos Bolagsverket</dt><dd>{company.registrationDate}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsbeskrivelse</dt><dd>{company.businessDescription || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Leadstatus</dt><dd>Ikke SCB-beriket – e-post, status og reservasjon er ikke kontrollert</dd></div>
      </dl>
    </article>
  );
}

function RecentResults({ result, page, onPageChange }: Readonly<{ result: SwedishRecentResult; page: number; onPageChange: (page: number) => void }>) {
  const pageCount = Math.max(1, Math.ceil(result.companies.length / RECENT_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = result.companies.slice(safePage * RECENT_PAGE_SIZE, (safePage + 1) * RECENT_PAGE_SIZE);
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-slate-900">Nye svenske AB</h2>
      <p className="mt-2 text-sm text-slate-600">{result.companies.length} registreringer fra og med {result.cutoffDate}. Registerfil sist endret {new Date(result.sourceFileModifiedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
      <p className="mt-2 text-sm text-slate-600">Viser {visible.length ? safePage * RECENT_PAGE_SIZE + 1 : 0}–{safePage * RECENT_PAGE_SIZE + visible.length} av {result.companies.length}.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{visible.map((company) => <RecentCompanyCard key={company.id} company={company} />)}</div>
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
