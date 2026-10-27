"use client";

import { useState } from "react";

import type { SwedishPilotCompany, SwedishPilotResult } from "@/lib/sweden-pilot";

function CompanyCard({ company }: Readonly<{ company: SwedishPilotCompany }>) {
  const reservation = company.emailReservationCode === null ? "Ikke oppgitt" : `SCB-kode ${company.emailReservationCode} · må avklares`;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">{company.name}</h2>
      <p className="mt-1 text-sm text-slate-500">{company.id} · AB · {company.city || "Ukjent sted"}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="text-slate-500">Registrert i SCBs foretaksregister</dt><dd>{company.registrationDate || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">E-post i registeret</dt><dd className="break-all">{company.email || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Reservasjon mot e-postreklame</dt><dd>{reservation}</dd></div>
        <div><dt className="text-slate-500">Virksomhetsstatus</dt><dd>SCB-kode {company.statusCode || "ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Bransje (SNI)</dt><dd>{company.industryCodes.join(", ") || "Ikke oppgitt"}</dd></div>
        <div><dt className="text-slate-500">Nettside</dt><dd>Ikke undersøkt</dd></div>
      </dl>
    </article>
  );
}

export function SwedenPilot({ configured }: Readonly<{ configured: boolean }>) {
  const [result, setResult] = useState<SwedishPilotResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 className="font-semibold text-slate-900">Første prøveutvalg</h2>
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
