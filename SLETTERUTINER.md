# Sletterutiner for prosjekter og GitHub

Denne rutinen brukes når et nettsted eller prosjekt ikke lenger skal være aktivt, men fortsatt skal kunne gjenfinnes.

## Standard prosedyre

1. Kontroller at prosjektmappen finnes lokalt, og at Git-status og remote er kjent.
2. Behold den lokale kopien som sikkerhetskopi.
3. Omdøp mappen til:

   `<prosjektnavn>_FJERNET-GITHUB`

4. Kontroller at Git-historikk og remote fortsatt finnes i den omdøpte mappen.
5. Arkiver GitHub-repositoriet først. Repositoriet skal ikke slettes i første omgang.
6. Kontroller at GitHub viser repositoriet som arkivert.
7. Oppdater CRM-kortet:
   - behold kortet i CRM
   - bruk hvit/nøytral bakgrunn
   - sett status til «Arkivert i GitHub»
   - noter nytt lokalt mappenavn
   - noter at repositoriet er beholdt som sikkerhetskopi
8. Dersom prosjektet også bruker ChatGPT Sites eller annen hosting, fjernes den aktive publiseringen separat etter kontroll.

## Senere sletting

Et arkivert GitHub-repository kan slettes senere dersom den lokale kopien er kontrollert og det er avklart at repositoriet ikke lenger trengs. Sletting krever uttrykkelig beskjed og skal ikke gjøres automatisk.

## Prosjekter som følger rutinen

- Minde Momentum → `minde-momentum_FJERNET-GITHUB`
- Skifjelds Håndverk → `skifjelds-handverk_FJERNET-GITHUB`
- Casa Latina Trondheim → `casa-latina-trondheim_FJERNET-GITHUB`
