"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarDays, ExternalLink, FileText, Globe2, MapPin, Phone, ReceiptText, UserRound } from "lucide-react";

import { crmProjectId, isoDateFromNorwegian, norwegianDateFromIso, osloToday, type CrmEventKind, type CrmEventRecord } from "@/lib/crm-events";
import { MailboxReview } from "@/components/mailbox-review";

type ProjectStatus = "working" | "waiting" | "delivered" | "payment" | "completed" | "inactive";
type AgreementStatus = "required" | "draft" | "signed" | "not-used";

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
  agreement: string;
  agreementStatus: AgreementStatus;
  provider?: string;
  contact: string;
  email: string;
  organizationNumber?: string;
  phone?: string;
  address?: string;
  proposalDate: string;
  dateLabel?: string;
  replyDate?: string;
  nextStep?: string;
  followUpDate?: string;
  responseDeadline?: string;
  domainRemoved?: string;
  invoiceDate?: string;
  invoiceDueDate?: string;
  deliveryConfirmedDate?: string;
  deliveryComplete?: boolean;
  paymentDate?: string;
  invoiceNumber?: string;
  invoiceFile?: string;
  status: ProjectStatus;
  invoiceAmount?: number;
  sentProposalDate?: string;
  clarificationDate?: string;
};

const projects: CrmProject[] = [
  {
    name: "Kvernmo Halibut",
    previewUrl: "https://ltj54.github.io/kvernmo-halibut/",
    contact: "Bjørne Kvernmo",
    email: "Ikke avklart",
    organizationNumber: "938 584 346",
    proposalDate: "14.10.2026",
    dateLabel: "Første konseptutkast publisert",
    outreach: "Positiv interesse – Bjørne ønsker tilbud på nettside",
    progress: "Prosjekt under utvikling. En offentlig forhåndsvisning er laget som uforpliktende konsept; innhold og bilder er ikke godkjent av Bjørne.",
    nextStep: "Gjennomgå konseptet med Bjørne og avklare bilder, innhold, domene og vilkår før eventuell endelig leveranse. Ingen automatisk oppfølging.",
    invoice: "Ikke fakturert",
    agreement: "Internt avtaleutkast finnes lokalt, men er ikke sendt eller inngått.",
    agreementStatus: "draft",
    status: "working",
  },
  {
    name: "Henden Autotuning",
    inactiveDate: "05.10.2026",
    contact: "Fredrik Henden",
    email: "fredrik.henden@yahoo.com",
    organizationNumber: "938 529 426",
    phone: "+47 954 49 231",
    address: "Skoleveien 14, 1791 Tistedal",
    proposalDate: "25.09.2026",
    dateLabel: "Første henvendelse",
    followUpDate: "01.10.2026",
    replyDate: "02.10.2026 kl. 09:47",
    clarificationDate: "02.10.2026",
    outreach: "Inaktiv – sak avsluttet",
    progress: "Fredrik ønsket en moderne og skalerbar nettbutikk med blant annet tuningdeler, MaxxECU-produkter, ledningsnett, 8HP-løsninger, komplette pakker, custom-forespørsler og effektiv arbeidsflyt mot Fiken. Avklaringsmail ble sendt 02.10.2026, men ingen kravspesifikasjon, utvikling, avtale eller publisering ble startet. Saken ble avsluttet 05.10.2026.",
    nextStep: "Ingen videre kontakt, e-post eller purring. Det ble ikke opprettet noen lokal prosjektmappe, Git-historikk, GitHub-repository eller aktiv publisering.",
    invoice: "Ikke fakturert",
    agreement: "Ikke brukt – saken ble avsluttet før utvikling, integrasjon eller drift ble avtalt.",
    agreementStatus: "not-used",
    status: "inactive",
  },
  {
    name: "Linus Anderssen",
    inactiveDate: "05.10.2026",
    contact: "Linus Anderssen",
    email: "linusanderssen@outlook.com",
    organizationNumber: "938 567 263",
    phone: "+47 950 17 473",
    address: "Ekloa 39, 7656 Verdal",
    proposalDate: "30.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "01.10.2026 kl. 15:14",
    outreach: "Inaktiv – prosjekt avsluttet",
    progress: "Linus svarte 01.10.2026 at han var interessert i en nettside. Det ble bare laget et utkast til kravspesifikasjon; ingen utvikling, avtale eller publisering ble startet. Prosjektet ble avsluttet og arkivert lokalt 05.10.2026.",
    nextStep: String.raw`Ingen videre kontakt, e-post eller purring. Det fantes ingen Git-historikk, GitHub-repository eller aktiv publisering. Den lokale sikkerhetskopien er beholdt i C:\Prosjekt\linus-anderssen_FJERNET-GITHUB.`,
    invoice: "Ikke fakturert",
    agreement: "Ikke brukt – prosjektet ble avsluttet før utvikling eller drift ble avtalt.",
    agreementStatus: "not-used",
    status: "inactive",
  },
  {
    name: "Hageservice Tofthagen",
    inactiveDate: "30.09.2026",
    contact: "Benjamin V. Tofthagen",
    email: "benjamin.tofth@icloud.com",
    organizationNumber: "938 578 494",
    phone: "+47 991 92 745",
    address: "Grårudveien 2A, 1636 Gamle Fredrikstad",
    proposalDate: "29.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "29.09.2026 (telefon)",
    outreach: "Inaktiv – foretaket er slettet",
    progress: "E-post med tilbud om nettside ble sendt 29.09.2026, og Benjamin uttrykte interesse per telefon samme dag. Det ble bare laget et utkast til kravspesifikasjon og avtale; ingen nettsideutvikling ble startet. Prosjektet ble avsluttet 30.09.2026 etter opplysning om at foretaket er slettet.",
    nextStep: String.raw`Ingen videre kontakt, e-post eller purring. Det fantes ikke noe GitHub-repository eller aktiv publisering. Den lokale sikkerhetskopien er beholdt i C:\Prosjekt\hageservice-tofthagen_FJERNET-GITHUB.`,
    invoice: "Ikke fakturert",
    agreement: "Ikke brukt – prosjektet ble avsluttet før utvikling eller drift ble avtalt.",
    agreementStatus: "not-used",
    status: "inactive",
  },
  {
    name: "Idsøe Rådgivning",
    previewUrl: "https://ltj54.github.io/idsoe-radgivning-nettside/index.html",
    contact: "Ella Maria Cosmovici Idsøe",
    email: "e.m.c.idsoe@naturfagsenteret.no",
    phone: "+47 22 84 56 69",
    proposalDate: "03.09.2026",
    dateLabel: "Henvendelse",
    replyDate: "09.10.2026 kl. 15:45",
    outreach: "Positiv tilbakemelding – avventer nytt domene og e-postadresse",
    progress: "Samtalen i uke 40 er gjennomført. Nettsiden er forenklet etter Ellas innspill, og tekstene for foreldre, barnehager, leger og psykologer er oppdatert på norsk og engelsk. Ella skrev 09.10.2026 at siden så ut som hun ønsket. De siste tilpasningene avventer nytt domene og ny e-postadresse.",
    nextStep: "Avvent beskjed fra Ella om nytt domene og ny e-postadresse. Gjør deretter de siste tilpasningene og avklar endelig godkjenning før levering. Ingen e-post eller purring nå.",
    invoice: "Ikke fakturert",
    agreement: "Skal tilpasses og avtales før endelig levering eller drift. Ikke sendt.",
    agreementStatus: "required",
    status: "waiting",
  },
  {
    name: "Fiskerikandidat Gunnar Davidsson",
    domain: "davidsson.no",
    contact: "Gunnar Davidsson",
    email: "gunnidabb@gmail.com",
    organizationNumber: "938 423 334",
    phone: "+47 916 76 990",
    address: "Kantarellvegen 64, 9102 Kvaløysletta",
    proposalDate: "05.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "22.09.2026 kl. 15:55",
    sentProposalDate: "23.09.2026",
    followUpDate: "02.10.2026",
    deliveryConfirmedDate: "06.10.2026",
    deliveryComplete: true,
    outreach: "Nettsiden levert – faktura sendt 14.10.2026",
    progress: "Nettsiden er publisert på davidsson.no. Lars bekreftet at leveransen er i orden. LTJ PRODUCTION JOHANNESSEN er registrert med org.nr. 838 632 122, og faktura 2026-004 er sendt til Gunnar.",
    nextStep: "Avvent betaling på 1 990 kr innen 28.10.2026. Registrer betalingsdato først når innbetalingen er bekreftet. Ingen automatisk purring er planlagt.",
    invoiceDate: "14.10.2026",
    invoiceDueDate: "28.10.2026",
    invoiceAmount: 1990,
    invoiceNumber: "2026-004",
    invoice: "Sendt · 1 990 kr · forfall 28.10.2026",
    agreement: "Avtaleutkast ligger i prosjektet, men er ikke sendt eller inngått.",
    agreementStatus: "draft",
    status: "payment",
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
    deliveryComplete: true,
    outreach: "Kunde godkjent – publisert",
    progress: "Publisert på varneth.eu. Norsk/engelsk forside med KI-musikk, Broken Veil, Black Veil Hart, rådgivning, publishing og kontaktløsning.",
    nextStep: "Betaling på 1 990 kr mottatt 22.09.2026. Eventuelle innholdsendringer håndteres manuelt.",
    invoiceDate: "16.09.2026",
    invoiceDueDate: "30.09.2026",
    invoiceAmount: 1990, invoiceNumber: "2026-003",
    invoiceFile: "/invoices/faktura-2026-003-varneth-management-ness.pdf",
    invoice: "Betalt · 1 990 kr",
    agreement: "Ikke brukt – prosjektet ble ferdigstilt før avtalerutinen ble innført.",
    agreementStatus: "not-used",
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
    agreement: "Ikke brukt – prosjektet ble ikke videreført.",
    agreementStatus: "not-used",
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
    agreement: "Ikke brukt – prosjektet ble ikke videreført.",
    agreementStatus: "not-used",
    status: "inactive",
  },
  {
    name: "Spilling Advisory",
    inactiveDate: "30.09.2026",
    previewRemoved: "30.09.2026",
    previewUrl: "https://ltj54.github.io/spilling-advisory/",
    contact: "Knut Erik Spilling",
    email: "knuterikspilling@gmail.com",
    proposalDate: "08.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "16.09.2026 kl. 16:59",
    outreach: "Arkivert i GitHub – prosjektet ble ikke videreført",
    progress: "Knut så på mock-upen og syntes den var ryddig og grei. En forretningsforbindelse skulle sette opp nettsiden gratis som motytelse for tjenester, og prosjektet ble derfor ikke videreført.",
    nextStep: String.raw`Arkivert 30.09.2026. GitHub-repositoriet er beholdt som skrivebeskyttet sikkerhetskopi. Lokal kopi: C:\Prosjekt\spilling-advisory_FJERNET-GITHUB. GitHub Pages og testpubliseringen er fjernet. Ingen videre purring.`,
    invoice: "Ikke fakturert",
    agreement: "Ikke brukt – prosjektet ble ikke videreført.",
    agreementStatus: "not-used",
    status: "inactive",
  },
  { name: "Breathe Senja", domain: "www.breathesenja.com", contact: "Roland Henriksen", email: "roland.henriksen75@gmail.com", proposalDate: "06.07.2026", paymentDate: "20.07.2026", deliveryComplete: true, invoiceAmount: 1990, invoiceNumber: "2026-001", invoiceFile: "/invoices/faktura-2026-001-breathe-senja-betalt.pdf", outreach: "Kunde godkjent", progress: "Ferdig – endelig domene og Formspree i bruk", provider: "Formspree", invoice: "Betalt · 1 990 kr", agreement: "Ikke brukt – prosjektet ble ferdigstilt før avtalerutinen ble innført.", agreementStatus: "not-used", status: "completed" },
  { name: "Zagros Forlag", domain: "www.zagrosforlag.no", contact: "Eisa Bazyar", email: "post@zagrosforlag.no", proposalDate: "13.08.2026", paymentDate: "18.09.2026", deliveryComplete: true, outreach: "Kunde godkjent", progress: "Ferdig – endelig domene og Formspree i bruk", provider: "Formspree", invoiceAmount: 1990, invoiceNumber: "2026-002", invoiceFile: "/invoices/faktura-2026-002-zagros-forlag.pdf", invoice: "Betalt · 1 990 kr", agreement: "Ikke brukt – prosjektet ble ferdigstilt før avtalerutinen ble innført.", agreementStatus: "not-used", status: "completed" },
  { name: "Minde Momentum", domain: "minde-momentum.ltj-production.no", domainRemoved: "03.09.2026", contact: "Liv Minde", email: "livminde8@gmail.com", proposalDate: "18.08.2026", outreach: "Arkivert i GitHub – ingen avklaring mottatt", progress: "Lokal kopi ligger i minde-momentum_FJERNET-GITHUB. GitHub-repositoriet er arkivert som sikkerhetskopi og kan slettes senere dersom det ikke lenger trengs.", invoice: "Ikke fakturert", agreement: "Ikke brukt – prosjektet ble ikke videreført.", agreementStatus: "not-used", status: "inactive" },
  { name: "Skifjelds Håndverk", domain: "skifjelds-handverk.ltj-production.no", domainRemoved: "03.09.2026", contact: "Terje Skifjeld", email: "terje_skifjeld@yahoo.no", proposalDate: "25.08.2026", followUpDate: "27.08.2026", responseDeadline: "02.09.2026", outreach: "Arkivert i GitHub – ingen svar mottatt", progress: "Lokal kopi ligger i skifjelds-handverk_FJERNET-GITHUB. GitHub-repositoriet er arkivert som sikkerhetskopi.", invoice: "Ikke fakturert", agreement: "Ikke brukt – prosjektet ble ikke videreført.", agreementStatus: "not-used", status: "inactive" },
  { name: "Casa Latina Trondheim", domain: "casa-latina-trondheim.ltj-production.no", domainRemoved: "08.09.2026", contact: "Sandra Yineth Morales Guerrero", email: "sandraymorales30@gmail.com", proposalDate: "26.08.2026", outreach: "Arkivert i GitHub – ingen svar mottatt", progress: "Lokal kopi ligger i casa-latina-trondheim_FJERNET-GITHUB. GitHub-repositoriet er arkivert som sikkerhetskopi.", invoice: "Ikke fakturert", agreement: "Ikke brukt – prosjektet ble ikke videreført.", agreementStatus: "not-used", status: "inactive" },
  { name: "Sammen for Tromsø sine barn", previewUrl: "https://ltj54.github.io/sammen-for-tromsos-barn/", contact: "Alexandra og Kirsti", email: "Ikke avklart", proposalDate: "14.05.2026", dateLabel: "Første forslag", outreach: "Arkivert i GitHub – avventer finansiering", progress: "Forslag til enkel nettside for initiativet. Alexandra og Kirsti ønsket en løsning i retning smarttelefonfri barndom, men enklere, og søkte støtte til etablering.", nextStep: "Lokal kopi ligger i sammen-for-tromsos-barn_FJERNET-GITHUB. GitHub-repositoriet er arkivert; kontaktadresse, domene og eventuell videreføring må avklares senere.", invoice: "Ikke fakturert", agreement: "Ikke brukt – prosjektet ble ikke videreført.", agreementStatus: "not-used", status: "inactive" },
];


