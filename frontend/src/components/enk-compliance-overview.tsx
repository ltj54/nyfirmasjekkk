"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calculator, CalendarDays, CheckCircle2, FileCheck2, Landmark, ReceiptText } from "lucide-react";

import {
  crmInvoiceTurnover,
  defaultEnkComplianceState,
  invoiceNumbersAreSequential,
  missingInvoiceDates,
  TAX_RESERVE_GUIDANCE_RATE,
  VAT_REGISTRATION_THRESHOLD,
  type ComplianceInvoice,
  type ComplianceStatus,
  type ComplianceTaskId,
  type EnkComplianceState,
} from "@/lib/enk-compliance";
import { osloToday } from "@/lib/crm-events";
import { InvoiceNumberingControl } from "@/components/invoice-numbering-control";

type Props = Readonly<{ invoices: ComplianceInvoice[]; canEdit: boolean }>;

type TaskDefinition = {
  id: ComplianceTaskId;
  title: string;
  due: string;
  category: "Lovpålagt" | "Kontrollpunkt";
  explanation: string;
  source: string;
  sourceUrl: string;
};

const taskDefinitions: TaskDefinition[] = [
  {
    id: "invoice_system",
    title: "Ta i bruk maskinell fakturanummerering",
    due: "Før neste faktura",
    category: "Lovpålagt",
    explanation: "Fakturanummer skal tildeles automatisk av et fakturaprogram, eller komme fra forhåndsnummererte blanketter fra trykkeri.",
    source: "Altinn · Faktura",
    sourceUrl: "https://info.altinn.no/starte-og-drive/regnskap-og-revisjon/regnskap/faktura-salgsdokumentasjon/",
  },
  {
    id: "website_information",
    title: "Kontroller foretaksnavn og org.nr. på nettsiden",
    due: "Løpende",
    category: "Lovpålagt",
    explanation: "Nettsider og forretningsdokumenter skal vise registrert foretaksnavn og organisasjonsnummer.",
    source: "Altinn · Foretaksinformasjon",
    sourceUrl: "https://info.altinn.no/starte-og-drive/drive-bedrift/juridiske-og-regulatoriske-krav/krav-til-informasjon-om-foretaket-pa-nettsider-og-forretningsdokumenter/",
  },
  {
    id: "advance_tax_2026_q4",
    title: "Kontroller forskuddsskatt for 4. termin",
    due: "15.12.2026",
    category: "Lovpålagt",
    explanation: "Betales bare dersom Skatteetaten har skrevet ut et krav. Forventet overskudd i skattekortet må være oppdatert.",
    source: "Skatteetaten · Forskuddsskatt",
    sourceUrl: "https://www.skatteetaten.no/bedrift-og-organisasjon/skatt/forskuddsskatt/forskuddsskatt-for-enkeltpersonforetak/",
  },
  {
    id: "tax_return_2026",
    title: "Lever skattemelding med næringsspesifikasjon",
    due: "31.05.2027",
    category: "Lovpålagt",
    explanation: "Skattemeldingen må leveres også dersom foretaket har hatt liten eller ingen omsetning.",
    source: "Skatteetaten · Skattemelding for ENK",
    sourceUrl: "https://www.skatteetaten.no/bedrift-og-organisasjon/skatt/skattemelding-naringsdrivende/enk/",
  },
];

const mvaDeadlines = [
  "10.12.2026 · september–oktober",
  "10.02.2027 · november–desember",
  "10.04.2027 · januar–februar",
  "10.06.2027 · mars–april",
  "31.08.2027 · mai–juni",
  "10.10.2027 · juli–august",
];

const statusLabels: Record<ComplianceStatus, string> = {
  open: "Åpen",
  completed: "Fullført",
  not_applicable: "Ikke aktuell",
};

function money(value: number): string {
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(value) + " kr";
}

