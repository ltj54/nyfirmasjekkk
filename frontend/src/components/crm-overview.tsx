import { CalendarDays, ExternalLink, FileText, Globe2, ReceiptText, UserRound } from "lucide-react";

type ProjectStatus = "working" | "waiting" | "payment" | "completed" | "inactive";

type CrmEvent = { date: string; label: string };

type CrmProject = {
  name: string;
  domain?: string;
  previewUrl?: string;
  previewRemoved?: string;
  inactiveDate?: string;
  outreach: string;
  progress: string;
  invoice: string;
  provider?: string;
  contact: string;
  email: string;
  proposalDate: string;
  dateLabel?: string;
  replyDate?: string;
  nextStep?: string;
  followUpDate?: string;
  responseDeadline?: string;
  domainRemoved?: string;
  invoiceDate?: string;
  invoiceDueDate?: string;
  paymentDate?: string;
  invoiceNumber?: string;
  invoiceFile?: string;
  status: ProjectStatus;
  invoiceAmount?: number;
  sentProposalDate?: string;
};

const projects: CrmProject[] = [
  {
    name: "Idsøe Rådgivning",
    previewUrl: "https://ltj54.github.io/idsoe-radgivning-nettside/index.html",
    contact: "Ella Maria Cosmovici Idsøe",
    email: "e.m.c.idsoe@naturfagsenteret.no",
    proposalDate: "03.09.2026",
    dateLabel: "Henvendelse",
    replyDate: "07.09.2026 kl. 12:47",
    outreach: "Positiv interesse – ønsker forslag til nettside",
    progress: "Ella ønsker et forslag til oppbygging og har egne ideer vi kan diskutere sammen. Hun er opptatt de neste to ukene og foreslår en prat i uke 40 (28.09.–04.10.2026).",
    nextStep: "Videreutvikle utkastet og avtale tidspunkt for en samtale i uke 40. Ingen møtedato er avtalt. Videre dialog håndteres manuelt; ingen automatisk oppfølging.",
    invoice: "Ikke fakturert",
    status: "working",
  },
  {
    name: "Fiskerikandidat Gunnar Davidsson",
    contact: "Gunnar Davidsson",
    email: "Ikke avklart",
    proposalDate: "05.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "22.09.2026 kl. 15:55",
    sentProposalDate: "21.09.2026 kl. 11:02",
    outreach: "Positiv interesse – ber om forslag",
    progress: "Gunnar synes utkastet treffer godt. Han ønsker en enkel, mest mulig frossen nettside med kontaktinformasjon og tjenester innen fiskeri og marine næringer, samt minimalt vedlikehold. Han har et eget bildebibliotek.",
    nextStep: "Avklare domenet davidsson.no, e-post, webhotell og hvem som registrerer domenet. Videre dialog håndteres manuelt; ingen automatisk oppfølging.",
    invoice: "Ikke fakturert",
    status: "working",
  },
  {
    name: "Varneth Management Ness",
    domain: "varneth.eu",
    previewUrl: "https://ltj54.github.io/varneth-management-ness/",
    contact: "Henning Stockmann Ness",
    email: "bhstockmann@gmail.com",
    proposalDate: "09.09.2026",
    dateLabel: "Henvendelse",
    replyDate: "09.09.2026 kl. 15:20",
    paymentDate: "22.09.2026",
    outreach: "Kunde godkjent – publisert",
    progress: "Publisert på varneth.eu. Norsk/engelsk forside med KI-musikk, Broken Veil, Black Veil Hart, rådgivning, publishing og kontaktløsning.",
    nextStep: "Betaling på 1 990 kr mottatt 22.09.2026. Eventuelle innholdsendringer håndteres manuelt.",
    invoiceDate: "16.09.2026",
    invoiceDueDate: "30.09.2026",
    invoiceAmount: 1990, invoiceNumber: "2026-003",
    invoiceFile: "/invoices/faktura-2026-003-varneth-management-ness.pdf",
    invoice: "Betalt · 1 990 kr",
    status: "completed",
  },
  {
    name: "SV Pelsar Sp. z o.o.",
    inactiveDate: "21.09.2026",
    contact: "Serhii Siedin",
    email: "sv.pelsar@gmail.com",
    proposalDate: "03.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "10.09.2026 kl. 18:52",
    outreach: "Inaktiv – ingen svar etter purring",
    progress: "Ber om pris på nettside. Svarsignaturen bruker både Serhii og Sergey; kontaktopplysningene bør avklares før oppstart.",
    followUpDate: "16.09.2026",
    nextStep: "Avsluttet aktiv oppfølging 21.09.2026 etter manglende svar på purring 16.09.2026. Ingen flere purringer. GitHub-repository og lokal prosjektmappe ble ikke funnet; ingen kode eller publisering å arkivere. CRM-kortet beholdes.",
    invoice: "Ikke fakturert",
    status: "inactive",
  },
  {
    name: "MLC Eiendomsfornying Leszczynski",
    inactiveDate: "21.09.2026",
    previewRemoved: "21.09.2026",
    sentProposalDate: "16.09.2026",
    previewUrl: "https://ltj54.github.io/mlc-eiendomsfornying/",
    contact: "Mariusz Leszczynski",
    email: "mkrenpro@gmail.com",
    proposalDate: "12.09.2026",
    dateLabel: "Henvendelse",
    replyDate: "12.09.2026 kl. 15:11",
    outreach: "Arkivert i GitHub – ingen svar på forslag",
    progress: "Ønsker enkel profesjonell énside for Vestfold med takvask, fasadevask, takrenner, terrasser, belegningsstein og klargjøring før salg. Har egne før-/etterbilder.",
    nextStep: String.raw`Arkivert 21.09.2026 etter manglende svar på forslaget sendt 16.09.2026. GitHub-repositoriet er beholdt som sikkerhetskopi. Lokal kopi: C:\Prosjekt\mlc-eiendomsfornying_FJERNET-GITHUB. GitHub Pages er avpublisert. Ingen flere purringer. Ved eventuell videreføring skal kunden eie nettside, kode og filer etter betaling.`,
    invoice: "Ikke fakturert",
    status: "inactive",
  },
  {
    name: "Spilling Advisory",
    previewUrl: "https://ltj54.github.io/spilling-advisory/",
    contact: "Knut Erik Spilling",
    email: "knuterikspilling@gmail.com",
    proposalDate: "08.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "16.09.2026 kl. 16:59",
    outreach: "Avventer – forretningsforbindelse setter opp nettside gratis",
    progress: "Knut så på mock-upen og syntes den var ryddig og grei. En forretningsforbindelse setter nå opp nettsiden gratis som motytelse for tjenester.",
    nextStep: "Knut avventer parallell aktivitet og tar eventuelt kontakt senere. Ingen purring planlagt.",
    invoice: "Ikke fakturert",
    status: "inactive",
  },
  { name: "Breathe Senja", domain: "www.breathesenja.com", contact: "Roland Henriksen", email: "roland.henriksen75@gmail.com", proposalDate: "06.07.2026", paymentDate: "20.07.2026", invoiceAmount: 1990, invoiceNumber: "2026-001", invoiceFile: "/invoices/faktura-2026-001-breathe-senja-betalt.pdf", outreach: "Kunde godkjent", progress: "Ferdig – endelig domene og Formspree i bruk", provider: "Formspree", invoice: "Betalt · 1 990 kr", status: "completed" },
  { name: "Zagros Forlag", domain: "www.zagrosforlag.no", contact: "Eisa Bazyar", email: "post@zagrosforlag.no", proposalDate: "13.08.2026", paymentDate: "18.09.2026", outreach: "Kunde godkjent", progress: "Ferdig – endelig domene og Formspree i bruk", provider: "Formspree", invoiceAmount: 1990, invoiceNumber: "2026-002", invoiceFile: "/invoices/faktura-2026-002-zagros-forlag.pdf", invoice: "Betalt · 1 990 kr", status: "completed" },
  { name: "Minde Momentum", domain: "minde-momentum.ltj-production.no", domainRemoved: "03.09.2026", contact: "Liv Minde", email: "livminde8@gmail.com", proposalDate: "18.08.2026", outreach: "Arkivert i GitHub – ingen avklaring mottatt", progress: "Lokal kopi ligger i minde-momentum_FJERNET-GITHUB. GitHub-repositoriet er arkivert som sikkerhetskopi og kan slettes senere dersom det ikke lenger trengs.", invoice: "Ikke fakturert", status: "inactive" },
  { name: "Skifjelds Håndverk", domain: "skifjelds-handverk.ltj-production.no", domainRemoved: "03.09.2026", contact: "Terje Skifjeld", email: "terje_skifjeld@yahoo.no", proposalDate: "25.08.2026", followUpDate: "27.08.2026", responseDeadline: "02.09.2026", outreach: "Arkivert i GitHub – ingen svar mottatt", progress: "Lokal kopi ligger i skifjelds-handverk_FJERNET-GITHUB. GitHub-repositoriet er arkivert som sikkerhetskopi.", invoice: "Ikke fakturert", status: "inactive" },
  { name: "Casa Latina Trondheim", domain: "casa-latina-trondheim.ltj-production.no", domainRemoved: "08.09.2026", contact: "Sandra Yineth Morales Guerrero", email: "sandraymorales30@gmail.com", proposalDate: "26.08.2026", outreach: "Arkivert i GitHub – ingen svar mottatt", progress: "Lokal kopi ligger i casa-latina-trondheim_FJERNET-GITHUB. GitHub-repositoriet er arkivert som sikkerhetskopi.", invoice: "Ikke fakturert", status: "inactive" },
  { name: "Sammen for Tromsø sine barn", previewUrl: "https://ltj54.github.io/sammen-for-tromsos-barn/", contact: "Alexandra og Kirsti", email: "Ikke avklart", proposalDate: "14.05.2026", dateLabel: "Første forslag", outreach: "Arkivert i GitHub – avventer finansiering", progress: "Forslag til enkel nettside for initiativet. Alexandra og Kirsti ønsket en løsning i retning smarttelefonfri barndom, men enklere, og søkte støtte til etablering.", nextStep: "Lokal kopi ligger i sammen-for-tromsos-barn_FJERNET-GITHUB. GitHub-repositoriet er arkivert; kontaktadresse, domene og eventuell videreføring må avklares senere.", invoice: "Ikke fakturert", status: "inactive" },
];


