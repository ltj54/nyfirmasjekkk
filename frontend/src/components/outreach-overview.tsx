"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileUp, Mail, RefreshCw, Settings2, XCircle } from "lucide-react";

import type { OutreachStatus } from "@/lib/company-check";
import {
  formatLogDateTime,
  formatOutreachOfferType,
  getLatestOutreachEntriesByOrg,
  getOutreachEntriesDueForFollowUp,
  getOutreachSortValue,
} from "@/lib/company-formatters";
import { Button } from "@/components/ui/button";

type PipelineTone = "review" | "contacted" | "followup" | "inactive";

export function OutreachOverview({
  entries,
  error,
  importMessage,
  isImporting,
  isFollowUpBatchSending,
  isLoading,
  onImportAction,
  onMarkNotRelevantAction,
  onOpenCompanyAction,
  onRefreshAction,
  onSendFollowUpBatchAction,
}: Readonly<{
  entries: OutreachStatus[];
  error: string | null;
  importMessage: string | null;
  isImporting: boolean;
  isFollowUpBatchSending: boolean;
  isLoading: boolean;
  onImportAction: (file: File) => void;
  onMarkNotRelevantAction: (entry: OutreachStatus) => Promise<boolean>;
  onOpenCompanyAction: (orgNumber: string) => void;
  onRefreshAction: () => void;
  onSendFollowUpBatchAction: (entries: OutreachStatus[]) => void;
}>) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [showAdministration, setShowAdministration] = useState(false);
  const [eventLimit, setEventLimit] = useState(20);
  const [markingBatchByOrg, setMarkingBatchByOrg] = useState<Record<string, boolean>>({});
  const [selectedFollowUpByOrg, setSelectedFollowUpByOrg] = useState<Record<string, boolean>>({});
  const logEntries = [...entries].sort((left, right) => getOutreachSortValue(right).localeCompare(getOutreachSortValue(left)));
  const latestEntries = getLatestOutreachEntriesByOrg(logEntries);
  const reviewEntries = latestEntries.filter((entry) => entry.status === "reverted" || entry.status === "batch_excluded");
  const followUpEntries = getOutreachEntriesDueForFollowUp(logEntries);
  const followUpOrgNumbers = new Set(followUpEntries.map((entry) => entry.orgNumber));
  const contactedEntries = latestEntries.filter((entry) =>
    entry.status === "replied" || (entry.status === "sent" && !followUpOrgNumbers.has(entry.orgNumber))
  );
  const notRelevantEntries = latestEntries.filter((entry) => entry.status === "not_relevant");
  const followUpKey = followUpEntries.map((entry) => entry.orgNumber).join("|");
  const selectedFollowUpEntries = followUpEntries.filter((entry) => selectedFollowUpByOrg[entry.orgNumber]);

  useEffect(() => {
    setSelectedFollowUpByOrg((current) => {
      const validSelected = followUpEntries.filter((entry) => current[entry.orgNumber]).slice(0, 10);
      const selected = validSelected.length > 0 ? validSelected : followUpEntries.slice(0, 10);
      return Object.fromEntries(selected.map((entry) => [entry.orgNumber, true]));
    });
  // The serialized key changes only when the follow-up queue changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUpKey]);

  return (
    <section className="mx-auto max-w-7xl px-6 py-8" id="outreach">
      <div className="flex flex-col gap-4 border-b border-[#D9E2EC] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase text-[#52606D]">Utsendelser</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#1F2933]">Arbeidskø og oppfølging</h1>
          <p className="mt-2 text-[13px] text-[#52606D]">Siste status per virksomhet. Første oppfølging blir synlig etter fire arbeidsdager.</p>
        </div>
        <div className="flex gap-2">
          <Button className="rounded-sm" disabled={isLoading} onClick={onRefreshAction} type="button" variant="outline">
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            Oppdater
          </Button>
          <Button
            aria-expanded={showAdministration}
            className="rounded-sm"
            onClick={() => setShowAdministration((current) => !current)}
            type="button"
            variant="outline"
          >
            <Settings2 className="size-4" />
            Administrasjon
          </Button>
        </div>
      </div>

      {importMessage ? <p className="mt-4 border border-[#C7DFF8] bg-[#F8FBFF] px-4 py-3 text-[13px] font-medium text-[#1F5FA9]">{importMessage}</p> : null}
      {error ? <p className="mt-4 border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">{error}</p> : null}

      <div className="mt-6 border border-[#C7DFF8] bg-[#F8FBFF] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#1F2933]">Oppfølgingsbatch</h2>
            <p className="mt-1 text-[12px] text-[#52606D]">Én oppfølging per virksomhet. Inntil ti mottakere per utsending.</p>
          </div>
          <Button
            className="rounded-sm bg-[#1F5FA9] text-white hover:bg-[#2F6FB2]"
            disabled={selectedFollowUpEntries.length === 0 || isFollowUpBatchSending}
            onClick={() => onSendFollowUpBatchAction(selectedFollowUpEntries)}
            type="button"
          >
            <Mail className="size-4" />
            {isFollowUpBatchSending ? "Sender oppfølging..." : `Send oppfølging (${selectedFollowUpEntries.length})`}
          </Button>
        </div>
        {followUpEntries.length === 0 ? (
          <p className="mt-4 text-[12px] text-[#829AB1]">Ingen virksomheter er klare for oppfølging ennå.</p>
        ) : (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {followUpEntries.map((entry) => {
              const selected = Boolean(selectedFollowUpByOrg[entry.orgNumber]);
              const selectionLimitReached = !selected && selectedFollowUpEntries.length >= 10;
              const isMarking = Boolean(markingBatchByOrg[entry.orgNumber]);
              return (
                <div className="flex items-center gap-3 border border-[#D9E2EC] bg-white p-3" key={entry.orgNumber}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                    <span className="sr-only">Velg {entry.companyName || entry.orgNumber} for oppfølging</span>
                    <input
                      checked={selected}
                      className="mt-0.5 size-4"
                      disabled={isFollowUpBatchSending || isMarking || selectionLimitReached}
                      onChange={(event) => setSelectedFollowUpByOrg((current) => ({ ...current, [entry.orgNumber]: event.target.checked }))}
                      type="checkbox"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-[#1F2933]">{entry.companyName || "Ukjent selskap"}</span>
                      <span className="mt-1 block font-mono text-[10px] text-[#829AB1]">{entry.orgNumber}</span>
                    </span>
                  </label>
                  <Button
                    className="h-7 shrink-0 rounded-sm px-2 text-[11px]"
                    disabled={isFollowUpBatchSending || isMarking}
                    onClick={async () => {
                      setMarkingBatchByOrg((current) => ({ ...current, [entry.orgNumber]: true }));
                      await onMarkNotRelevantAction(entry);
                      setMarkingBatchByOrg((current) => ({ ...current, [entry.orgNumber]: false }));
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <XCircle className="size-3.5" />
                    {isMarking ? "Fjerner..." : "Ikke aktuell"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PipelineColumn emptyText="Ingen virksomheter til ny vurdering." entries={reviewEntries} heading="Til vurdering" onMarkNotRelevant={onMarkNotRelevantAction} onOpenCompany={onOpenCompanyAction} tone="review" />
        <PipelineColumn emptyText="Ingen kontaktede virksomheter." entries={contactedEntries} heading="Kontaktet" onMarkNotRelevant={onMarkNotRelevantAction} onOpenCompany={onOpenCompanyAction} tone="contacted" />
        <PipelineColumn emptyText="Ingen markert for oppfølging." entries={followUpEntries} heading="Følg opp" onMarkNotRelevant={onMarkNotRelevantAction} onOpenCompany={onOpenCompanyAction} tone="followup" />
        <PipelineColumn emptyText="Ingen er markert som ikke aktuell." entries={notRelevantEntries} heading="Ikke aktuell" onOpenCompany={onOpenCompanyAction} tone="inactive" />
      </div>

      {showAdministration ? (
        <div className="mt-8 border-t border-[#D9E2EC] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#1F2933]">Komplett hendelseslogg</h2>
              <p className="mt-1 text-[13px] text-[#52606D]">{logEntries.length} lagrede hendelser. Import og eksport endrer den underliggende loggen.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-sm" onClick={() => { window.location.href = "/api/company-check/outreach/export"; }} type="button" variant="outline">
                <Download className="size-4" />
                Eksporter
              </Button>
              <input
                ref={importInputRef}
                accept=".jsonl,application/x-ndjson,text/plain"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onImportAction(file);
                }}
                type="file"
              />
              <Button className="rounded-sm" disabled={isImporting} onClick={() => importInputRef.current?.click()} type="button" variant="outline">
                <FileUp className="size-4" />
                {isImporting ? "Importerer..." : "Importer"}
              </Button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-[#D9E2EC]">
            <table className="w-full min-w-[900px] border-collapse text-left text-[12px]">
              <thead className="bg-[#F8FBFF] text-[11px] font-semibold uppercase text-[#52606D]">
                <tr>{["Tidspunkt", "Status", "Virksomhet", "Org.nr", "Kanal", "Tilbud", "Notat"].map((column) => <th className="border-b border-[#D9E2EC] px-3 py-2.5" key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {logEntries.slice(0, eventLimit).map((entry) => (
                  <tr className="border-b border-[#E4E7EB] last:border-b-0" key={`${entry.orgNumber}-${entry.timestamp ?? entry.sentAt}-${entry.status}-${entry.note ?? ""}`}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#52606D]">{formatLogDateTime(entry.timestamp ?? entry.sentAt)}</td>
                    <td className="px-3 py-2.5 text-[#52606D]">{formatPipelineStatus(entry)}</td>
                    <td className="px-3 py-2.5"><button className="font-semibold text-[#1F5FA9] hover:underline" onClick={() => onOpenCompanyAction(entry.orgNumber)} type="button">{entry.companyName || "Ukjent selskap"}</button></td>
                    <td className="px-3 py-2.5 font-mono text-[#52606D]">{entry.orgNumber}</td>
                    <td className="px-3 py-2.5 text-[#52606D]">{entry.channel || "-"}</td>
                    <td className="px-3 py-2.5 text-[#52606D]">{formatOutreachOfferType(entry.offerType)}</td>
                    <td className="max-w-sm px-3 py-2.5 text-[#52606D]">{entry.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {eventLimit < logEntries.length ? (
            <Button className="mt-3 rounded-sm" onClick={() => setEventLimit((current) => current + 20)} type="button" variant="outline">Vis 20 til</Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function PipelineColumn({
  emptyText,
  entries,
  heading,
  onMarkNotRelevant,
  onOpenCompany,
  tone,
}: Readonly<{
  emptyText: string;
  entries: OutreachStatus[];
  heading: string;
  onMarkNotRelevant?: (entry: OutreachStatus) => Promise<boolean>;
  onOpenCompany: (orgNumber: string) => void;
  tone: PipelineTone;
}>) {
  const [markingByOrg, setMarkingByOrg] = useState<Record<string, boolean>>({});
  const toneClass = {
    review: "border-t-amber-400",
    contacted: "border-t-emerald-500",
    followup: "border-t-[#1F5FA9]",
    inactive: "border-t-[#9FB3C8]",
  }[tone];

  return (
    <div className={`min-h-56 border border-[#D9E2EC] border-t-4 bg-[#F8FBFF] ${toneClass}`}>
      <div className="flex items-center justify-between border-b border-[#D9E2EC] px-4 py-3">
        <h2 className="text-[14px] font-semibold text-[#1F2933]">{heading}</h2>
        <span className="bg-white px-2 py-0.5 text-[11px] font-semibold text-[#52606D]">{entries.length}</span>
      </div>
      <div className="space-y-2 p-3">
        {entries.length === 0 ? <p className="px-1 py-5 text-[12px] leading-5 text-[#829AB1]">{emptyText}</p> : entries.slice(0, 12).map((entry) => {
          const isMarking = Boolean(markingByOrg[entry.orgNumber]);
          return (
            <div className="border border-[#D9E2EC] bg-white p-3 transition-colors hover:border-[#2F6FB2]" key={entry.orgNumber}>
              <button className="block w-full text-left" onClick={() => onOpenCompany(entry.orgNumber)} type="button">
                <span className="block truncate text-[12px] font-semibold text-[#1F2933]">{entry.companyName || "Ukjent selskap"}</span>
                <span className="mt-1 block font-mono text-[10px] text-[#829AB1]">{entry.orgNumber}</span>
                {entry.note ? <span className="mt-2 line-clamp-2 block text-[11px] leading-4 text-[#52606D]">{entry.note}</span> : null}
              </button>
              {onMarkNotRelevant ? (
                <Button
                  className="mt-3 h-7 w-full rounded-sm text-[11px]"
                  disabled={isMarking}
                  onClick={async () => {
                    setMarkingByOrg((current) => ({ ...current, [entry.orgNumber]: true }));
                    await onMarkNotRelevant(entry);
                    setMarkingByOrg((current) => ({ ...current, [entry.orgNumber]: false }));
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <XCircle className="size-3.5" />
                  {isMarking ? "Fjerner..." : "Ikke aktuell"}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatPipelineStatus(entry: OutreachStatus) {
  switch (entry.status) {
    case "sent": return "Kontaktet";
    case "replied": return "Svar mottatt";
    case "not_relevant": return "Ikke aktuell";
    case "batch_excluded": return "Batch-sperret";
    case "reverted": return "Til vurdering";
    case "sending": return "Utsendelse reservert";
    case "delivery_uncertain": return "Levering uavklart";
    default: return "Uten status";
  }
}
