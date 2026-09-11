import { CalendarDays, ExternalLink, FileText, Globe2, Mail, ReceiptText, UserRound } from "lucide-react";

type CrmProject = {
  name: string;
  domain?: string;
  previewUrl?: string;
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
  paymentDate?: string;
  invoiceNumber?: string;
  invoiceFile?: string;
  tone: string;
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
    nextStep: "Lage forslag og avtale tidspunkt for en samtale i uke 40. Ingen møtedato er avtalt. Videre dialog håndteres manuelt; ingen automatisk oppfølging.",
    invoice: "Ikke fakturert",
    tone: "border-blue-200 bg-blue-50",
  },
  {
    name: "Varneth Management Ness",
    contact: "Henning Stockmann Ness",
    email: "bhstockmann@gmail.com",
    proposalDate: "09.09.2026",
    dateLabel: "Henvendelse",
    replyDate: "09.09.2026 kl. 15:20",
    outreach: "Positiv interesse – ber om forslag",
    progress: "Henning har bedt om at et forslag til en enkel side settes opp.",
    nextStep: "Sette opp forslag og avklare innhold manuelt. Ingen automatisk oppfølging.",
    invoice: "Ikke fakturert",
    tone: "border-blue-200 bg-blue-50",
  },
  {
    name: "SV Pelsar Sp. z o.o.",
    contact: "Serhii Siedin",
    email: "sv.pelsar@gmail.com",
    proposalDate: "03.09.2026",
    dateLabel: "Første henvendelse",
    replyDate: "10.09.2026 kl. 18:52",
    outreach: "Positiv interesse – spør om pris",
    progress: "Ber om pris på nettside. Svarsignaturen bruker både Serhii og Sergey; kontaktopplysningene bør avklares før oppstart.",
    nextStep: "Svar manuelt med fastpris 1 990 kr og be om grunnlagsopplysninger. Ingen automatisk oppfølging.",
    invoice: "Ikke fakturert",
    tone: "border-amber-200 bg-amber-50",
  },
  { name: "Breathe Senja", domain: "www.breathesenja.com", contact: "Roland Henriksen", email: "roland.henriksen75@gmail.com", proposalDate: "06.07.2026", paymentDate: "20.07.2026", invoiceNumber: "2026-001", invoiceFile: "/invoices/faktura-2026-001-breathe-senja-betalt.pdf", outreach: "Kunde godkjent", progress: "Ferdig – endelig domene og Formspree i bruk", provider: "Formspree", invoice: "Betalt · 1 990 kr", tone: "border-emerald-200 bg-emerald-50" },
  { name: "Zagros Forlag", domain: "www.zagrosforlag.no", contact: "Eisa Bazyar", email: "post@zagrosforlag.no", proposalDate: "13.08.2026", outreach: "Forslag sendt", progress: "Ferdig – endelig domene og Formspree i bruk", provider: "Formspree", invoiceNumber: "2026-002", invoiceFile: "/invoices/faktura-2026-002-zagros-forlag.pdf", invoice: "Klar for utsending · 1 990 kr", tone: "border-emerald-200 bg-emerald-50" },
  { name: "Minde Momentum", domain: "minde-momentum.ltj-production.no", domainRemoved: "03.09.2026", contact: "Liv Minde", email: "livminde8@gmail.com", proposalDate: "18.08.2026", outreach: "Avsluttet", progress: "Fjernet 03.09.2026 – ingen avklaring mottatt", invoice: "Ikke fakturert", tone: "border-slate-200 bg-slate-50" },
  { name: "Skifjelds Håndverk", domain: "skifjelds-handverk.ltj-production.no", domainRemoved: "03.09.2026", contact: "Terje Skifjeld", email: "terje_skifjeld@yahoo.no", proposalDate: "25.08.2026", followUpDate: "27.08.2026", responseDeadline: "02.09.2026", outreach: "Avsluttet", progress: "Fjernet 03.09.2026 – ingen svar mottatt", invoice: "Ikke fakturert", tone: "border-slate-200 bg-slate-50" },
  { name: "Casa Latina Trondheim", domain: "casa-latina-trondheim.ltj-production.no", domainRemoved: "08.09.2026", contact: "Sandra Yineth Morales Guerrero", email: "sandraymorales30@gmail.com", proposalDate: "26.08.2026", outreach: "På vent – ingen videre purring", progress: "Fjernet fra Sites 08.09.2026 – ingen svar mottatt", invoice: "Ikke fakturert", tone: "border-slate-200 bg-slate-50" },
];

