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
- Mottakerform: `{{recipientSubject}}`, `{{recipientPossessive}}`, `{{recipientObject}}`, `{{recipientPagePossessive}}`
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

Gratulerer med {{companyName}}.

De fleste nye foretak trenger raskt:
- en nettadresse
- en enkel nettside
- et sted kunder kan ta kontakt

Jeg setter opp dette ferdig for {{recipientObject}}.

Du får:
- En ryddig nettside
- Egen nettadresse, for eksempel firmanavn.no
- Kontaktinfo og enkel presentasjon av hva {{recipientSubject}} tilbyr
- Klar løsning {{recipientSubject}} kan bruke med en gang

Fast pris: {{price}} kr - ferdig satt opp.

Eksempel:
{{senderWebsite}}

Si ifra hvis du vil at jeg lager et konkret forslag til {{recipientPagePossessive}} side - helt uforpliktende.

Mvh  
{{senderName}}  
{{senderPhone}}  
{{senderEmail}}

## Kort variant

Hei {{greeting}},

Gratulerer med {{companyName}}.

Jeg setter opp nettadresse, enkel nettside og kontaktpunkt ferdig for {{recipientObject}}.

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

De fleste nye foretak trenger raskt:
- en nettadresse
- en enkel nettside
- et sted kunder kan ta kontakt

Jeg setter opp dette ferdig for dere.

Du får:
- En ryddig nettside
- Egen nettadresse, for eksempel firmanavn.no
- Kontaktinfo og enkel presentasjon av hva dere tilbyr
- Klar løsning dere kan bruke med en gang

Fast pris: 4.500 kr - ferdig satt opp.

Eksempel:
https://ltj54.github.io/ltj-production/

Si ifra hvis du vil at jeg lager et konkret forslag til deres side - helt uforpliktende.

Mvh  
Lars Tangen Johannessen  
977 24 209  
latajo@gmail.no
