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
- Mottakerform: `{{recipientSubject}}`, `{{recipientPossessive}}`
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
- `Enkel nettside for {{companyName}}?`
- `Forslag til digital start for {{companyName}}`

## E-postmal

Emne: `Nettside for {{companyName}}?`

Hei {{greeting}},

Jeg så at {{companyName}} nylig er registrert, og ville bare høre om {{recipientSubject}} trenger en enkel nettside.

Jeg lager enkle, ryddige nettsider for nye foretak, med fokus på at kunder raskt finner hva {{recipientSubject}} tilbyr og hvordan de kan ta kontakt.

Typisk oppsett er:
- Forside med hva {{recipientSubject}} tilbyr
- Kontaktinfo med telefon og e-post
- Enkel presentasjon av tjenester

Jeg kan sette opp dette ferdig til en fast pris på kr {{price}},-
inkludert hjelp med domene og e-post hvis {{recipientSubject}} trenger det.

Se eksempel her:
{{senderWebsite}}

Hvis dette er aktuelt, kan jeg sende et konkret forslag til tekst og oppsett for {{recipientPossessive}} foretak.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Ser at {{companyName}} er nystartet - trenger {{recipientSubject}} en enkel nettside så folk finner fram?

Jeg lager enkle, ryddige sider for nye foretak med kontaktinfo, tjenester og oppsett klart til bruk.

Fast pris: kr {{price}},-

Eksempel:
{{senderWebsite}}

Gi en lyd hvis du vil se et konkret forslag og et eksempel for {{recipientPossessive}} foretak.

Mvh  
{{senderName}}

## Generert eksempel

Emne: `Nettside for Eksempel AS?`

Hei dere i Eksempel AS,

Jeg så at Eksempel AS nylig er registrert, og ville bare høre om dere trenger en enkel nettside.

Jeg lager enkle, ryddige nettsider for nye foretak, med fokus på at kunder raskt finner hva dere tilbyr og hvordan de kan ta kontakt.

Typisk oppsett er:
- Forside med hva dere tilbyr
- Kontaktinfo med telefon og e-post
- Enkel presentasjon av tjenester

Jeg kan sette opp dette ferdig til en fast pris på kr 4.500,-
inkludert hjelp med domene og e-post hvis dere trenger det.

Se eksempel her:
https://ltj54.github.io/ltj-production/

Hvis dette er aktuelt, kan jeg sende et konkret forslag til tekst og oppsett for deres foretak.

Mvh  
Lars Tangen Johannessen  
977 24 209  
latajo@gmail.no
