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
  - Pris: kr 3.990,-
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

Gratulerer med {{companyName}}.

{{salesSegmentPitch}}

Jeg setter opp dette ferdig for {{recipientObject}}.

Du får:
- En ryddig nettside
{{domainLine}}
- Kontaktinfo og kort presentasjon av tjenestene
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel:
{{senderWebsite}}

Si ifra hvis du vil at jeg lager et konkret forslag til {{recipientPagePossessive}} side - helt uforpliktende.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Nettsiden til {{companyName}}?`

Hei {{greeting}},

Gratulerer med {{companyName}}.

Jeg så at dere har registrert nettsiden {{registeredWebsite}}, men den ser ikke ut til å svare akkurat nå.

Jeg kan hjelpe med å få på plass en ryddig side på domenet, med kontaktinfo og kort presentasjon av hva dere tilbyr.

Du får:
- En ryddig nettside
- Kontaktinfo og kort presentasjon av tjenestene
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel:
{{senderWebsite}}

Si ifra hvis du vil at jeg tar en rask sjekk og lager et konkret forslag - helt uforpliktende.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `Nettsiden til {{companyName}}?`

Hei {{greeting}},

Gratulerer med {{companyName}}.

{{registeredWebsiteIntro}}

Jeg lager ryddige nettsider med tydelig presentasjon av tjenester, kontaktinfo og en løsning som fungerer godt på mobil.
{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Hvis dere ønsker det, kan jeg sette opp en mer ryddig side for {{recipientObject}}.

Du får:
- En ryddig nettside
- Kontaktinfo og kort presentasjon av tjenestene
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel:
{{senderWebsite}}

Si ifra hvis du vil at jeg lager et konkret forslag - helt uforpliktende.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Gratulerer med {{companyName}}.

Jeg setter opp nettadresse, nettside og kontaktpunkt ferdig for {{recipientObject}}.

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel:
{{senderWebsite}}

Gi en lyd hvis du vil se et konkret forslag til {{recipientPagePossessive}} side.

Mvh  
{{senderName}}

## Generert eksempel

Emne: `Nettside for Eksempel AS?`

Hei dere i Eksempel AS,

Gratulerer med Eksempel AS.

Jeg lager nettsider for håndverksbedrifter med tjenester, kontaktinfo, område dere dekker og en ryddig profil som gjør det lettere å bli funnet på Google.

Jeg setter opp dette ferdig for dere.

Du får:
- En ryddig nettside
- Egen nettadresse, for eksempel eksempel.no
- Kontaktinfo og kort presentasjon av tjenestene
- Klar løsning dere kan bruke med en gang

Fast pris: 3.990 kr - ferdig satt opp.

Eksempel:
https://ltj54.github.io/ltj-production/

Si ifra hvis du vil at jeg lager et konkret forslag til deres side - helt uforpliktende.

Mvh  
Lars Johannessen  
977 24 209  
kontakt@ltj-production.no
