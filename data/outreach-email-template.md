# Formular for tilbudsmail

Bruk denne malen som grunnlag når en tilbudsmail om nettside skal genereres.

## Input

- Dato: `YYYY-MM-DD`
- Selskapsnavn: `{{companyName}}`
- Organisasjonsnummer: `{{orgNumber}}`
- Kontaktperson: `{{contactPerson}}`
- E-post: `{{companyEmail}}`
- Telefon: `{{companyPhone}}`
- Kommune/fylke: `{{location}}`
- NACE: `{{naceCode}}` / `{{naceDescription}}`
- Salgsgruppe: `{{salesSegment}}`
- Tilpasset bransjetekst: `{{salesSegmentPitch}}`
- Mottakerform: `{{recipientSubject}}`, `{{recipientPossessive}}`, `{{recipientObject}}`, `{{recipientPagePossessive}}`
- Domeneeksempel: `{{domainExample}}`
- Domenelinje: `{{domainLine}}`
- Registrert nettside-intro: `{{registeredWebsiteIntro}}`
- Forsiktig personvern/UU-linje: `{{websiteComplianceMailLine}}`
- Eksempel/URL: `{{senderWebsite}}`
- Hvorfor selskapet er relevant lead:
  - `[For eksempel: nylig registrert]`
  - `[For eksempel: mangler nettside]`
  - `[For eksempel: har e-post eller telefon registrert]`
- Tilbud:
  - Produkt: `Nettside`
  - Innhold:
    - `Nettside`
    - `Hjelp med domene`
    - `Hjelp med e-post`
    - `Tydelig kontaktpunkt`
- Tone:
  - `kort`
  - `ryddig`
  - `ikke påtrengende`
  - `konkret`

## Regler for generering

- Hold e-posten kort, helst 120-180 ord.
- Skriv på norsk bokmal.
- Ikke bruk overdreven salgstone.
- Ikke påsta ting du ikke vet sikkert.
- Hvis kontaktperson mangler, skriv til selskapet generelt.
- Hvis telefon mangler, ikke nevn telefon.
- Hvis nettside allerede finnes, bruk ikke denne malen uten manuell vurdering.

## Emneforslag

- `Nettside for {{companyName}}?`
- `Nettside for {{companyName}}?`
- `Forslag til digital start for {{companyName}}`

## E-postmal

Emne: `Nettside for {{companyName}}?`

Hei {{greeting}},

{{companyName}} ser ut til å mangle en tydelig nettside.

{{salesSegmentPitch}}

Jeg lager ryddige nettsider for nye virksomheter, med kontaktinfo, kort presentasjon og en løsning som fungerer godt på mobil.

Du får:
- En nettside klar til bruk
{{domainLine}}
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Kontaktskjema eller tydelig kontaktvei

Eksempel:
{{senderWebsite}}

Et konkret forslag kan sendes hvis det er interessant.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Kort nettsidegjennomgang for {{registeredWebsite}}?`

Hei {{greeting}},

{{companyName}} har {{registeredWebsite}} registrert som nettside i BRREG.

Jeg gjorde en enkel førstesjekk, og akkurat da svarte ikke nettsiden. Det kan selvfølgelig være midlertidig, men dersom siden er ustabil eller utilgjengelig over tid, kan det gjøre at kunder, samarbeidspartnere eller søkemotorer ikke får tak i informasjonen de trenger.

Jeg kan gjerne gjøre en kort og konkret gjennomgang av nettsiden og se på:

- om siden svarer stabilt
- tekniske feil eller videresendinger
- mobilvisning
- kontaktinformasjon
- enkel synlighet og tillitssignaler

Hvis siden faktisk er nede eller mangler fungerende oppsett, kan jeg også ta oppdraget med å få en ryddig og mobilvennlig nettside på plass.

Hvis dere ønsker det, kan jeg sende en kort vurdering med eventuelle funn og forslag til tiltak.

Eksempel:
{{websiteCheckSenderWebsite}}

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `Nettsiden til {{companyName}}?`

Hei {{greeting}},

{{registeredWebsiteIntro}}

Jeg gjorde en enkel, automatisk førstesjekk av nettsiden og fant noen punkter som kan være verdt å se nærmere på. Dette er ikke ment som en konklusjon, men som signaler som bør vurderes manuelt.
{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Hvis det er interessant, kan jeg sende en kort og ryddig gjennomgang med konkrete funn, vurdering av alvorlighet og forslag til tiltak.

Eksempel:
{{websiteCheckSenderWebsite}}

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside bør vurderes

Emne: `Kort nettsidegjennomgang for {{registeredWebsite}}?`

Hei {{greeting}},

{{registeredWebsiteIntro}}

Jeg gjorde en enkel, automatisk førstesjekk av nettsiden og fant noen punkter som kan være verdt å se nærmere på. Dette er ikke ment som en konklusjon, men som signaler som bør vurderes manuelt — særlig for en etablert organisasjon der tillit, tilgjengelighet og personvern er viktig.

Eksempler på områder jeg kan gå gjennom:

- tilgjengelighet / universell utforming
- knapper, bilder og struktur for skjermleser og mobil
- cookies, analyse og samtykkeflyt
- sikkerhetsheadere og tekniske eksponeringer
- eksterne scripts og innebygd tredjepartsinnhold
- e-postdomene / DMARC, SPF og DKIM på overordnet nivå

Hvis det er interessant, kan jeg sende en kort og ryddig gjennomgang med konkrete funn, vurdering av alvorlighet og forslag til tiltak.

Eksempel:
{{websiteCheckSenderWebsite}}

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

{{companyName}} ser ut til å mangle en tydelig nettside.

Et konkret forslag til en ryddig nettside med kontaktinfo, kort presentasjon og tydelig kontaktvei kan sendes hvis det er interessant.

Eksempel:
{{senderWebsite}}

Forslaget er helt uforpliktende.

Mvh  
{{senderName}}

## Generert eksempel

Emne: `Nettside for Eksempel AS?`

Hei dere i Eksempel AS,

Eksempel AS ser ut til å mangle en tydelig nettside.

For bygg- og håndverksbedrifter er det ofte viktig at kunder raskt ser hvilke tjenester dere tilbyr, hvilket område dere dekker og hvordan de kan ta kontakt.

Jeg lager ryddige nettsider for nye virksomheter, med kontaktinfo, kort presentasjon og en løsning som fungerer godt på mobil.

Du får:
- En nettside klar til bruk
- Egen nettadresse, for eksempel eksempel.no
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Kontaktskjema eller tydelig kontaktvei

Eksempel:
https://ltj-production.no/

Et konkret forslag kan sendes hvis det er interessant.

Mvh  
Lars Johannessen  
977 24 209  
kontakt@ltj-production.no
