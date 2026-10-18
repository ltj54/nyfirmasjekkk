# E-posttilgang

- `kontakt@ltj-production.no` skal bare leses etter en konkret forespørsel fra Lars i den aktuelle samtalen. Ikke åpne innboksen, list meldinger eller les en melding på eget initiativ.
- Ikke sett opp polling, automatiske e-postoppgaver eller automatisk CRM-registrering basert på innboksen.
- Ikke send, svar, videresend, slett, flytt, merk som lest eller endre e-post via den lesebaserte tilgangen. Spør Lars før eventuelle andre e-posthandlinger.
- Lokal lesetilgang er tilgjengelig via `scripts/mailbox-read.ps1` når backend kjører og `APP_MAIL_READ_TOKEN` er konfigurert i den ignorerte `scripts/local-secrets.ps1`.
- Ikke les eller skriv hemmelighetene i `scripts/local-secrets.ps1` til terminalutdata, chat, logg eller Git.