const statusGroups: ReadonlyArray<{
  status: ProjectStatus; label: string; tone: string; badge: string; collapsed?: boolean;
}> = [
  { status: "working", label: "Under arbeid", tone: "border-blue-200 bg-blue-50", badge: "bg-blue-100 text-blue-900" },
  { status: "waiting", label: "Avventer kunden", tone: "border-yellow-200 bg-yellow-50", badge: "bg-yellow-100 text-yellow-900" },
  { status: "delivered", label: "Levert · ikke fakturert", tone: "border-teal-200 bg-teal-50", badge: "bg-teal-100 text-teal-900" },
  { status: "payment", label: "Avventer betaling", tone: "border-orange-200 bg-orange-50", badge: "bg-orange-100 text-orange-900" },
  { status: "completed", label: "Betalt", tone: "border-emerald-200 bg-emerald-50", badge: "bg-emerald-100 text-emerald-900", collapsed: true },
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
    { date: project.clarificationDate, label: "Avklaringsmail sendt" },
    { date: project.followUpDate, label: "Purring sendt" },
    { date: project.deliveryConfirmedDate, label: "Leveranse ferdig ifølge Lars" },
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

function delivered(project: CrmProject): boolean {
  return Boolean(project.deliveryComplete || project.deliveryConfirmedDate) || project.status === "delivered";
}

function applyCrmEvents(project: CrmProject, events: CrmEventRecord[]): CrmProject {
  const updated = { ...project };
  for (const event of events) {
    if (event.projectId !== crmProjectId(project.name, project.organizationNumber)) continue;
    if (event.kind === "delivery_confirmed") {
      updated.deliveryConfirmedDate = event.date;
      updated.deliveryComplete = true;
      if (updated.status === "working" || updated.status === "waiting") updated.status = "delivered";
    }
    if (event.kind === "invoice_sent") {
      updated.invoiceDate = event.date;
      updated.invoiceDueDate = event.dueDate;
      updated.invoiceNumber = event.invoiceNumber;
      updated.invoiceAmount = event.invoiceAmount;
      updated.invoice = `Sendt · ${money(event.invoiceAmount ?? 0)} · forfall ${event.dueDate}`;
      updated.nextStep = `Avvent betaling innen ${event.dueDate}. Registrer betalingsdato først når innbetalingen er bekreftet. Ingen automatisk purring.`;
      updated.status = "payment";
    }
    if (event.kind === "payment_received") {
      updated.paymentDate = event.date;
      updated.invoice = `Betalt · ${money(updated.invoiceAmount ?? 0)}`;
      updated.nextStep = `Betaling mottatt ${event.date}. Eventuelle nye oppdrag håndteres manuelt.`;
      updated.status = "completed";
    }
  }
  return updated;
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
  const [events, setEvents] = useState<CrmEventRecord[]>([]);
  const [loadError, setLoadError] = useState("");
  const [busyProject, setBusyProject] = useState("");
  const [saveError, setSaveError] = useState("");
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/crm-events", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Kunne ikke lese CRM-loggen.");
        return response.json() as Promise<{ events: CrmEventRecord[] }>;
      })
      .then((result) => {
        if (active) {
          setEvents(result.events);
          setCanEdit(["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
        }
      })
      .catch(() => { if (active) setLoadError("CRM-loggen er utilgjengelig. Registrering er slått av til den kan leses."); });
    return () => { active = false; };
  }, []);

  const currentProjects = projects.map((project) => applyCrmEvents(project, events));
  const outstanding = currentProjects.filter((project) => project.status === "payment")
    .reduce((total, project) => total + (project.invoiceAmount ?? 0), 0);
  const paid = currentProjects.filter((project) => project.paymentDate)
    .reduce((total, project) => total + (project.invoiceAmount ?? 0), 0);

  async function saveEvent(event: Omit<CrmEventRecord, "recordedAt">) {
    setSaveError("");
    setBusyProject(event.projectId);
    try {
      const response = await fetch("/api/crm-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const result = await response.json() as { event?: CrmEventRecord; error?: string };
      const savedEvent = result.event;
      if (!response.ok || !savedEvent) {
        setSaveError(result.error ?? "Kunne ikke lagre hendelsen.");
        return false;
      }
      setEvents((previous) => [...previous, savedEvent]);
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Kunne ikke lagre hendelsen.");
      return false;
    } finally {
      setBusyProject("");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6" id="crm">
      <header className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">CRM · {currentProjects.length} prosjekter</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Prosjekter og kunder</h1>
        <p className="mt-2 text-sm text-slate-600">Leveranse og betaling vises hver for seg. CRM-registrering sender ingen e-post eller purring.</p>
        {loadError ? <p role="alert" className="mt-3 text-sm text-red-800">{loadError}</p> : null}
        {saveError ? <p role="alert" className="mt-3 text-sm text-red-800">{saveError}</p> : null}
        <nav aria-label="Prosjektstatuser" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {statusGroups.map((group) => (
            <a href={`#crm-${group.status}`} key={group.status} className={`rounded-lg border p-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 ${group.tone}`}>
              <span className="block text-xl font-semibold text-slate-900">{currentProjects.filter((project) => project.status === group.status).length}</span>
              <span className="text-slate-700">{group.label}</span>
            </a>
          ))}
        </nav>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-200 pt-4">
          <div><dt className="text-xs text-slate-600">Utestående fakturert</dt><dd className="text-lg font-semibold text-orange-900">{money(outstanding)}</dd></div>
          <div><dt className="text-xs text-slate-600">Totalt betalt</dt><dd className="text-lg font-semibold text-emerald-900">{money(paid)}</dd></div>
          <div><dt className="text-xs text-slate-600">Avtaler inngått</dt><dd className="text-lg font-semibold text-blue-900">{currentProjects.filter((project) => project.agreementStatus === "signed").length}</dd></div>
        </dl>
      </header>

      {canEdit ? <MailboxReview /> : null}

      <div className="mt-6 space-y-5">
        {statusGroups.map((group) => {
          const grouped = currentProjects.filter((project) => project.status === group.status).sort(compareProjects);
          return (
            <details key={group.status} id={`crm-${group.status}`} open={!group.collapsed} className="scroll-mt-6 rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer rounded-xl px-5 py-4 text-base font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2">
                <span className={`ml-2 rounded-md px-2 py-1 ${group.badge}`}>{group.label}</span>
                <span className="ml-3 text-sm font-normal text-slate-600">{grouped.length} prosjekter</span>
              </summary>
              <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
                {grouped.map((project) => <ProjectCard key={project.name} project={project} group={group} canEdit={canEdit && !loadError} busy={busyProject === crmProjectId(project.name, project.organizationNumber)} onSave={saveEvent} />)}
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

function ProjectCard({ project, group, canEdit, busy, onSave }: Readonly<{
  project: CrmProject; group: (typeof statusGroups)[number];
  canEdit: boolean; busy: boolean;
  onSave: (event: Omit<CrmEventRecord, "recordedAt">) => Promise<boolean>;
}>) {
  const history = historyFor(project);
  const latest = history[0];
  const deadline = deadlineFor(project);
  const overdue = project.status === "payment" && Boolean(project.invoiceDueDate)
    && isoDateFromNorwegian(project.invoiceDueDate!) < osloToday();
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
      <span className={`ml-2 mt-3 inline-block rounded-md px-2 py-1 text-xs font-semibold ${delivered(project) ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-slate-700"}`}>
        Leveranse: {delivered(project) ? "Levert" : "Ikke registrert levert"}
      </span>
      {overdue ? <span className="ml-2 inline-block rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-900">Forfalt · manuell vurdering</span> : null}
      <dl className="mt-4 space-y-3 text-sm">
        <Row icon={CalendarDays} label="Sist datert" value={`${latest.date} · ${latest.label}`} />
        {deadline ? <Row icon={CalendarDays} label={project.status === "payment" ? "Forfall" : "Svarfrist"} value={deadline} /> : null}
        <Row icon={FileText} label="Neste steg" value={project.nextStep ?? fallback} />
        <Row icon={FileText} label="Avtale" value={project.agreement} />
        <Row icon={ReceiptText} label="Fakturering" value={project.invoice} />
        {project.invoiceNumber ? <Row icon={ReceiptText} label="Fakturanr." value={project.invoiceNumber} /> : null}
      </dl>
      {canEdit ? <CrmActions project={project} busy={busy} onSave={onSave} /> : null}
      <div className="mt-4 flex flex-col items-start gap-2 border-t border-slate-200 pt-3 text-sm">
        <ProjectWebsite domain={project.domain} domainRemoved={project.domainRemoved} />
        {project.previewRemoved ? <p className="break-all text-slate-500">Forslag avpublisert {project.previewRemoved} · {project.previewUrl}</p> : null}
        {project.previewUrl && !project.previewRemoved ? <a className="break-all text-blue-800 underline underline-offset-2" href={project.previewUrl} target="_blank" rel="noreferrer">Åpne forslag <ExternalLink aria-hidden="true" className="inline size-3" /></a> : null}
        {project.invoiceFile ? <a className="text-blue-800 underline underline-offset-2" href={project.invoiceFile} target="_blank" rel="noreferrer">Åpne faktura <ExternalLink aria-hidden="true" className="inline size-3" /></a> : null}
      </div>
      <details className="mt-4 border-t border-slate-200 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Vis historikk og detaljer</summary>
        <ProjectDetails project={project} />
        <ol className="mt-4 space-y-2 border-l border-slate-300 pl-3 text-xs text-slate-600">
          {history.map((event) => <li key={event.label}><span className="font-medium">{event.date}</span> · {event.label}</li>)}
        </ol>
      </details>
    </article>
  );
}

function CrmActions({ project, busy, onSave }: Readonly<{
  project: CrmProject;
  busy: boolean;
  onSave: (event: Omit<CrmEventRecord, "recordedAt">) => Promise<boolean>;
}>) {
  const [action, setAction] = useState<CrmEventKind | null>(null);
  const [date, setDate] = useState(osloToday);
  const [dueDate, setDueDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const projectId = crmProjectId(project.name, project.organizationNumber);
  const canMarkDelivered = !delivered(project) && project.status !== "inactive";
  const canMarkInvoiceSent = !project.invoiceNumber && project.status !== "inactive";
  const canMarkPaid = project.status === "payment" && !project.paymentDate;
  if (!canMarkDelivered && !canMarkInvoiceSent && !canMarkPaid) return null;

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    const record: Omit<CrmEventRecord, "recordedAt"> = {
      projectId,
      kind: action,
      date: norwegianDateFromIso(date),
    };
    if (action === "invoice_sent") {
      record.invoiceNumber = invoiceNumber.trim();
      record.invoiceAmount = Number(amount.replace(",", "."));
      record.dueDate = norwegianDateFromIso(dueDate);
    }
    if (await onSave(record)) setAction(null);
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-3 text-sm">
      <p className="font-medium text-slate-800">Registrer hendelse manuelt</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {canMarkDelivered ? <button type="button" onClick={() => setAction("delivery_confirmed")} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-blue-800 hover:bg-slate-50">Leveranse ferdig</button> : null}
        {canMarkInvoiceSent ? <button type="button" onClick={() => setAction("invoice_sent")} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-blue-800 hover:bg-slate-50">Faktura sendt</button> : null}
        {canMarkPaid ? <button type="button" onClick={() => setAction("payment_received")} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-blue-800 hover:bg-slate-50">Betaling mottatt</button> : null}
      </div>
      {action ? (
        <form onSubmit={(event) => void submit(event)} className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-600">Dette registrerer bare det som allerede har skjedd. Ingen e-post, faktura eller purring sendes.{action === "payment_received" ? " Bruk dette når hele fakturaen er betalt." : ""}</p>
          <label className="block font-medium text-slate-700"><span className="block">Dato</span>
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5" />
          </label>
          {action === "invoice_sent" ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="font-medium text-slate-700"><span className="block">Fakturanummer</span>
                <input required pattern="[0-9]{4}-[0-9]{3,}" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="2026-005" className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
              <label className="font-medium text-slate-700"><span className="block">Beløp i kr</span>
                <input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
              <label className="font-medium text-slate-700"><span className="block">Forfallsdato</span>
                <input required type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5" />
              </label>
            </div>
          ) : null}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="rounded-md bg-blue-700 px-3 py-1.5 font-medium text-white disabled:opacity-50">{busy ? "Lagrer …" : "Lagre i CRM"}</button>
            <button type="button" onClick={() => setAction(null)} className="rounded-md border border-slate-300 px-3 py-1.5">Avbryt</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ProjectDetails({ project }: Readonly<{ project: CrmProject }>) {
  return (
    <dl className="mt-3 space-y-3 text-sm">
      <Row icon={FileText} label="Dialog" value={project.outreach} />
      <Row icon={Globe2} label="Fremdrift" value={project.progress} />
      {project.organizationNumber ? <Row icon={Building2} label="Organisasjonsnummer" value={project.organizationNumber} /> : null}
      {project.phone ? <Row icon={Phone} label="Telefon" value={project.phone} /> : null}
      {project.address ? <Row icon={MapPin} label="Adresse" value={project.address} /> : null}
      {project.provider ? <Row icon={Globe2} label="Skjema" value={project.provider} /> : null}
      {project.invoiceDueDate ? <Row icon={CalendarDays} label="Forfallsdato" value={project.invoiceDueDate} /> : null}
      {project.responseDeadline ? <Row icon={CalendarDays} label="Svarfrist" value={project.responseDeadline} /> : null}
    </dl>
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