export function CrmOverview() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-8" id="crm">
      <div className="border border-[#D9E2EC] bg-white px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#52606D]">CRM</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#1F2933]">Prosjekter og kunder</h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#52606D]">Samlet oversikt over nettsideforslag, domener, fremdrift og fakturering.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <Summary value={String(projects.length)} label="Prosjekter" />
            <Summary value="1" label="Godkjent" />
            <Summary value="1 990 kr" label="Betalt" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <article className={`border p-5 ${project.tone}`} key={project.name}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2933]">{project.name}</h2>
                <ProjectWebsite domain={project.domain} domainRemoved={project.domainRemoved} />
                {project.previewUrl ? <ProjectPreview url={project.previewUrl} /> : null}
              </div>
              {project.domain && !project.domainRemoved ? <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-[#52606D]">CNAME · 14400</span> : null}
            </div>
            <dl className="mt-5 grid gap-2 text-[12px] text-[#52606D]">
              <Row icon={UserRound} label="Kontakt" value={project.contact} />
              <Row icon={Mail} label="E-post" value={project.email} />
              <Row icon={CalendarDays} label={project.dateLabel ?? "Dato"} value={project.proposalDate} />
              {project.replyDate ? <Row icon={CalendarDays} label="Svar mottatt" value={project.replyDate} /> : null}
              {project.followUpDate ? <Row icon={CalendarDays} label="Purring" value={project.followUpDate} /> : null}
              {project.responseDeadline ? <Row icon={CalendarDays} label="Svarfrist" value={project.responseDeadline} /> : null}
              {project.paymentDate ? <Row icon={CalendarDays} label="Betalt" value={project.paymentDate} /> : null}
              <Row icon={FileText} label="Dialog" value={project.outreach} />
              <Row icon={Globe2} label="Fremdrift" value={project.progress} />
              {project.nextStep ? <Row icon={CalendarDays} label="Neste steg" value={project.nextStep} /> : null}
              {project.provider ? <Row icon={Globe2} label="Skjema" value={project.provider} /> : null}
              <Row icon={ReceiptText} label="Fakturering" value={project.invoice} />
              {project.invoiceNumber ? <Row icon={ReceiptText} label="Fakturanr." value={project.invoiceNumber} /> : null}
              {project.invoiceFile ? <div className="flex items-start gap-2"><ReceiptText className="mt-0.5 size-3.5 text-[#1F5FA9]" /><span className="w-20 shrink-0 font-medium text-[#829AB1]">Dokument</span><a className="font-medium text-[#1F5FA9] underline underline-offset-2" href={project.invoiceFile} target="_blank" rel="noreferrer">Åpne faktura <ExternalLink className="ml-1 inline size-3" /></a></div> : null}
            </dl>
          </article>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-[#829AB1]">Breathe Senja er ferdig, publisert og betalt. De øvrige løsningene er foreløpig ikke godkjent eller betalt.</p>
    </section>
  );
}

function ProjectWebsite({ domain, domainRemoved }: Readonly<Pick<CrmProject, "domain" | "domainRemoved">>) {
  if (!domain) {
    return <p className="mt-1 text-[12px] text-[#52606D]">Domene ikke avklart</p>;
  }
  if (domainRemoved) {
    return <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#829AB1]"><Globe2 className="size-3" />{domain} · fjernet {domainRemoved}</p>;
  }
  return <a className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#1F5FA9] underline underline-offset-2" href={`https://${domain}`} target="_blank" rel="noreferrer"><Globe2 className="size-3" />{domain}<ExternalLink className="size-3" /></a>;
}

function ProjectPreview({ url }: Readonly<{ url: string }>) {
  return <a className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#1F5FA9] underline underline-offset-2" href={url} target="_blank" rel="noreferrer"><Globe2 className="size-3" />Åpne forslag<ExternalLink className="size-3" /></a>;
}

function Summary({ value, label }: Readonly<{ value: string; label: string }>) {
  return <div className="border border-[#D9E2EC] bg-[#F8FBFF] px-3 py-2"><p className="font-semibold text-[#1F2933]">{value}</p><p className="mt-1 text-[#829AB1]">{label}</p></div>;
}

function Row({ icon: Icon, label, value }: Readonly<{ icon: typeof FileText; label: string; value: string }>) {
  return <div className="flex items-start gap-2"><Icon className="mt-0.5 size-3.5 text-[#1F5FA9]" /><dt className="w-20 shrink-0 font-medium text-[#829AB1]">{label}</dt><dd className="font-medium text-[#334E68]">{value}</dd></div>;
}