const statusGroups: ReadonlyArray<{
  status: ProjectStatus; label: string; tone: string; badge: string; collapsed?: boolean;
}> = [
  { status: "working", label: "Under arbeid", tone: "border-blue-200 bg-blue-50", badge: "bg-blue-100 text-blue-900" },
  { status: "waiting", label: "Avventer kunden", tone: "border-yellow-200 bg-yellow-50", badge: "bg-yellow-100 text-yellow-900" },
  { status: "payment", label: "Avventer betaling", tone: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-900" },
  { status: "completed", label: "Ferdig og betalt", tone: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-100 text-emerald-900", collapsed: true },
  { status: "inactive", label: "På vent / arkivert", tone: "border-slate-200 bg-white", badge: "bg-slate-100 text-slate-700", collapsed: true },
];

function dateValue(date: string): number {
  const [day, month, year] = date.slice(0, 10).split(".").map(Number);
  return Date.UTC(year, month - 1, day);
}

function historyFor(project: CrmProject): CrmEvent[] {
  const events: Array<{ date?: string; label: string }> = [
    { date: project.proposalDate, label: project.dateLabel ?? "Første registrerte dato" },
    { date: project.replyDate, label: "Svar mottatt" },
    { date: project.sentProposalDate, label: "Forslag sendt" },
    { date: project.followUpDate, label: "Purring sendt" },
    { date: project.invoiceDate, label: "Faktura sendt" },
    { date: project.domainRemoved, label: "Nettside fjernet" },
    { date: project.paymentDate, label: "Betaling mottatt" },
    { date: project.inactiveDate, label: "Satt inaktiv – ingen videre oppfølging" },
    { date: project.previewRemoved, label: "Testpublisering fjernet" },
  ];
  return events.filter((event): event is CrmEvent => Boolean(event.date))
    .sort((a, b) => dateValue(b.date) - dateValue(a.date));
}

function deadlineFor(project: CrmProject): string | undefined {
  if (project.status === "payment") return project.invoiceDueDate;
  if (project.status === "working" || project.status === "waiting") return project.responseDeadline;
  return undefined;
}

function compareProjects(a: CrmProject, b: CrmProject): number {
  const firstDeadline = deadlineFor(a);
  const secondDeadline = deadlineFor(b);
  if (firstDeadline && secondDeadline) {
    const difference = dateValue(firstDeadline) - dateValue(secondDeadline);
    if (difference !== 0) return difference;
  }
  if (Boolean(firstDeadline) !== Boolean(secondDeadline)) return firstDeadline ? -1 : 1;
  return dateValue(historyFor(a)[0].date) - dateValue(historyFor(b)[0].date)
    || a.name.localeCompare(b.name, "nb");
}

function money(amount: number): string {
  return new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(amount) + " kr";
}

export function CrmOverview() {
  const outstanding = projects.filter((project) => project.status === "payment")
    .reduce((total, project) => total + (project.invoiceAmount ?? 0), 0);
  const paid = projects.filter((project) => project.paymentDate)
    .reduce((total, project) => total + (project.invoiceAmount ?? 0), 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6" id="crm">
      <header className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">CRM · {projects.length} prosjekter</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Prosjekter og kunder</h1>
        <p className="mt-2 text-sm text-slate-600">Status først, nærmeste registrerte frist deretter. Uten frist vises de som har ventet lengst først.</p>
        <nav aria-label="Prosjektstatuser" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {statusGroups.map((group) => (
            <a href={`#crm-${group.status}`} key={group.status} className={`rounded-lg border p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${group.tone}`}>
              <span className="block text-xl font-semibold text-slate-900">{projects.filter((project) => project.status === group.status).length}</span>
              <span className="text-slate-700">{group.label}</span>
            </a>
          ))}
        </nav>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-200 pt-4">
          <div><dt className="text-xs text-slate-600">Utestående fakturert</dt><dd className="text-lg font-semibold text-orange-900">{money(outstanding)}</dd></div>
          <div><dt className="text-xs text-slate-600">Totalt betalt</dt><dd className="text-lg font-semibold text-emerald-900">{money(paid)}</dd></div>
        </dl>
      </header>

      <div className="mt-6 space-y-5">
        {statusGroups.map((group) => {
          const grouped = projects.filter((project) => project.status === group.status).sort(compareProjects);
          return (
            <details key={group.status} id={`crm-${group.status}`} open={!group.collapsed} className="scroll-mt-6 rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer rounded-xl px-5 py-4 text-base font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2">
                <span className={`ml-2 rounded-md px-2 py-1 ${group.badge}`}>{group.label}</span>
                <span className="ml-3 text-sm font-normal text-slate-600">{grouped.length} prosjekter</span>
              </summary>
              <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
                {grouped.map((project) => <ProjectCard key={project.name} project={project} group={group} />)}
                {grouped.length === 0 ? <p className="p-2 text-sm text-slate-500">Ingen prosjekter i denne gruppen.</p> : null}
              </div>
            </details>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-slate-500">Oversikten oppretter ingen automatiske purringer. Frister og neste steg gjelder manuell oppfølging.</p>
    </section>
  );
}

function ProjectCard({ project, group }: Readonly<{
  project: CrmProject; group: (typeof statusGroups)[number];
}>) {
  const history = historyFor(project);
  const latest = history[0];
  const deadline = deadlineFor(project);
  const fallback = project.status === "completed" ? "Ingen utestående betaling."
    : "Ingen aktiv oppfølging planlagt.";
  return (
    <article className={`min-w-0 rounded-lg border p-4 sm:p-5 ${group.tone}`}>
      <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
      <p className="mt-1 flex items-center gap-2 text-sm text-slate-700"><UserRound aria-hidden="true" className="size-4 shrink-0" />{project.contact}</p>
      {project.email.includes("@")
        ? <a href={`mailto:${project.email}`} className="mt-1 block break-all text-sm text-blue-800 underline underline-offset-2">{project.email}</a>
        : <p className="mt-1 text-sm text-slate-500">E-post: {project.email}</p>}
      <span className={`mt-3 inline-block rounded-md px-2 py-1 text-xs font-semibold ${group.badge}`}>{group.label}</span>
      <dl className="mt-4 space-y-3 text-sm">
        <Row icon={CalendarDays} label="Sist datert" value={`${latest.date} · ${latest.label}`} />
        {deadline ? <Row icon={CalendarDays} label={project.status === "payment" ? "Forfall" : "Svarfrist"} value={deadline} /> : null}
        <Row icon={FileText} label="Neste steg" value={project.nextStep ?? fallback} />
        <Row icon={ReceiptText} label="Fakturering" value={project.invoice} />
        {project.invoiceNumber ? <Row icon={ReceiptText} label="Fakturanr." value={project.invoiceNumber} /> : null}
      </dl>
      <div className="mt-4 flex flex-col items-start gap-2 border-t border-slate-200 pt-3 text-sm">
        <ProjectWebsite domain={project.domain} domainRemoved={project.domainRemoved} />
        {project.previewRemoved ? <p className="break-all text-slate-500">Forslag avpublisert {project.previewRemoved} · {project.previewUrl}</p> : null}
        {project.previewUrl && !project.previewRemoved ? <a className="break-all text-blue-800 underline underline-offset-2" href={project.previewUrl} target="_blank" rel="noreferrer">Åpne forslag <ExternalLink aria-hidden="true" className="inline size-3" /></a> : null}
        {project.invoiceFile ? <a className="text-blue-800 underline underline-offset-2" href={project.invoiceFile} target="_blank" rel="noreferrer">Åpne faktura <ExternalLink aria-hidden="true" className="inline size-3" /></a> : null}
      </div>
      <details className="mt-4 border-t border-slate-200 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Vis historikk og detaljer</summary>
        <dl className="mt-3 space-y-3 text-sm">
          <Row icon={FileText} label="Dialog" value={project.outreach} />
          <Row icon={Globe2} label="Fremdrift" value={project.progress} />
          {project.provider ? <Row icon={Globe2} label="Skjema" value={project.provider} /> : null}
          {project.invoiceDueDate ? <Row icon={CalendarDays} label="Forfallsdato" value={project.invoiceDueDate} /> : null}
          {project.responseDeadline ? <Row icon={CalendarDays} label="Svarfrist" value={project.responseDeadline} /> : null}
        </dl>
        <ol className="mt-4 space-y-2 border-l border-slate-300 pl-3 text-xs text-slate-600">
          {history.map((event) => <li key={event.label}><span className="font-medium">{event.date}</span> · {event.label}</li>)}
        </ol>
      </details>
    </article>
  );
}

function ProjectWebsite({ domain, domainRemoved }: Readonly<Pick<CrmProject, "domain" | "domainRemoved">>) {
  if (!domain) return <p className="text-slate-500">Domene ikke avklart</p>;
  if (domainRemoved) return <p className="break-all text-slate-500">{domain} · fjernet {domainRemoved}</p>;
  return <a className="break-all text-blue-800 underline underline-offset-2" href={`https://${domain}`} target="_blank" rel="noreferrer">{domain} <ExternalLink aria-hidden="true" className="inline size-3" /></a>;
}

function Row({ icon: Icon, label, value }: Readonly<{ icon: typeof FileText; label: string; value: string }>) {
  return <div className="min-w-0"><dt className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon aria-hidden="true" className="size-3.5 shrink-0" />{label}</dt><dd className="mt-0.5 break-words pl-5 text-slate-800">{value}</dd></div>;
}
