"use client";

import { useDeferredValue, useState, useTransition } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleAlert,
  CircleCheckBig,
  Globe,
  Landmark,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import type { CompanyCheck, TrafficLight } from "@/lib/company-check";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const statusMeta: Record<
  TrafficLight,
  { label: string; tone: string; icon: typeof CircleCheckBig }
> = {
  GREEN: {
    label: "Grønn",
    tone: "bg-emerald-500/12 text-emerald-800 ring-emerald-700/15",
    icon: CircleCheckBig,
  },
  YELLOW: {
    label: "Gul",
    tone: "bg-amber-400/18 text-amber-900 ring-amber-700/15",
    icon: TriangleAlert,
  },
  RED: {
    label: "Rød",
    tone: "bg-rose-500/12 text-rose-800 ring-rose-700/15",
    icon: ShieldAlert,
  },
};

const exampleOrgnr = "974760673";

export function CompanyCheckShell() {
  const [organisasjonsnummer, setOrganisasjonsnummer] = useState(exampleOrgnr);
  const [result, setResult] = useState<CompanyCheck | null>(null);
  const deferredResult = useDeferredValue(result);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{9}$/.test(organisasjonsnummer.trim())) {
      setError("Organisasjonsnummer må være ni siffer.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/company-check/${organisasjonsnummer.trim()}`,
        {
          cache: "no-store",
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail ?? "Klarte ikke hente selskapsdata.");
      }

      startTransition(() => {
        setResult(payload as CompanyCheck);
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Noe gikk galt under henting av selskapsdata.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const displayResult = deferredResult;
  const displayState = displayResult ? statusMeta[displayResult.status] : null;
  const StatusIcon = displayState?.icon ?? CircleAlert;
  const facts = displayResult ? normalizeFacts(displayResult) : null;
  const metrics = displayResult ? normalizeMetrics(displayResult) : null;
  const totalFindings = displayResult
    ? Math.max(metrics!.gronneFunn + metrics!.guleFunn + metrics!.rodeFunn, 1)
    : 1;

  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,_rgba(246,182,78,0.24),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(71,118,182,0.16),_transparent_28%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="grid min-h-[70svh] items-center gap-12 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Firmasjekk før samarbeid
              </span>
              <h1 className="max-w-4xl font-heading text-6xl leading-[0.88] tracking-[-0.05em] text-balance text-foreground sm:text-7xl lg:text-8xl">
                Nye AS med varsellamper.
              </h1>
              <p className="max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
                For småbedrifter, byråer og B2B-folk som trenger en rask
                førstelesning av et nytt aksjeselskap før de bruker tid, penger
                eller tillit.
              </p>
            </div>

            <form
              className="flex flex-col gap-3 rounded-4xl border border-border/70 bg-background/80 p-3 shadow-[0_24px_80px_rgba(44,35,22,0.12)] backdrop-blur md:flex-row"
              onSubmit={handleSubmit}
            >
              <Input
                aria-label="Organisasjonsnummer"
                className="h-14 rounded-3xl border-none bg-transparent px-5 text-base shadow-none focus-visible:ring-0"
                inputMode="numeric"
                maxLength={9}
                name="organisasjonsnummer"
                onChange={(event) => setOrganisasjonsnummer(event.target.value)}
                pattern="\d{9}"
                placeholder="Nytt AS du vil vurdere, f.eks. 974760673"
                value={organisasjonsnummer}
              />
              <Button
                className="h-14 rounded-3xl px-6 md:min-w-48"
                disabled={isLoading}
                type="submit"
              >
                <Search data-icon="inline-start" />
                {isLoading ? "Vurderer ..." : "Vurder selskap"}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">Nye aksjeselskaper</Badge>
              <Badge variant="outline">B2B-risiko før samarbeid</Badge>
              <Badge variant="outline">Åpne BRREG-data</Badge>
            </div>

            <div className="min-h-6 text-sm">
              {error ? (
                <p className="text-rose-700">{error}</p>
              ) : isLoading || isPending ? (
                <p className="text-muted-foreground">
                  Henter selskapsdata og bygger vurdering ...
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(180deg,rgba(15,24,28,0.94),rgba(21,31,35,0.92))] p-6 text-white shadow-[0_28px_80px_rgba(24,21,15,0.28)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,209,134,0.2),transparent_28%),linear-gradient(90deg,transparent_0,rgba(255,255,255,0.05)_44%,transparent_68%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="max-w-sm space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                  Signalmodell
                </p>
                <h2 className="font-heading text-5xl leading-[0.92] tracking-[-0.04em] text-balance">
                  En rask lesning før du sier ja til et nytt samarbeid.
                </h2>
                <p className="text-base leading-7 text-white/72">
                  Grønt betyr ryddige grunnopplysninger. Gult betyr at selskapet
                  er nytt eller tynt registrert. Rødt betyr at åpne registre
                  allerede viser signaler som bør undersøkes manuelt.
                </p>
              </div>

              <div className="mx-auto flex w-full max-w-64 flex-col gap-4 rounded-[3rem] border border-white/10 bg-black/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <TrafficLamp tone="red" />
                <TrafficLamp tone="yellow" />
                <TrafficLamp tone="green" />
              </div>

              <div className="space-y-2 text-sm text-white/68">
                <p className="font-semibold text-white">Bygget for B2B-kjøpere</p>
                <p>
                  Signatur/prokura, reelle rettighetshavere og kunngjøringer
                  ligger utenfor denne frontend-versjonen foreløpig.
                </p>
              </div>
            </div>
          </div>
        </section>

        {(displayResult || isLoading) && (
          <section className="flex flex-col gap-8 border-t border-border/70 py-10">
            {displayResult ? (
              <>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      Førstesjekk
                    </p>
                    <div className="space-y-3">
                      <h2 className="max-w-4xl font-heading text-5xl leading-[0.92] tracking-[-0.05em] text-balance sm:text-6xl">
                        {displayResult.navn}
                      </h2>
                      <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                        {displayResult.organisasjonsnummer}
                      </p>
                    </div>
                    <p className="max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
                      {displayResult.sammendrag}
                    </p>
                  </div>

                  <Card className="bg-background/78 shadow-sm">
                    <CardHeader>
                      <CardTitle>Vurderingsstatus</CardTitle>
                      <CardDescription>
                        En enkel lesning av åpne data for nye AS før samarbeid.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <Badge
                        className={`w-fit ring-1 ${displayState?.tone ?? ""}`}
                        variant="secondary"
                      >
                        <StatusIcon data-icon="inline-start" />
                        {displayState?.label}
                      </Badge>
                      <MetricBar
                        count={metrics!.gronneFunn}
                        label="Grønne funn"
                        tone="bg-emerald-500"
                        total={totalFindings}
                      />
                      <MetricBar
                        count={metrics!.guleFunn}
                        label="Gule funn"
                        tone="bg-amber-500"
                        total={totalFindings}
                      />
                      <MetricBar
                        count={metrics!.rodeFunn}
                        label="Røde funn"
                        tone="bg-rose-500"
                        total={totalFindings}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <InfoCard
                    description="Grunnleggende leverandørinformasjon du normalt vil se før du går videre."
                    title="Leverandørkort"
                  >
                    <DefinitionRow
                      icon={Building2}
                      label="Organisasjonsform"
                      value={facts!.organisasjonsform ?? "Ikke oppgitt"}
                    />
                    <DefinitionRow
                      icon={CalendarDays}
                      label="Registrert"
                      value={facts!.registreringsdato ?? "Ikke oppgitt"}
                    />
                    <DefinitionRow
                      icon={Landmark}
                      label="Næringskode"
                      value={facts!.naeringskode ?? "Mangler i åpne data"}
                    />
                    <DefinitionRow
                      icon={CircleAlert}
                      label="Aktivitet"
                      value={facts!.aktivitet ?? "Mangler i åpne data"}
                    />
                    <DefinitionRow
                      icon={Globe}
                      label="Nettside"
                      value={facts!.hjemmeside ?? "Ikke registrert"}
                    />
                    <DefinitionRow
                      icon={Mail}
                      label="E-post"
                      value={facts!.epostadresse ?? "Ikke registrert"}
                    />
                    <DefinitionRow
                      icon={Phone}
                      label="Telefon"
                      value={facts!.telefon ?? "Ikke registrert"}
                    />
                  </InfoCard>

                  <InfoCard
                    description="Hvordan denne lesningen bør tolkes før du inngår dialog eller handler."
                    title="Samarbeidsrisiko"
                  >
                    <DefinitionRow
                      icon={CircleCheckBig}
                      label="Modenhet"
                      value={facts!.modenhet ?? "Ukjent"}
                    />
                    <DefinitionRow
                      icon={CircleAlert}
                      label="Kontaktdata"
                      value={
                        facts!.harKontaktdata
                          ? "Kontaktdata finnes i åpne data"
                          : "Kontaktdata mangler i åpne data"
                      }
                    />
                    <DefinitionRow
                      icon={CircleAlert}
                      label="Roller"
                      value={
                        facts!.harRoller
                          ? "Styre eller daglig leder er registrert"
                          : "Roller er ikke funnet i åpne data"
                      }
                    />
                    <DefinitionRow
                      icon={ShieldAlert}
                      label="Alvorlige signaler"
                      value={
                        facts!.harAlvorligeSignal
                          ? "Ja, undersøk manuelt før samarbeid"
                          : "Ingen alvorlige signaler funnet i denne lesningen"
                      }
                    />
                    <DefinitionRow
                      icon={TriangleAlert}
                      label="Manuell oppfølging"
                      value={manualFollowUp(displayResult)}
                    />
                  </InfoCard>
                </div>

                <InfoCard
                  description="Hvert lys har en konkret begrunnelse som kan leses av salg, innkjøp eller drift uten registerkunnskap."
                  title="Hvorfor dette lyset"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    {displayResult.funn.map((finding) => (
                      <div
                        className="flex gap-3 rounded-3xl border border-border/70 bg-background/70 p-4"
                        key={`${finding.label}-${finding.detail}`}
                      >
                        <StatusDot status={finding.severity} />
                        <div className="space-y-1.5">
                          <p className="font-medium text-foreground">
                            {finding.label}
                          </p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {finding.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </InfoCard>

                <div className="grid gap-6 lg:grid-cols-2">
                  <InfoCard
                    description="Offisielle endepunkter brukt av backend-en i denne frontend-versjonen."
                    title="Datakilder"
                  >
                    <div className="flex flex-col gap-4">
                      {displayResult.kilder.map((source) => (
                        <div key={source}>
                          <a
                            className="text-sm leading-6 text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
                            href={source}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {source}
                          </a>
                        </div>
                      ))}
                    </div>
                  </InfoCard>

                  <InfoCard
                    description="Dette er fortsatt en førsteversjon, så flere risikosignaler ligger fortsatt utenfor."
                    title="Ikke med ennå"
                  >
                    <div className="flex flex-col gap-4">
                      {displayResult.begrensninger.map((item) => (
                        <div key={item}>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>
                  </InfoCard>
                </div>
              </>
            ) : (
              <ResultsSkeleton />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function TrafficLamp({ tone }: { tone: "red" | "yellow" | "green" }) {
  const backgrounds = {
    red: "bg-[radial-gradient(circle_at_35%_30%,#ffb4a8,theme(colors.rose.500)_54%,#6f1f18_100%)]",
    yellow:
      "bg-[radial-gradient(circle_at_35%_30%,#ffe29a,theme(colors.amber.500)_54%,#815200_100%)]",
    green:
      "bg-[radial-gradient(circle_at_35%_30%,#9af5be,theme(colors.emerald.500)_54%,#145237_100%)]",
  };

  return (
    <div
      className={`aspect-square rounded-full border-[10px] border-white/6 shadow-[inset_0_16px_20px_rgba(255,255,255,0.22),inset_0_-18px_22px_rgba(0,0,0,0.26)] ${backgrounds[tone]}`}
    />
  );
}

function InfoCard({
  children,
  description,
  title,
}: Readonly<{
  children: React.ReactNode;
  description: string;
  title: string;
}>) {
  return (
    <Card className="bg-background/78 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function DefinitionRow({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: typeof Building2;
  label: string;
  value: string;
}>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="text-sm leading-6 text-foreground">{value}</p>
        </div>
      </div>
      <Separator />
    </div>
  );
}

function MetricBar({
  count,
  label,
  tone,
  total,
}: Readonly<{
  count: number;
  label: string;
  tone: string;
  total: number;
}>) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)_32px] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${(count / total) * 100}%` }}
        />
      </div>
      <span className="text-right font-medium text-foreground">{count}</span>
    </div>
  );
}

function StatusDot({ status }: Readonly<{ status: TrafficLight }>) {
  const colors = {
    GREEN: "bg-emerald-500",
    YELLOW: "bg-amber-500",
    RED: "bg-rose-500",
  };

  return <span className={`mt-1 size-3 shrink-0 rounded-full ${colors[status]}`} />;
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full max-w-3xl rounded-3xl" />
          <Skeleton className="h-7 w-full max-w-2xl" />
        </div>
        <Card className="bg-background/78 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-background/78 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
        <Card className="bg-background/78 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function manualFollowUp(result: CompanyCheck) {
  const facts = normalizeFacts(result);

  if (result.status === "RED") {
    return "Sjekk kunngjøringer, konkursforhold og signatur/prokura før du går videre.";
  }

  if (result.status === "YELLOW") {
    return "Bekreft kontaktdata, aktivitet og roller manuelt før du bruker vurderingen i beslutning.";
  }

  if (!facts.harRoller) {
    return "Ta en rask kontroll av rolle- og signaturforhold før endelig ja.";
  }

  return "Ingen tydelig blokkering i åpne data, men utvidede registre kan fortsatt gi mer presisjon.";
}

function normalizeFacts(result: CompanyCheck) {
  if (result.fakta) {
    return result.fakta;
  }

  return {
    organisasjonsform: result.organisasjonsform,
    registreringsdato: null,
    modenhet: result.status === "YELLOW" ? "Nytt eller tynt registrert selskap" : "Ukjent",
    naeringskode: null,
    aktivitet: null,
    hjemmeside: null,
    epostadresse: null,
    telefon: null,
    harKontaktdata: result.funn.some((finding) => finding.label === "Kontaktdata" && finding.severity === "GREEN"),
    harRoller: result.funn.some((finding) => finding.label === "Roller" && finding.severity === "GREEN"),
    harAlvorligeSignal: result.funn.some((finding) => finding.severity === "RED"),
  };
}

function normalizeMetrics(result: CompanyCheck) {
  if (result.statistikk) {
    return result.statistikk;
  }

  return {
    gronneFunn: result.funn.filter((finding) => finding.severity === "GREEN").length,
    guleFunn: result.funn.filter((finding) => finding.severity === "YELLOW").length,
    rodeFunn: result.funn.filter((finding) => finding.severity === "RED").length,
  };
}