function percentage(value: number, total: number): number {
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function endOfCurrentMonth(): string {
  const [year, month] = osloToday().split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 0));
  return new Intl.DateTimeFormat("nb-NO", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function updateTaskStatus(state: EnkComplianceState, taskId: ComplianceTaskId, status: ComplianceStatus): EnkComplianceState {
  const task = state.tasks[taskId];
  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status,
        completedDate: status === "completed" && !task.completedDate ? osloToday() : task.completedDate,
      },
    },
  };
}

function updateTaskField(state: EnkComplianceState, taskId: ComplianceTaskId, field: "completedDate" | "note", value: string): EnkComplianceState {
  return {
    ...state,
    tasks: { ...state.tasks, [taskId]: { ...state.tasks[taskId], [field]: value } },
  };
}

export function EnkComplianceOverview({ invoices, canEdit }: Props) {
  const [state, setState] = useState<EnkComplianceState>(defaultEnkComplianceState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const turnover = useMemo(() => crmInvoiceTurnover(invoices), [invoices]);
  const missingDates = useMemo(() => missingInvoiceDates(invoices), [invoices]);
  const sequentialNumbers = useMemo(() => invoiceNumbersAreSequential(invoices), [invoices]);
  const suggestedTaxReserve = (state.expectedAnnualProfit ?? 0) * TAX_RESERVE_GUIDANCE_RATE;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/enk-compliance", { cache: "no-store", signal: controller.signal });
        const body = await response.json() as { state?: EnkComplianceState; error?: string };
        if (response.ok && body.state) setState(body.state);
        else setMessage(body.error ?? "Kunne ikke lese ENK-oversikten.");
      } catch {
        if (!controller.signal.aborted) setMessage("ENK-oversikten er utilgjengelig akkurat nå.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/enk-compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const body = await response.json() as { state?: EnkComplianceState; error?: string };
      if (!response.ok || !body.state) setMessage(body.error ?? "Kunne ikke lagre ENK-oversikten.");
      else {
        setState(body.state);
        setMessage("ENK-oversikten er lagret lokalt.");
      }
    } catch {
      setMessage("Kunne ikke lagre ENK-oversikten.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5 sm:p-6" aria-labelledby="enk-compliance-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">LTJ Production · virksomhetskontroll</p>
          <h2 id="enk-compliance-title" className="mt-1 text-xl font-semibold text-slate-950">ENK · frister og plikter</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-700">Lokal arbeidsoversikt basert på CRM-data. Den sender ingenting til Skatteetaten og erstatter ikke krav, meldinger eller beløp i Altinn og Skatteetatens Min side.</p>
        </div>
        <span className="w-fit rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-900">Org.nr. 838 632 122</span>
      </div>

      <ComplianceSummary state={state} turnover={turnover} suggestedTaxReserve={suggestedTaxReserve} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <VatTracker turnover={turnover} missingDates={missingDates} state={state} />
        <InvoiceControl invoices={invoices} missingDates={missingDates} sequentialNumbers={sequentialNumbers} />
      </div>
      <div className="mt-4"><InvoiceNumberingControl canEdit={canEdit && !loading} /></div>

      <div className="mt-5">
        <h3 className="text-base font-semibold text-slate-950">Frister og kontrollpunkter</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {taskDefinitions.map((definition) => (
            <ComplianceTaskCard
              key={definition.id}
              definition={definition}
              state={state}
              canEdit={canEdit}
              onStatusChange={(status) => setState((current) => updateTaskStatus(current, definition.id, status))}
              onFieldChange={(field, value) => setState((current) => updateTaskField(current, definition.id, field, value))}
            />
          ))}
        </div>
      </div>

      <BookkeepingAndSettings state={state} canEdit={canEdit} setState={setState} />
      <ConditionalModules state={state} />

      {canEdit ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-indigo-200 pt-4">
          <button type="button" onClick={() => void save()} disabled={saving || loading} className="min-h-11 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Lagrer …" : "Lagre ENK-status"}
          </button>
          {message ? <output className="text-sm text-slate-700">{message}</output> : null}
        </div>
      ) : null}
    </section>
  );
}

