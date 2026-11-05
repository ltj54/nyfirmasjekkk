"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileLock2 } from "lucide-react";

import type { InvoiceRegisterRecord, InvoiceRegisterStatus } from "@/lib/invoice-register";
import { osloToday } from "@/lib/crm-events";

const emptyStatus: InvoiceRegisterStatus = {
  ready: false,
  nextInvoiceNumber: "Laster …",
  issuedCount: 0,
  firstAutomaticNumber: "2026-006",
  records: [],
};

type InvoiceForm = {
  customerName: string;
  customerAddress: string;
  customerOrgNumber: string;
  customerEmail: string;
  description: string;
  deliveryDate: string;
  deliveryPlace: string;
  amount: string;
};

function emptyForm(): InvoiceForm {
  return {
    customerName: "",
    customerAddress: "",
    customerOrgNumber: "",
    customerEmail: "",
    description: "",
    deliveryDate: osloToday(),
    deliveryPlace: "Digital levering",
    amount: "1990",
  };
}

export function InvoiceNumberingControl({ canEdit }: Readonly<{ canEdit: boolean }>) {
  const [status, setStatus] = useState(emptyStatus);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [issued, setIssued] = useState<InvoiceRegisterRecord | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/invoice-register", { cache: "no-store", signal: controller.signal });
        const body = await response.json() as InvoiceRegisterStatus & { error?: string };
        if (response.ok) setStatus(body);
        else setMessage(body.error ?? "Kunne ikke lese fakturanummereringen.");
      } catch {
        if (!controller.signal.aborted) setMessage("Fakturanummereringen er utilgjengelig akkurat nå.");
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  function update(field: keyof InvoiceForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm(`Utsted og lås faktura ${status.nextInvoiceNumber}? Opplysningene kan ikke redigeres eller slettes etterpå.`)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/invoice-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount.replace(",", ".")) }),
      });
      const body = await response.json() as { invoice?: InvoiceRegisterRecord; error?: string };
      if (!response.ok || !body.invoice) {
        setMessage(body.error ?? "Fakturaen kunne ikke utstedes.");
        return;
      }
      setIssued(body.invoice);
      setStatus((current) => ({
        ...current,
        nextInvoiceNumber: `${body.invoice!.invoiceNumber.slice(0, 5)}${String(Number(body.invoice!.invoiceNumber.slice(5)) + 1).padStart(3, "0")}`,
        issuedCount: current.issuedCount + 1,
        records: [...current.records, body.invoice!],
      }));
      setForm(emptyForm());
      setShowForm(false);
      setMessage(`Faktura ${body.invoice.invoiceNumber} er utstedt og låst. Ingen e-post er sendt.`);
    } catch {
      setMessage("Fakturaen kunne ikke utstedes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-950"><FileLock2 aria-hidden="true" className="size-5 text-emerald-700" />Lokal fakturanummerering</h3>
      <p className="mt-2 text-sm text-slate-700">Nummeret tildeles av applikasjonen først når fakturaen utstedes. Utstedte poster lagres i en append-only logg med kontrollhash og kan ikke redigeres eller slettes fra løsningen.</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-slate-600">Neste nummer</dt><dd className="font-semibold">{status.nextInvoiceNumber}</dd></div>
        <div><dt className="text-xs text-slate-600">Automatisk serie fra</dt><dd className="font-semibold">{status.firstAutomaticNumber}</dd></div>
        <div><dt className="text-xs text-slate-600">Utstedt i løsningen</dt><dd className="font-semibold">{status.issuedCount}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-slate-600">Faktura 2026-001–005 beholdes som historisk dokumentasjon. Denne funksjonen sender aldri faktura eller e-post automatisk.</p>
      {status.issuedCount > 0 ? <a className="mt-2 inline-block text-sm text-blue-800 underline" href="/api/invoice-register?download=1">Last ned sikkerhetskopi av fakturaregisteret</a> : null}

      {canEdit && status.ready ? <button type="button" onClick={() => setShowForm((value) => !value)} className="mt-3 min-h-11 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">{showForm ? "Lukk" : "Opprett neste faktura"}</button> : null}
      {showForm ? <InvoiceFormFields form={form} saving={saving} onUpdate={update} onSubmit={submit} /> : null}
      {issued ? <p className="mt-3 text-sm"><a className="font-medium text-blue-800 underline" href={`/faktura/${issued.invoiceNumber}`} target="_blank" rel="noreferrer">Åpne faktura {issued.invoiceNumber} <ExternalLink aria-hidden="true" className="inline size-3" /></a></p> : null}
      {message ? <output className="mt-3 block text-sm text-slate-700">{message}</output> : null}
    </article>
  );
}

function InvoiceFormFields({ form, saving, onUpdate, onSubmit }: Readonly<{
  form: InvoiceForm;
  saving: boolean;
  onUpdate: (field: keyof InvoiceForm, value: string) => void;
  onSubmit: (event: React.SubmitEvent<HTMLFormElement>) => void;
}>) {
  return (
    <form className="mt-4 grid gap-3 rounded-md border border-emerald-200 bg-white p-4 sm:grid-cols-2" onSubmit={onSubmit}>
      <Field label="Kundens navn"><input required value={form.customerName} onChange={(event) => onUpdate("customerName", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></Field>
      <Field label="Kundens org.nr. (hvis tilgjengelig)"><input value={form.customerOrgNumber} onChange={(event) => onUpdate("customerOrgNumber", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></Field>
      <Field label="Kundens adresse"><textarea required value={form.customerAddress} onChange={(event) => onUpdate("customerAddress", event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 p-3" /></Field>
      <Field label="Kundens e-post"><input type="email" value={form.customerEmail} onChange={(event) => onUpdate("customerEmail", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></Field>
      <Field label="Leveransedato"><input required type="date" value={form.deliveryDate} onChange={(event) => onUpdate("deliveryDate", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></Field>
      <Field label="Leveringssted"><input required value={form.deliveryPlace} onChange={(event) => onUpdate("deliveryPlace", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></Field>
      <Field label="Beskrivelse"><textarea required value={form.description} onChange={(event) => onUpdate("description", event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 p-3" /></Field>
      <Field label="Beløp i NOK"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => onUpdate("amount", event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3" /></Field>
      <div className="sm:col-span-2"><p className="mb-3 text-xs text-amber-800">Kontroller alt før utstedelse. Fakturadato settes til dagens dato og forfall til 14 dager. Fakturaen låses, men sendes ikke.</p><button type="submit" disabled={saving} className="min-h-11 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Utsteder …" : "Utsted og lås faktura"}</button></div>
    </form>
  );
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return <label className="text-xs font-medium text-slate-700">{label}{children}</label>;
}

