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

Jeg så {{companyName}} og ville bare høre om {{recipientSubject}} trenger en nettside.

{{salesSegmentPitch}}

Jeg kan sette opp dette ferdig for {{recipientObject}}, slik at {{recipientSubject}} får en fast side å vise til i e-post, sosiale medier og kundedialog.

Du får:
- En ryddig nettside som fungerer godt på mobil
{{domainLine}}
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel på enkel side:
{{senderWebsite}}

Si ifra hvis du vil at jeg lager et konkret forslag til {{recipientPagePossessive}} side. Det er helt uforpliktende.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Nettsiden til {{companyName}}?`

Hei {{greeting}},

Jeg så at {{companyName}} har registrert nettsiden {{registeredWebsite}}.

Da jeg sjekket den, så det ut som siden ikke svarte akkurat nå. Det kan være midlertidig, men jeg ville bare gi beskjed.

Jeg kan hjelpe med å få på plass en ryddig nettside på domenet, med kontaktinfo og kort presentasjon av hva dere tilbyr.

Du får:
- En ryddig nettside som fungerer godt på mobil
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel på enkel side:
{{senderWebsite}}

Si ifra hvis du vil at jeg tar en rask sjekk og lager et konkret forslag. Det er helt uforpliktende.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `Nettsiden til {{companyName}}?`

Hei {{greeting}},

{{registeredWebsiteIntro}}

Jeg ville bare høre om dere ønsker en enklere og mer ryddig presentasjon på nett.

Jeg lager nettsider med tydelig presentasjon av tjenester, kontaktinfo og en løsning som fungerer godt på mobil.
{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Hvis dere ønsker det, kan jeg sette opp en mer oversiktlig side for {{recipientObject}}.

Du får:
- En ryddig nettside som fungerer godt på mobil
- Tydelig presentasjon av tjenester/aktivitet
- Kontaktinfo lett tilgjengelig for kunder
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel på enkel side:
{{senderWebsite}}

Si ifra hvis du vil at jeg lager et konkret forslag. Det er helt uforpliktende.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Jeg så {{companyName}} og ville bare høre om {{recipientSubject}} trenger en nettside.

Jeg kan sette opp nettadresse, nettside og kontaktpunkt ferdig for {{recipientObject}}.

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel på enkel side:
{{senderWebsite}}

Gi en lyd hvis du vil se et konkret forslag til {{recipientPagePossessive}} side.

Mvh  
{{senderName}}

## Generert eksempel

Emne: `Nettside for Eksempel AS?`

Hei dere i Eksempel AS,

Jeg så Eksempel AS og ville bare høre om dere trenger en nettside.

For bygg- og håndverksbedrifter er det ofte viktig at kunder raskt ser hvilke tjenester dere tilbyr, hvilket område dere dekker og hvordan de kan ta kontakt.

Jeg kan sette opp dette ferdig for dere, slik at dere får en fast side å vise til i e-post, sosiale medier og kundedialog.

Du får:
- En ryddig nettside som fungerer godt på mobil
- Egen nettadresse, for eksempel eksempel.no
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Klar løsning dere kan bruke med en gang

Fast pris: 3.990 kr - ferdig satt opp.

Eksempel på enkel side:
https://ltj-production.no/

Si ifra hvis du vil at jeg lager et konkret forslag til deres side. Det er helt uforpliktende.

Mvh  
Lars Johannessen  
977 24 209  
kontakt@ltj-production.no