function ComplianceSummary({ state, turnover, suggestedTaxReserve }: Readonly<{ state: EnkComplianceState; turnover: number; suggestedTaxReserve: number }>) {
  const cards = [
    { icon: CalendarDays, label: "Neste lovpålagte kontroll", value: "15.12.2026", detail: "Forskuddsskatt · bare ved utskrevet krav" },
    { icon: Calculator, label: "MVA-grunnlag i CRM", value: money(turnover), detail: `${money(Math.max(0, VAT_REGISTRATION_THRESHOLD - turnover))} igjen til registreringsgrensen` },
    { icon: Landmark, label: "Skatt satt av", value: state.taxReserved === null ? "Ikke registrert" : money(state.taxReserved), detail: state.expectedAnnualProfit === null ? "Legg inn forventet overskudd" : `Skatteetatens 40 %-tommelfingerregel: ${money(suggestedTaxReserve)}` },
    { icon: FileCheck2, label: "Regnskap sist avstemt", value: state.lastBookkeepingReconciled || "Ikke registrert", detail: `Intern månedsfrist: ${endOfCurrentMonth()}` },
  ];
  return (
    <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => <div key={card.label} className="rounded-lg border border-indigo-100 bg-white p-4"><card.icon aria-hidden="true" className="size-5 text-indigo-700" /><dt className="mt-2 text-xs font-medium text-slate-600">{card.label}</dt><dd className="mt-1 text-lg font-semibold text-slate-950">{card.value}</dd><p className="mt-1 text-xs text-slate-600">{card.detail}</p></div>)}
    </dl>
  );
}

