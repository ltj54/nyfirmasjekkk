# Manuell, lesebasert tilgang til postkassen

Postkassen hos Domene.no brukes via IMAP over TLS (`mail.ltj-production.no:993`).
Backend tilbyr bare to lokale POST-operasjoner: hent de nyeste meldingshodene og les ren tekst fra én melding. Innboksen åpnes med `READ_ONLY`, og IMAP `peek` er aktivert. Det finnes ingen timer, polling, SMTP-handling, flytting, sletting eller merking i denne funksjonen.

## Første gangs oppsett

1. Kjør `scripts/setup-mailbox-read.ps1` lokalt. Det lager en tilfeldig tilgangskode i den Git-ignorerte `scripts/local-secrets.ps1`. Ikke lim inn passord eller token i chatten. `APP_MAIL_PASSWORD` må også være satt for å kunne logge inn på IMAP.
2. Start backend på nytt med `scripts/run-backend-local.ps1`. En allerede kjørende backend leser ikke inn den nye koden automatisk.
3. På den lokale CRM-siden: trykk «Hent de 10 nyeste». Tilgangskoden leses av Next.js-serveren fra den lokale hemmelighetsfilen når du trykker; den sendes aldri til nettleseren.

For Codex på denne PC-en kan Lars be om en spesifikk lesing. Da kan den lokale kommandoen brukes:

```powershell
.\scripts\mailbox-read.ps1 -Action list
.\scripts\mailbox-read.ps1 -Action read -Uid 12345
```

Codex skal spørre Lars før hver slik lesing. Kommandoene krever at backend kjører. Ingen melding blir lest automatisk når applikasjonen starter.

## Sikkerhet

Backend nekter e-posttilgang hvis `APP_MAIL_READ_TOKEN` mangler, hvis tokenet ikke stemmer, eller hvis forespørselen ikke kommer fra lokal maskin. CRM-ruten krever i tillegg lokal adresse og samme opphav. Next.js-serveren leser tokenet fra den lokale, Git-ignorerte filen og sender det kun til backend. Tokens og e-postinnhold skal ikke logges eller lagres i CRM.

Dette er lesebegrensning i vår kode, ikke et eget IMAP-passord med serverpåtvungne leserettigheter. E-postkontoens passord må derfor oppbevares like sikkert som før.
