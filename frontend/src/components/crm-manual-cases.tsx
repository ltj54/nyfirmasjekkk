import { casesWithoutProject, type CrmManualCaseWithEmail } from "@/lib/crm-manual-cases";

function OriginalEmail({ manualCase }: Readonly<{ manualCase: CrmManualCaseWithEmail }>) {
  return (
    <details className="mt-4 border-t border-slate-200 pt-3">
      <summary className="cursor-pointer py-2 text-sm font-medium text-blue-800">Les hele e-posten med historikk</summary>
      <p className="mt-2 text-xs text-slate-500">Bevart slik Lars limte den inn, inkludert sitert historikk. Mottaksdato står på saken.</p>
      <pre className="mt-3 max-h-[36rem] overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-800">{manualCase.originalEmail}</pre>
    </details>
  );
}

export function ProjectManualEmails({ cases }: Readonly<{ cases: CrmManualCaseWithEmail[] }>) {
  if (cases.length === 0) return null;
  return (
    <details className="mt-4 border-t border-slate-200 pt-3">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">Tidligere kundesvar ({cases.length})</summary>
      {cases.map((manualCase) => (
        <div key={manualCase.id} className="mt-3 rounded-md bg-white/70 p-3 text-sm">
          <p className="font-medium text-slate-800">Svar fra {manualCase.contactName} · {new Date(manualCase.receivedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}</p>
          <OriginalEmail manualCase={manualCase} />
        </div>
      ))}
    </details>
  );
}

function ManualCaseCard({ manualCase }: Readonly<{ manualCase: CrmManualCaseWithEmail }>) {
  const received = new Date(manualCase.receivedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" });
  return (
    <article className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-semibold text-slate-900">{manualCase.companyName}</h3>
      <p className="mt-1 text-sm text-slate-600">{manualCase.contactName} · Org.nr. {manualCase.orgNumber}</p>
      <p className="mt-1 break-all text-sm text-slate-600">{manualCase.email}</p>
      <p className="mt-3 inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">{manualCase.status}</p>
      <dl className="mt-4 space-y-3 text-sm">
        <div><dt className="font-medium text-slate-700">Svar mottatt</dt><dd className="mt-1 text-slate-600">{received}</dd></div>
        <div><dt className="font-medium text-slate-700">Vurdering</dt><dd className="mt-1 text-slate-600">{manualCase.summary}</dd></div>
        <div><dt className="font-medium text-slate-700">Neste steg</dt><dd className="mt-1 text-slate-600">{manualCase.nextStep}</dd></div>
        <div><dt className="font-medium text-slate-700">Intern vurderingsdato</dt><dd className="mt-1 text-slate-600">{manualCase.reviewDate ?? "Ingen dato avtalt eller satt"}</dd></div>
      </dl>
      <OriginalEmail manualCase={manualCase} />
    </article>
  );
}

export function CrmManualCases({ cases, error, loading, projectOrganizationNumbers }: Readonly<{
  cases: CrmManualCaseWithEmail[];
  error: string;
  loading: boolean;
  projectOrganizationNumbers: ReadonlySet<string>;
}>) {
  const unassignedCases = casesWithoutProject(cases, projectOrganizationNumbers);
  return (
    <section id="crm-manual-cases" aria-labelledby="crm-manual-cases-title" className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h2 id="crm-manual-cases-title" className="text-lg font-semibold text-slate-900">Manuelle saker · senere eller uavklart</h2>
      <p className="mt-2 text-sm text-slate-600">Bevarte kundesvar med original e-post. En intern vurdering betyr ikke at ny kontakt er avtalt. Sakene utløser ingen e-post eller automatisk oppfølging.</p>
      <div aria-live="polite" aria-busy={loading}>
        {loading ? <p className="mt-4 text-sm text-slate-500">Henter registrerte saker …</p> : null}
        {error ? <p role="alert" className="mt-4 text-sm text-red-800">{error}</p> : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">{unassignedCases.map((manualCase) => <ManualCaseCard key={manualCase.id} manualCase={manualCase} />)}</div>
      </div>
    </section>
  );
}
