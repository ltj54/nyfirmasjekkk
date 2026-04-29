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
- Eksempel/URL: `{{senderWebsite}}`
- Hvorfor selskapet er relevant lead:
  - `[For eksempel: nylig registrert]`
  - `[For eksempel: mangler nettside]`
  - `[For eksempel: har e-post eller telefon registrert]`
- Tilbud:
  - Produkt: `Enkel nettside`
  - Pris: kr 4.500,-
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

Jeg så at {{companyName}} nylig er registrert - gratulerer med oppstart!

Vi hjelper små og nystartede firmaer med å få på plass en enkel og ryddig nettside, slik at kunder finner dere og kan ta kontakt med en gang.

Typisk oppsett er:
- Forside med hva dere tilbyr
- Kontaktinfo med telefon og e-post
- Enkel presentasjon av tjenester

Vi kan sette opp dette ferdig for dere til en fast pris på kr {{price}},-
inkludert hjelp med domene og e-post hvis dere trenger det.

Se eksempel her:
{{senderWebsite}}

Si ifra hvis du vil at jeg skal sende et konkret forslag og et eksempel på hvordan siden kan se ut for dere. Det er helt uforpliktende.

Mvh  
{{senderName}}  
{{senderCompany}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Ser dere er nystartet - trenger dere en enkel nettside så folk finner dere?

Vi lager enkle, ryddige sider for små firmaer med kontaktinfo, tjenester og oppsett klart til bruk.

Fast pris: kr {{price}},-

Eksempel:
{{senderWebsite}}

Gi en lyd hvis du vil se et konkret forslag og et eksempel for deres firma.

Mvh  
{{senderName}}

## Generert eksempel

Emne: `Tilbud om enkel nettside til Eksempel AS`

Hei dere i Eksempel AS,

Jeg så at Eksempel AS nylig er registrert - gratulerer med oppstart!

Vi hjelper små og nystartede firmaer med å få på plass en enkel og ryddig nettside, slik at kunder finner dere og kan ta kontakt med en gang.

Typisk oppsett er:
- Forside med hva dere tilbyr
- Kontaktinfo med telefon og e-post
- Enkel presentasjon av tjenester

Vi kan sette opp dette ferdig for dere til en fast pris på kr 4.500,-
inkludert hjelp med domene og e-post hvis dere trenger det.

Se eksempel her:
https://ltj54.github.io/ltj-production/

Si ifra hvis du vil at jeg skal sende et konkret forslag og et eksempel på hvordan siden kan se ut for dere. Det er helt uforpliktende.

Mvh  
Lars Tangen Johannessen
