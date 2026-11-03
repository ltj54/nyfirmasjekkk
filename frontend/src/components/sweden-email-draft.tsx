"use client";

import { useRef, useState } from "react";

import { suggestedSwedishWebsiteIdea, swedishActivityDescription, swedishWebsiteOfferDraft } from "@/lib/sweden-email-draft";
import type { SwedishOutreachRecord } from "@/lib/sweden-outreach-log";

function localDateTimeNow(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function SwedishEmailDraft({ companyName, businessDescription, recipient, onRecorded }: Readonly<{
  companyName: string;
  businessDescription: string;
  recipient: string;
  onRecorded: (record: SwedishOutreachRecord) => void;
}>) {
  const [activity, setActivity] = useState(() => swedishActivityDescription(businessDescription));
  const [idea, setIdea] = useState(() => suggestedSwedishWebsiteIdea(businessDescription));
  const [noWebsiteFoundManually, setNoWebsiteFoundManually] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [recordFormOpen, setRecordFormOpen] = useState(false);
  const [recordRecipient, setRecordRecipient] = useState(recipient);
  const [recordSubject, setRecordSubject] = useState("");
  const [recordBody, setRecordBody] = useState("");
  const [sentAtLocal, setSentAtLocal] = useState(localDateTimeNow);
  const [confirmedSent, setConfirmedSent] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordError, setRecordError] = useState("");
  const requestId = useRef<string | null>(null);
  const draft = swedishWebsiteOfferDraft({ companyName, activity, idea, noWebsiteFoundManually });

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(`Ämne: ${draft.subject}\n\n${draft.body}`);
      setCopyStatus("Utkastet er kopiert. Kontroller teksten og mottakeren før eventuell sending.");
    } catch {
      setCopyStatus("Kunne ikke kopiere automatisk. Marker og kopier teksten i feltet.");
    }
  }

  function openRecordForm() {
    setRecordRecipient(recipient);
    setRecordSubject(draft.subject);
    setRecordBody(draft.body);
    setSentAtLocal(localDateTimeNow());
    setConfirmedSent(false);
    setRecordError("");
    setRecordFormOpen(true);
  }

  async function recordSent(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecordBusy(true);
    setRecordError("");
    try {
      requestId.current ??= crypto.randomUUID();
      const response = await fetch("/api/sweden-outreach-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current, confirmedSent, companyName, companyType: "E",
          recipient: recordRecipient, subject: recordSubject, body: recordBody,
          sentAt: new Date(sentAtLocal).toISOString() }),
        cache: "no-store",
      });
      const result = await response.json() as { record?: SwedishOutreachRecord; error?: string };
      if (!response.ok || !result.record) {
        setRecordError(result.error ?? "Kunne ikke lagre kontaktregistreringen.");
        return;
      }
      requestId.current = null;
      setRecordFormOpen(false);
      onRecorded(result.record);
    } catch {
      setRecordError("Forbindelsen ble brutt. Kontroller loggen før du prøver på nytt.");
    } finally {
      setRecordBusy(false);
    }
  }

  return <details className="mt-4 border-t border-slate-200 pt-3 text-sm">
    <summary className="cursor-pointer font-medium text-blue-800">Lag svensk e-postutkast · sendes ikke</summary>
    <p className="mt-2 text-xs text-slate-600">Utkastet er bare et forslag. Kontroller virksomhetsbeskrivelse, nettside, mottaker og gjeldende reservasjoner manuelt før eventuell kontakt.</p>
    <label className="mt-3 block">
      <span className="block font-medium text-slate-700">Virksomhetens aktivitet i naturlig svensk</span>
      <textarea value={activity} onChange={(event) => setActivity(event.target.value)} rows={2} className="mt-1 block w-full rounded border border-slate-300 p-2" />
    </label>
    <label className="mt-3 block">
      <span className="block font-medium text-slate-700">Konkret idé til nettsiden</span>
      <textarea value={idea} onChange={(event) => setIdea(event.target.value)} rows={2} className="mt-1 block w-full rounded border border-slate-300 p-2" />
    </label>
    <label className="mt-3 flex items-start gap-2 text-slate-700">
      <input type="checkbox" checked={noWebsiteFoundManually} onChange={(event) => setNoWebsiteFoundManually(event.target.checked)} className="mt-1" />
      <span>Jeg har søkt manuelt og fant ingen nettside for denne virksomheten</span>
    </label>
    <label className="mt-3 block">
      <span className="block font-medium text-slate-700">Emne</span>
      <input value={draft.subject} readOnly className="mt-1 block w-full rounded border border-slate-300 bg-white p-2" />
    </label>
    <label className="mt-3 block">
      <span className="block font-medium text-slate-700">E-postutkast</span>
      <textarea value={draft.body} readOnly rows={19} className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 font-sans leading-relaxed" />
    </label>
    <button type="button" onClick={() => void copyDraft()} className="mt-3 rounded bg-blue-800 px-3 py-2 font-medium text-white">Kopier utkast</button>
    {copyStatus ? <output className="mt-2 block text-xs text-slate-700">{copyStatus}</output> : null}
    <p className="mt-2 text-xs text-slate-600">Ingen e-post sendes, og ingenting registreres som sendt i CRM.</p>
    {!recordFormOpen ? <button type="button" onClick={openRecordForm} className="mt-3 block rounded border border-slate-300 bg-white px-3 py-2 font-medium text-slate-800">Registrer e-post som allerede er sendt</button> : null}
    {recordFormOpen ? <form onSubmit={(event) => void recordSent(event)} className="mt-4 space-y-3 rounded border border-slate-300 bg-slate-50 p-3">
      <p className="font-medium">Manuell registrering av sendt e-post</p>
      <p className="text-xs text-slate-600">Dette sender ingenting. Kontroller at feltene nedenfor er identiske med det du faktisk sendte.</p>
      <label className="block"><span>Mottaker</span><input type="email" required maxLength={320} value={recordRecipient} onChange={(event) => setRecordRecipient(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
      <label className="block"><span>Sendt dato og klokkeslett</span><input type="datetime-local" required value={sentAtLocal} onChange={(event) => setSentAtLocal(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
      <label className="block"><span>Faktisk emne</span><input required maxLength={500} value={recordSubject} onChange={(event) => setRecordSubject(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
      <label className="block"><span>Faktisk e-posttekst</span><textarea required maxLength={20_000} rows={12} value={recordBody} onChange={(event) => setRecordBody(event.target.value)} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
      <label className="flex items-start gap-2"><input type="checkbox" required checked={confirmedSent} onChange={(event) => setConfirmedSent(event.target.checked)} className="mt-1" /><span>Jeg bekrefter at e-posten allerede er sendt manuelt, og at mottaker og tekst stemmer.</span></label>
      {recordError ? <p role="alert" className="text-red-800">{recordError}</p> : null}
      <div className="flex gap-2"><button type="submit" disabled={recordBusy} className="rounded bg-blue-800 px-3 py-2 font-medium text-white disabled:opacity-50">{recordBusy ? "Lagrer …" : "Lagre i svensk kontaktlogg"}</button><button type="button" disabled={recordBusy} onClick={() => setRecordFormOpen(false)} className="rounded border border-slate-300 px-3 py-2">Avbryt</button></div>
    </form> : null}
  </details>;
}
