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

Jeg kom over {{companyName}} og så at jeg ikke fant noen tydelig nettside registrert.

{{salesSegmentPitch}}

Jeg lager ryddige nettsider for nye virksomheter, med kontaktinfo, kort presentasjon og en løsning som fungerer godt på mobil.

Du får:
- En nettside klar til bruk
{{domainLine}}
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Kontaktskjema eller tydelig kontaktvei

Eksempel:
{{senderWebsite}}

Jeg kan sende et konkret forslag hvis det er interessant.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - registrert nettside svarer ikke

Emne: `Nettsiden til {{companyName}}?`

Hei {{greeting}},

Jeg så at {{companyName}} har registrert nettsiden {{registeredWebsite}}.

Da jeg sjekket den, fikk jeg ikke kontakt med siden. Det kan selvfølgelig være midlertidig, men jeg ville bare gi en liten beskjed.

Hvis dere trenger hjelp, kan jeg sette opp eller rydde opp i en nettside med kontaktinfo, kort presentasjon og god mobilvisning.

Eksempel:
{{senderWebsite}}

Jeg kan sende et konkret forslag hvis det er interessant.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## E-postmal - nettside kan forbedres

Emne: `Nettsiden til {{companyName}}?`

Hei {{greeting}},

{{registeredWebsiteIntro}}

Jeg tok en rask titt på nettsiden og kan gjerne sende et lite forslag til hvordan den kan gjøres tydeligere og enklere å bruke.

Jeg lager nettsider med tydelig presentasjon av tjenester, kontaktinfo og en løsning som fungerer godt på mobil.
{{websiteQualityMailLine}}
{{websiteComplianceMailLine}}

Jeg kan sende et konkret forslag hvis det er interessant.

Eksempel:
{{senderWebsite}}

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Jeg kom over {{companyName}} og så at jeg ikke fant noen tydelig nettside registrert.

Jeg kan sende et konkret forslag til en ryddig nettside med kontaktinfo, kort presentasjon og tydelig kontaktvei hvis det er interessant.

Eksempel:
{{senderWebsite}}

Forslaget er helt uforpliktende.

Mvh  
{{senderName}}

## Generert eksempel

Emne: `Nettside for Eksempel AS?`

Hei dere i Eksempel AS,

Jeg kom over Eksempel AS og så at jeg ikke fant noen tydelig nettside registrert.

For bygg- og håndverksbedrifter er det ofte viktig at kunder raskt ser hvilke tjenester dere tilbyr, hvilket område dere dekker og hvordan de kan ta kontakt.

Jeg lager ryddige nettsider for nye virksomheter, med kontaktinfo, kort presentasjon og en løsning som fungerer godt på mobil.

Du får:
- En nettside klar til bruk
- Egen nettadresse, for eksempel eksempel.no
- Kontaktinfo og kort presentasjon av tjenester/aktivitet
- Kontaktskjema eller tydelig kontaktvei

Eksempel:
https://ltj-production.no/

Jeg kan sende et konkret forslag hvis det er interessant.

Mvh  
Lars Johannessen  
977 24 209  
kontakt@ltj-production.no
