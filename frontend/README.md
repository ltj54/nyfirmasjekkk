This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) with your browser to see the result.

The CRM is local-only: the Next.js scripts and Spring backend bind to `127.0.0.1`.
API writes require a same-origin browser request. Do not publish this app on a public
hostname without separate authentication for the UI and API.

## Sverige-pilot

Åpne `/sverige` eller velg «Sverige · pilot» i navigasjonen. Piloten leser et
begrenset utvalg fra SCBs allmänna företagsregister, kun etter manuelt klikk.
Den lagrer ikke resultatene og har ingen kobling til e-post, CRM eller norske leads.

Tilgangsstatus 27.10.2026: SCB har godkjent forespørselen etter manuell
registrering og signering via Visma Addo. API-nøkkelen er mottatt. SCB opplyser
at tilgangen er kostnadsfri, at nøkkelen kan bruke inntil 30 minutter på å bli
aktivert, og at den er aktiv i to år fra utstedelsesdatoen. API-et oppdateres
hver natt mellom kl. 04.00 og 04.30 og er ikke tilgjengelig i dette tidsrommet.
Nøkkel, fødselsdato og personnummer skal ikke lagres i prosjektet eller chatten.
Ingen automatisk oppfølging er planlagt.

1. Legg `SCB_API_KEY=din_nøkkel` i `frontend/.env.local` (ignorert av Git).
   Behold nøkkelen lokalt; bruk ikke `NEXT_PUBLIC_`-prefiks.
2. Start frontend på nytt, åpne `/sverige`, og trykk «Hent inntil 10 svenske AB».

Tilgang er foreløpig bare aktiv fra lokal app med samme origin. Nøkkelen brukes
bare av serveren. Ingen registerkall skjer ved sidevisning. Hvert klikk leser
syv relevante kodetabeller, første side med maks 10 selskaper i juridisk form 49
(övriga aktiebolag), og deretter full detalj for disse, sekvensielt med 300 ms
mellom kall. Maks 18 SCB-kall per klikk, ingen automatisk retry eller traversering
av hele registeret. Bare aktive virksomheter med oppgitt e-post og eksplisitt
kode 1 (ingen sperre) både for e-post og generell reklame merkes «Kan vurderes».
Ukjent status behandles som sperret fra kontakt.

Dette er en integrasjonstest, ikke et representativt eller nyregistrert leadutvalg.
SCBs `regDat` er registreringsdato i SCBs register, ikke nødvendigvis stiftelsesdato.
Nettside finnes ikke i JE-kontrakten og undersøkes ikke i denne piloten.
Reservasjons-, status-, skatte-, MVA-, ansatt- og omsetningskoder oversettes fra
SCBs kodetabeller ved hver manuelle prøvehenting.
Oppgitt e-post er ikke validert for levering. Norske filtre, prioritet og
utsendelsesregler skal ikke brukes på de svenske oppføringene.

API-kontrakt kontrollert 21.10.2026:
<https://apiafr.scb.se/swagger/v1/swagger.json>.
SCB-dokumentasjon: <https://apiafr.scb.se/scalar/>.

Integrasjonstester med simulerte SCB-svar:
`node --test tests/sweden-pilot.test.mjs`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
