"use client";

import { useState } from "react";

type MailSummary = { uid: number; subject: string | null; from: string; receivedAt: string | null };
type MailDetail = MailSummary & { body: string };

export function MailboxReview() {
  const [messages, setMessages] = useState<MailSummary[] | null>(null);
  const [selected, setSelected] = useState<MailDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function read(path: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        cache: "no-store",
      });
      const value = await response.json();
      if (!response.ok) {
        setError(value.error ?? "Kunne ikke lese postkassen.");
        return null;
      }
      return value;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kunne ikke lese postkassen.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function loadRecent() {
    setSelected(null);
    const result = await read("/api/mailbox/recent") as MailSummary[] | null;
    if (result) setMessages(result);
  }

  async function loadMessage(uid: number) {
    const result = await read(`/api/mailbox/message/${uid}`) as MailDetail | null;
    if (result) setSelected(result);
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5" aria-labelledby="mailbox-title">
      <h2 id="mailbox-title" className="text-lg font-semibold text-slate-900">E-post til manuell vurdering</h2>
      <p className="mt-1 text-sm text-slate-600">Ingenting hentes automatisk. Lesing skjer bare når du trykker på en knapp. Ingen e-post sendes eller endres her.</p>
      <button type="button" disabled={busy} onClick={loadRecent} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "Leser …" : "Hent de 10 nyeste"}
      </button>
      {error ? <p role="alert" className="mt-3 text-sm text-red-800">{error}</p> : null}
      {messages ? (
        <ul className="mt-4 divide-y divide-slate-200">
          {messages.map((message) => (
            <li key={message.uid} className="py-2">
              <button type="button" disabled={busy} onClick={() => loadMessage(message.uid)} className="text-left text-sm text-blue-800 underline disabled:opacity-50">
                {message.subject || "Uten emne"}
              </button>
              <p className="text-xs text-slate-600">{message.from} · {message.receivedAt ? new Date(message.receivedAt).toLocaleString("nb-NO") : "Ukjent dato"}</p>
            </li>
          ))}
          {messages.length === 0 ? <li className="py-2 text-sm text-slate-600">Ingen meldinger i innboksen.</li> : null}
        </ul>
      ) : null}
      {selected ? (
        <article className="mt-4 rounded-lg bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{selected.subject || "Uten emne"}</h3>
          <p className="text-sm text-slate-600">Fra: {selected.from}</p>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm text-slate-800">{selected.body || "Ingen ren tekst funnet i meldingen."}</pre>
        </article>
      ) : null}
    </section>
  );
}
