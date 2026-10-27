import Link from "next/link";

import { SwedenPilot } from "@/components/sweden-pilot";

export const dynamic = "force-dynamic";

export default function SwedenPilotPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/" className="text-sm text-blue-800 underline underline-offset-2">Tilbake til NyFirmasjekk</Link>
      <h1 className="mt-5 text-3xl font-semibold text-slate-900">Sverige · pilot</h1>
      <p className="mt-3 max-w-3xl text-sm text-slate-600">En liten datatest med inntil 10 svenske aktiebolag fra SCB. Utvalget følger registerets rekkefølge og er ikke et utvalg av de nyeste selskapene. Oppføringene er bare til vurdering; ingen e-post sendes eller oppfølging opprettes.</p>
      <SwedenPilot configured={Boolean(process.env.SCB_API_KEY?.trim())} />
    </main>
  );
}
