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
- Hvorfor selskapet er relevant lead:
  - `[For eksempel: nylig registrert]`
  - `[For eksempel: mangler nettside]`
  - `[For eksempel: har e-post eller telefon registrert]`
- Tilbud:
  - Produkt: `Enkel nettside`
  - Pris: kr 4.500
  - Innhold:
    - `Enkel nettside`
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
- `Tilbud om enkel nettside til {{companyName}}`
- `Forslag til digital start for {{companyName}}`

## E-postmal

Emne: `Tilbud om enkel nettside til {{companyName}}`

Hei {{greeting}},

Jeg så at {{companyName}} er et nytt selskap, og ville derfor sende en kort henvendelse.

Jeg hjelper nye virksomheter med en enkel digital startpakke, slik at dere raskt får på plass en ryddig nettside med kontaktinformasjon, samt hjelp med domene og e-post ved behov.

Jeg kan levere dette som en enkel pakke til `kr {{price}}`.

Hvis dette er aktuelt, kan jeg sende et helt konkret forslag til oppsett og hva som kan være på siden.

Mvh  
{{senderName}}  
{{senderCompany}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Jeg så at {{companyName}} er nyregistrert og ville høre om dere trenger en enkel nettside med kontaktinformasjon, domene og e-posthjelp fra start.

Jeg tilbyr dette som en enkel pakke til `kr {{price}}`.

Gi gjerne beskjed hvis du vil at jeg skal sende et konkret forslag.

Mvh  
{{senderName}}

## Generert eksempel

Emne: `Tilbud om enkel nettside til Eksempel AS`

Hei dere i Eksempel AS,

Jeg så at Eksempel AS er et nytt selskap, og ville derfor sende en kort henvendelse.

Jeg hjelper nye virksomheter med å få på plass en enkel nettside med tydelig kontaktinformasjon, samt hjelp med domene og e-post ved behov.

Jeg kan levere dette som en enkel pakke til kr 4.500.

Hvis dette er aktuelt, kan jeg sende et kort og konkret forslag til oppsett.

Mvh  
[DITT NAVN]
