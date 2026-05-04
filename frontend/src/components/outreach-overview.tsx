"use client";

import { useRef, useState } from "react";

import type { OutreachStatus } from "@/lib/company-check";
import {
  formatLogDate,
  formatLogDateTime,
  formatNokPrice,
  getActiveContactedOutreachEntries,
  getNotRelevantOutreachEntries,
  getOutreachSortValue,
} from "@/lib/company-formatters";
import { Button } from "@/components/ui/button";

export function OutreachOverview({
  entries,
  error,
  importMessage,
  isImporting,
  isLoading,
  onImport,
  onOpenCompany,
  onRefresh,
}: {
  entries: OutreachStatus[];
  error: string | null;
  importMessage: string | null;
  isImporting: boolean;
  isLoading: boolean;
  onImport: (file: File) => void;
  onOpenCompany: (orgNumber: string) => void;
  onRefresh: () => void;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [activeContactedLimit, setActiveContactedLimit] = useState(10);
  const [notRelevantLimit, setNotRelevantLimit] = useState(10);
  const [noteLimit, setNoteLimit] = useState(10);
  const logEntries = [...entries].sort((left, right) => getOutreachSortValue(right).localeCompare(getOutreachSortValue(left)));
  const activeContactedEntries = getActiveContactedOutreachEntries(logEntries);
  const notRelevantEntries = getNotRelevantOutreachEntries(logEntries);
  const noteEntries = logEntries.filter((entry) => Boolean(entry.note?.trim()));
  const visibleActiveContactedEntries = activeContactedEntries.slice(0, activeContactedLimit);
  const visibleNotRelevantEntries = notRelevantEntries.slice(0, notRelevantLimit);
  const visibleNoteEntries = noteEntries.slice(0, noteLimit);
  const revertedCount = logEntries.filter((entry) => entry.status === "reverted").length;
  const sentCount = logEntries.filter((entry) => entry.status === "sent").length;

  return (
    <section id="outreach" className="mx-auto max-w-7xl px-6 pt-10">
      <div className="border border-[#D9E2EC] bg-white">
        <div className="flex flex-col gap-4 border-b border-[#D9E2EC] px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-medium text-[#52606D]">Utsendelseslogg</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-[#1F2933]">Komplett logg</h2>
            <p className="mt-2 text-[13px] font-medium text-[#52606D]">{logEntries.length} hendelser med status eller notat</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-sm border border-[#D9E2EC] bg-white px-4 text-[#52606D] hover:bg-[#F0F4F8]"
              disabled={isLoading}
              onClick={onRefresh}
              type="button"
              variant="outline"
            >
              {isLoading ? "Oppdaterer..." : "Oppdater liste"}
            </Button>
            <button
              className="inline-flex h-8 items-center rounded-sm border border-[#D9E2EC] bg-white px-4 text-sm font-medium text-[#52606D] transition-colors hover:bg-[#F0F4F8]"
              onClick={() => {
                window.location.href = "/api/company-check/outreach/export";
              }}
              type="button"
            >
              Last ned logg
            </button>
            <input
              ref={importInputRef}
              accept=".jsonl,application/x-ndjson,text/plain"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  onImport(file);
                }
              }}
              type="file"
            />
            <button
              className="inline-flex h-8 items-center rounded-sm border border-[#D9E2EC] bg-white px-4 text-sm font-medium text-[#52606D] transition-colors hover:bg-[#F0F4F8] disabled:opacity-50"
              disabled={isImporting}
              onClick={() => importInputRef.current?.click()}
              type="button"
            >
              {isImporting ? "Importerer..." : "Importer logg"}
            </button>
          </div>
        </div>

        {importMessage ? (
          <div className="border-b border-[#D9E2EC] bg-[#F8FBFF] px-5 py-4 text-[13px] font-medium text-[#1F5FA9]">{importMessage}</div>
        ) : null}

        {error ? (
          <div className="border-b border-[#D9E2EC] bg-rose-50 px-5 py-4 text-[13px] font-medium text-rose-700">{error}</div>
        ) : null}

        {logEntries.length === 0 ? (
          <div className="px-5 py-10 text-[14px] font-medium text-[#52606D]">Ingen selskaper har registrert status eller notat ennå.</div>
        ) : (
          <div className="space-y-8 px-5 py-5">
            <div>
              <h3 className="text-[16px] font-semibold text-[#1F2933]">Oppsummering</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoMetric label="Antall hendelser" value={`${logEntries.length}`} />
                <InfoMetric label="Sendt" value={`${sentCount}`} />
                <InfoMetric label="Angret" value={`${revertedCount}`} />
                <InfoMetric label="Aktive kontaktede selskaper" value={`${activeContactedEntries.length}`} />
                <InfoMetric label="Ikke aktuell" value={`${notRelevantEntries.length}`} />
              </div>
            </div>

            <OutreachTable
              columns={["Dato", "Org.nr", "Selskap", "Selskapsform", "Kanal", "Pris", "Tilbud"]}
              emptyText="Ingen aktive kontaktede selskaper."
              entries={visibleActiveContactedEntries}
              heading="Aktive kontaktede selskaper"
              onOpenCompany={onOpenCompany}
              renderDate={(entry) => formatLogDate(entry.sentAt ?? entry.timestamp)}
              totalCount={activeContactedEntries.length}
              visibleCount={visibleActiveContactedEntries.length}
              onCollapse={() => setActiveContactedLimit(10)}
              onShowMore={() => setActiveContactedLimit((current) => current + 10)}
            />

            <OutreachTable
              columns={["Dato", "Org.nr", "Selskap", "Selskapsform", "Kanal", "Pris", "Tilbud"]}
              emptyText="Ingen selskaper er markert som ikke aktuell."
              entries={visibleNotRelevantEntries}
              heading="Ikke aktuell"
              onOpenCompany={onOpenCompany}
              renderDate={(entry) => formatLogDate(entry.timestamp ?? entry.sentAt)}
              totalCount={notRelevantEntries.length}
              visibleCount={visibleNotRelevantEntries.length}
              onCollapse={() => setNotRelevantLimit(10)}
              onShowMore={() => setNotRelevantLimit((current) => current + 10)}
            />

            <NotesTable
              entries={visibleNoteEntries}
              onOpenCompany={onOpenCompany}
              totalCount={noteEntries.length}
              visibleCount={visibleNoteEntries.length}
              onCollapse={() => setNoteLimit(10)}
              onShowMore={() => setNoteLimit((current) => current + 10)}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#D9E2EC] bg-[#F8FBFF] px-4 py-3">
      <p className="text-[11px] font-medium text-[#52606D]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold text-[#1F2933]">{value}</p>
    </div>
  );
}

function OutreachTable({
  columns,
  emptyText,
  entries,
  heading,
  onCollapse,
  onOpenCompany,
  onShowMore,
  renderDate,
  totalCount,
  visibleCount,
}: {
  columns: string[];
  emptyText: string;
  entries: OutreachStatus[];
  heading: string;
  onCollapse: () => void;
  onOpenCompany: (orgNumber: string) => void;
  onShowMore: () => void;
  renderDate: (entry: OutreachStatus) => string;
  totalCount: number;
  visibleCount: number;
}) {
  return (
    <div>
      <h3 className="text-[16px] font-semibold text-[#1F2933]">{heading}</h3>
      {totalCount === 0 ? (
        <p className="mt-3 text-[13px] font-medium text-[#52606D]">{emptyText}</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-[#D9E2EC]">
          <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
            <thead className="bg-[#F8FBFF] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52606D]">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="border-b border-[#D9E2EC] px-4 py-3">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.orgNumber} className="border-b border-[#E4E7EB] last:border-b-0">
                  <td className="px-4 py-3 text-[#52606D]">{renderDate(entry)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#52606D]">{entry.orgNumber}</td>
                  <td className="px-4 py-3">
                    <OpenCompanyButton entry={entry} onOpenCompany={onOpenCompany} />
                  </td>
                  <td className="px-4 py-3 text-[#52606D]">{entry.organizationForm || "-"}</td>
                  <td className="px-4 py-3 text-[#52606D]">{entry.channel || "-"}</td>
                  <td className="px-4 py-3 text-[#52606D]">kr {formatNokPrice(entry.price ?? 4500)}</td>
                  <td className="px-4 py-3 text-[#52606D]">{entry.offerType || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LogListActions currentCount={visibleCount} totalCount={totalCount} onCollapse={onCollapse} onShowMore={onShowMore} />
    </div>
  );
}

function NotesTable({
  entries,
  onCollapse,
  onOpenCompany,
  onShowMore,
  totalCount,
  visibleCount,
}: {
  entries: OutreachStatus[];
  onCollapse: () => void;
  onOpenCompany: (orgNumber: string) => void;
  onShowMore: () => void;
  totalCount: number;
  visibleCount: number;
}) {
  return (
    <div>
      <h3 className="text-[16px] font-semibold text-[#1F2933]">Hendelser</h3>
      {totalCount === 0 ? (
        <p className="mt-3 text-[13px] font-medium text-[#52606D]">Ingen notater registrert ennå.</p>
      ) : (
        <div className="mt-3 overflow-x-auto border border-[#D9E2EC]">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead className="bg-[#F8FBFF] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#52606D]">
              <tr>
                {["Tidspunkt", "Status", "Org.nr", "Selskap", "Selskapsform", "Kanal", "Pris", "Notat"].map((column) => (
                  <th key={column} className="border-b border-[#D9E2EC] px-4 py-3">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={`${entry.orgNumber}-${entry.timestamp ?? entry.sentAt ?? entry.status ?? "event"}`} className="border-b border-[#E4E7EB] last:border-b-0">
                  <td className="px-4 py-3 text-[#52606D]">{formatLogDateTime(entry.timestamp ?? entry.sentAt)}</td>
                  <td className="px-4 py-3 text-[#52606D]">{entry.status || "-"}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-[#52606D]">{entry.orgNumber}</td>
                  <td className="px-4 py-3">
                    <OpenCompanyButton entry={entry} onOpenCompany={onOpenCompany} />
                  </td>
                  <td className="px-4 py-3 text-[#52606D]">{entry.organizationForm || "-"}</td>
                  <td className="px-4 py-3 text-[#52606D]">{entry.channel || "-"}</td>
                  <td className="px-4 py-3 text-[#52606D]">kr {formatNokPrice(entry.price ?? 4500)}</td>
                  <td className="max-w-sm px-4 py-3 text-[#52606D]">{entry.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <LogListActions currentCount={visibleCount} totalCount={totalCount} onCollapse={onCollapse} onShowMore={onShowMore} />
    </div>
  );
}

function OpenCompanyButton({ entry, onOpenCompany }: { entry: OutreachStatus; onOpenCompany: (orgNumber: string) => void }) {
  return (
    <button
      className="font-semibold text-[#1F5FA9] underline-offset-4 hover:underline"
      onClick={() => onOpenCompany(entry.orgNumber)}
      type="button"
    >
      {entry.companyName || "Ukjent selskap"}
    </button>
  );
}

function LogListActions({
  currentCount,
  totalCount,
  onShowMore,
  onCollapse,
}: {
  currentCount: number;
  totalCount: number;
  onShowMore: () => void;
  onCollapse: () => void;
}) {
  if (totalCount <= 10) {
    return null;
  }

  const remainingCount = totalCount - currentCount;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {remainingCount > 0 ? (
        <button
          className="rounded-sm border border-[#D9E2EC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#52606D] hover:bg-[#F0F4F8]"
          onClick={onShowMore}
          type="button"
        >
          Vis mer ({Math.min(10, remainingCount)} til)
        </button>
      ) : null}
      {currentCount > 10 ? (
        <button
          className="rounded-sm border border-[#D9E2EC] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#52606D] hover:bg-[#F0F4F8]"
          onClick={onCollapse}
          type="button"
        >
          Skjul
        </button>
      ) : null}
    </div>
  );
}
