# Sletterutiner for prosjekter og GitHub

Denne rutinen brukes når et nettsted eller prosjekt ikke lenger skal være aktivt, men fortsatt skal kunne gjenfinnes.

## Standard prosedyre

1. Kontroller om prosjektmappen finnes lokalt. Hvis den finnes, noter Git-status og remote. Hvis den ikke finnes, søk i vanlige prosjektområder og dokumenter at den ikke ble funnet.
2. Behold den lokale kopien som sikkerhetskopi når den finnes. Ikke klon automatisk og behandle klonen som den opprinnelige arbeidskopien.
3. Arkiver GitHub-repositoriet. Hvis lokal mappe mangler, kan arkivering likevel utføres når brukeren uttrykkelig ber om det. Bekreft statusen på GitHub.
4. Hvis en lokal prosjektmappe finnes, omdøp den til:

   `<prosjektnavn>_FJERNET-GITHUB`

5. Kontroller at Git-historikk og remote fortsatt finnes i den omdøpte mappen. Behold også eksisterende, uregistrerte lokale filer.
6. Oppdater et eksisterende CRM-kort hvis det finnes, men ikke opprett CRM-kort automatisk:
   - behold kortet i CRM
   - bruk hvit/nøytral bakgrunn
   - sett status til «Arkivert i GitHub»
   - noter nytt lokalt mappenavn, eller at lokal mappe ikke ble funnet
   - noter at repositoriet er beholdt som sikkerhetskopi
7. Dersom prosjektet også bruker ChatGPT Sites eller annen hosting, fjernes den aktive publiseringen separat etter kontroll.

## Senere sletting

Et arkivert GitHub-repository kan slettes senere dersom den lokale kopien er kontrollert og det er avklart at repositoriet ikke lenger trengs. Sletting krever uttrykkelig beskjed og skal ikke gjøres automatisk.

## Prosjekter som følger rutinen

- Minde Momentum → `minde-momentum_FJERNET-GITHUB`
- Skifjelds Håndverk → `skifjelds-handverk_FJERNET-GITHUB`
- Casa Latina Trondheim → `casa-latina-trondheim_FJERNET-GITHUB`
- Samlivsbrudd → `samlivsbrudd_FJERNET-GITHUB`
- Samlivsbrudd TWA → `samlivsbrudd-twa_FJERNET-GITHUB`
- Samlivsbrudd Legal → `samlivsbrudd-legal_FJERNET-GITHUB`
- LTJ WS → Lokal mappe ikke funnet; arkivert etter uttrykkelig beskjed.
- LTJ Intelligpt → Lokal mappe ikke funnet; arkivert etter uttrykkelig beskjed.
- Shape Drop IntelliJ → `Shape-Drop-IntelliJ_FJERNET-GITHUB`
- MLC Eiendomsfornying Leszczynski → `mlc-eiendomsfornying_FJERNET-GITHUB`. Arkivert i GitHub og GitHub Pages avpublisert 21.09.2026 etter manglende svar. Lokal Git-historikk og remote kontrollert og beholdt; arbeidskopien var ren før og etter omdøping. CRM-kort beholdt som inaktivt uten videre purring.
- SV Pelsar Sp. z o.o. → Satt inaktiv i CRM 21.09.2026 etter manglende svar på purring. Ingen repository funnet blant repositoriene til `ltj54`; ingen lokal prosjektmappe funnet ved søk i `C:\Prosjekt` og brukerens dokument-/skrivebordsområder. Ingen GitHub-arkivering eller omdøping utført. CRM-kort og dialoghistorikk beholdt uten videre purring.
