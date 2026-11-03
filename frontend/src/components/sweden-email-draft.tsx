"use client";

import { useState } from "react";

import { suggestedSwedishWebsiteIdea, swedishActivityDescription, swedishWebsiteOfferDraft } from "@/lib/sweden-email-draft";

export function SwedishEmailDraft({ companyName, businessDescription }: Readonly<{
  companyName: string;
  businessDescription: string;
}>) {
  const [activity, setActivity] = useState(() => swedishActivityDescription(businessDescription));
  const [idea, setIdea] = useState(() => suggestedSwedishWebsiteIdea(businessDescription));
  const [noWebsiteFoundManually, setNoWebsiteFoundManually] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const draft = swedishWebsiteOfferDraft({ companyName, activity, idea, noWebsiteFoundManually });

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(`Ämne: ${draft.subject}\n\n${draft.body}`);
      setCopyStatus("Utkastet er kopiert. Kontroller teksten og mottakeren før eventuell sending.");
    } catch {
      setCopyStatus("Kunne ikke kopiere automatisk. Marker og kopier teksten i feltet.");
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
  </details>;
}