function VatTracker({ turnover, missingDates, state }: Readonly<{ turnover: number; missingDates: number; state: EnkComplianceState }>) {
  const progress = percentage(turnover, VAT_REGISTRATION_THRESHOLD);
  const statusText = vatTrackerStatus(state, turnover);
  const missingDateText = missingDates + " faktura(er) mangler fakturadato i CRM. Beløpet må derfor avstemmes mot regnskapet før det brukes som grunnlag for registrering.";
  return (
    <article className="rounded-lg border border-indigo-100 bg-white p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-950">
        <Calculator aria-hidden="true" className="size-5 text-indigo-700" />
        MVA-grense · rullerende 12 måneder
      </h3>
      <p className="mt-3 text-sm text-slate-700">
        Andel av registreringsgrensen: <strong>{progress} %</strong>
      </p>
      <div className="mt-2 flex justify-between text-sm">
        <strong>{money(turnover)}</strong>
        <span>{money(VAT_REGISTRATION_THRESHOLD)}</span>
      </div>
      <p className="mt-2 text-sm text-slate-700">{statusText}</p>
      {turnover >= 40_000 && !state.vatRegistered ? <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm font-medium text-amber-900">Nær registreringsgrensen. Avstem omsetningen mot regnskapet nå.</p> : null}
      <p className="mt-2 text-xs text-slate-600">{missingDateText}</p>
      <a className="mt-3 inline-block text-sm text-blue-800 underline" href="https://www.skatteetaten.no/bedrift-og-organisasjon/avgifter/mva/registrere-endre-slette/" target="_blank" rel="noreferrer">Skatteetaten · MVA-registeret</a>
    </article>
  );
}

function vatTrackerStatus(state: EnkComplianceState, turnover: number): string {
  if (!state.vatRegistered) {
    return money(Math.max(0, VAT_REGISTRATION_THRESHOLD - turnover)) + " gjenstår etter registrerte fakturaer i CRM.";
  }
  let status = "Registrert i MVA-registeret";
  if (state.vatRegistrationDate) status += " fra " + state.vatRegistrationDate;
  return status + ".";
}

function InvoiceControl({ invoices, missingDates, sequentialNumbers }: Readonly<{ invoices: ComplianceInvoice[]; missingDates: number; sequentialNumbers: boolean }>) {
  return (
    <article className="rounded-lg border border-indigo-100 bg-white p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-950"><ReceiptText aria-hidden="true" className="size-5 text-indigo-700" />Fakturakontroll</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        <CheckLine ok={sequentialNumbers} text={`${invoices.length} fakturanumre registrert${sequentialNumbers ? " i sammenhengende rekkefølge" : " – kontroller nummerrekken"}.`} />
        <CheckLine ok={missingDates === 0} text={missingDates === 0 ? "Alle fakturadatoer er registrert i CRM." : `${missingDates} faktura(er) mangler fakturadato i CRM.`} />
        <CheckLine ok text="Maskinell fakturanummerering er klargjort fra 2026-006." />
      </ul>
      <details className="mt-3 text-sm text-slate-700"><summary className="cursor-pointer font-medium">Vis obligatoriske kontrollpunkter</summary><ul className="mt-2 list-disc space-y-1 pl-5"><li>Dato for salg og levering</li><li>Registrert foretaksnavn og organisasjonsnummer</li><li>Kundens navn og adresse eller organisasjonsnummer</li><li>Tydelig leveransebeskrivelse, pris, totalbeløp og betalingsfrist</li><li>«MVA» bare etter godkjent MVA-registrering</li><li>Feil i sendt faktura korrigeres med kreditnota</li></ul></details>
    </article>
  );
}

function CheckLine({ ok, text }: Readonly<{ ok: boolean; text: string }>) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;
  return <li className="flex gap-2"><Icon aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${ok ? "text-emerald-700" : "text-amber-700"}`} /><span>{text}</span></li>;
}

function ComplianceTaskCard({ definition, state, canEdit, onStatusChange, onFieldChange }: Readonly<{
  definition: TaskDefinition;
  state: EnkComplianceState;
  canEdit: boolean;
  onStatusChange: (status: ComplianceStatus) => void;
  onFieldChange: (field: "completedDate" | "note", value: string) => void;
}>) {
  const task = state.tasks[definition.id];
  return (
    <article className="rounded-lg border border-indigo-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{definition.category}</span><h4 className="mt-1 font-semibold text-slate-950">{definition.title}</h4></div><span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{definition.due}</span></div>
      <p className="mt-2 text-sm text-slate-700">{definition.explanation}</p>
      <a className="mt-2 inline-block text-xs text-blue-800 underline" href={definition.sourceUrl} target="_blank" rel="noreferrer">{definition.source}</a>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">Status<select value={task.status} disabled={!canEdit} onChange={(event) => onStatusChange(event.target.value as ComplianceStatus)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-700">Fullført dato<input type="date" value={task.completedDate} disabled={!canEdit || task.status !== "completed"} onChange={(event) => onFieldChange("completedDate", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100" /></label>
      </div>
      <label className="mt-2 block text-xs font-medium text-slate-700">Notat<input value={task.note} disabled={!canEdit} maxLength={500} onChange={(event) => onFieldChange("note", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm disabled:bg-slate-100" /></label>
    </article>
  );
}

function BookkeepingAndSettings({ state, canEdit, setState }: Readonly<{ state: EnkComplianceState; canEdit: boolean; setState: React.Dispatch<React.SetStateAction<EnkComplianceState>> }>) {
  const numberValue = (value: number | null) => value === null ? "" : String(value);
  const updateAmount = (field: "expectedAnnualProfit" | "taxReserved", value: string) => setState((current) => ({ ...current, [field]: value === "" ? null : Number(value) }));
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <article className="rounded-lg border border-indigo-100 bg-white p-4"><h3 className="font-semibold text-slate-950">Regnskap og skatteavsetning</h3><p className="mt-1 text-sm text-slate-700">Månedsavstemming er en intern, strengere rutine. Bokføringen skal uansett holdes ajour etter bokføringsreglene.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-slate-700">Forventet årsoverskudd<input type="number" min="0" step="100" value={numberValue(state.expectedAnnualProfit)} disabled={!canEdit} onChange={(event) => updateAmount("expectedAnnualProfit", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100" /></label><label className="text-xs font-medium text-slate-700">Faktisk satt av til skatt<input type="number" min="0" step="100" value={numberValue(state.taxReserved)} disabled={!canEdit} onChange={(event) => updateAmount("taxReserved", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100" /></label></div><label className="mt-3 block text-xs font-medium text-slate-700">Regnskap sist avstemt<input type="date" value={state.lastBookkeepingReconciled} disabled={!canEdit} onChange={(event) => setState((current) => ({ ...current, lastBookkeepingReconciled: event.target.value }))} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100" /></label><p className="mt-3 text-xs text-slate-600">Kontroller inntekter, utgifter, kvitteringer, bank, ubetalte fakturaer, skatteavsetning og MVA-grunnlag. Regnskapsmateriale skal normalt oppbevares i minst fem år.</p></article>
      <article className="rounded-lg border border-indigo-100 bg-white p-4"><h3 className="font-semibold text-slate-950">Regler som aktiveres ved behov</h3><div className="mt-3 space-y-3"><Toggle label="Registrert i MVA-registeret" checked={state.vatRegistered} disabled={!canEdit} onChange={(checked) => setState((current) => ({ ...current, vatRegistered: checked }))} />{state.vatRegistered ? <label className="block text-xs font-medium text-slate-700">Registrert fra<input type="date" value={state.vatRegistrationDate} disabled={!canEdit} onChange={(event) => setState((current) => ({ ...current, vatRegistrationDate: event.target.value }))} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100" /></label> : null}<Toggle label="Har ansatte eller utbetaler lønn" checked={state.hasEmployees} disabled={!canEdit} onChange={(checked) => setState((current) => ({ ...current, hasEmployees: checked }))} /><Toggle label="Har kontantsalg etter kassasystemreglene" checked={state.hasCashSales} disabled={!canEdit} onChange={(checked) => setState((current) => ({ ...current, hasCashSales: checked }))} /><Toggle label="Har plikt til å sende årsregnskap" checked={state.hasAnnualAccountsObligation} disabled={!canEdit} onChange={(checked) => setState((current) => ({ ...current, hasAnnualAccountsObligation: checked }))} /></div></article>
    </div>
  );
}

function Toggle({ label, checked, disabled, onChange }: Readonly<{ label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }>) {
  return <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 px-3 text-sm text-slate-800"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="size-4" />{label}</label>;
}

function ConditionalModules({ state }: Readonly<{ state: EnkComplianceState }>) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <ConditionalCard title="MVA-meldinger" active={state.vatRegistered}>{state.vatRegistered ? <ul className="space-y-1">{mvaDeadlines.map((deadline) => <li key={deadline}>{deadline}</li>)}</ul> : "Aktiveres først etter registrering i MVA-registeret."}</ConditionalCard>
      <ConditionalCard title="Ansatte og a-melding" active={state.hasEmployees}>{state.hasEmployees ? "A-melding leveres normalt den 5. i måneden etter ansettelse eller lønnsutbetaling. Kontroller aktuell frist i Altinn." : "Skjult så lenge foretaket ikke har ansatte eller lønnsutbetalinger."}</ConditionalCard>
      <ConditionalCard title="Kontantsalg og kassasystem" active={state.hasCashSales}>{state.hasCashSales ? "Kontroller at kassasystem og dokumentasjon oppfyller kassasystemreglene før kontantsalg." : "Skjult så lenge virksomheten ikke har kontantsalg etter kassasystemreglene."}</ConditionalCard>
      <ConditionalCard title="Årsregnskap til Regnskapsregisteret" active={state.hasAnnualAccountsObligation}>{state.hasAnnualAccountsObligation ? "Plikten er markert som aktiv. Registrer konkret leveringsfrist og bekreftelse etter avklaring av regnskapsplikten." : "Ikke aktivert. Vanlig bokføringsplikt og skattemelding gjelder fortsatt."}</ConditionalCard>
    </div>
  );
}

function ConditionalCard({ title, active, children }: Readonly<{ title: string; active: boolean; children: React.ReactNode }>) {
  return <article className={`rounded-lg border p-4 text-sm ${active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-slate-950">{title}</h3><span className={`rounded px-2 py-1 text-xs font-semibold ${active ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>{active ? "Aktiv" : "Ikke aktiv"}</span></div><div className="mt-2 text-slate-700">{children}</div></article>;
}
