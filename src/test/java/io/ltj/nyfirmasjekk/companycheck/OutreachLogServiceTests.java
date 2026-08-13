package io.ltj.nyfirmasjekk.companycheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;

class OutreachLogServiceTests {

    @TempDir
    Path tempDir;

    @Test
    void registerSentStoresAndReturnsSentStatus() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        OutreachStatusResponse response = service.register(new OutreachStatusRequest(
                "123456789",
                "Test AS",
                "AS",
                true,
                null,
                4500,
                "email",
                "website-offer",
                null
        ));

        assertThat(response.sent()).isTrue();
        assertThat(response.status()).isEqualTo("sent");
        assertThat(response.orgNumber()).isEqualTo("123456789");
        assertThat(response.companyName()).isEqualTo("Test AS");
        assertThat(response.organizationForm()).isEqualTo("AS");
        assertThat(response.price()).isEqualTo(4500);
        assertThat(response.channel()).isEqualTo("email");
        assertThat(response.offerType()).isEqualTo("website-offer");
        assertThat(response.sentAt()).isEqualTo("2026-04-23T10:15:30Z");
        assertThat(response.note()).isNull();
    }

    @Test
    void registerRevertedClearsSentStatus() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        service.register(new OutreachStatusRequest("123456789", "Test AS", "AS", true, null, 4500, "email", "website-offer", null));
        OutreachStatusResponse response = service.register(new OutreachStatusRequest("123456789", "Test AS", "AS", false, null, 4500, "email", "website-offer", null));

        assertThat(response.sent()).isFalse();
        assertThat(response.status()).isEqualTo("reverted");
        assertThat(response.sentAt()).isNull();
        assertThat(response.note()).isNull();
        assertThat(response.everSent()).isTrue();
        assertThat(service.hasEverSent("123456789")).isTrue();
    }

    @Test
    void neverSentCompanyIsNotMarkedAsEverSent() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        OutreachStatusResponse response = service.register(new OutreachStatusRequest(
                "123456789", "Test AS", "AS", false, "not_relevant", null,
                "email", "website-offer", null
        ));

        assertThat(response.everSent()).isFalse();
        assertThat(service.hasEverSent("123456789")).isFalse();
    }

    @Test
    void registerGeneratesMonthlyMarkdownReport() throws Exception {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        service.register(new OutreachStatusRequest("123456789", "Test AS", "AS", true, null, 4500, "email", "website-offer", "Ferdig utkast sendt"));

        Path reportPath = tempDir.resolve("outreach-log-2026-04.md");
        assertThat(Files.exists(reportPath)).isTrue();
        String report = Files.readString(reportPath);

        assertThat(report)
                .contains("# Outreach-logg 2026-04")
                .contains("Aktive kontaktede selskaper: 1")
                .contains("Test AS")
                .contains("Selskapsform")
                .contains("AS")
                .doesNotContain("kr 4.500")
                .contains("Ferdig utkast sendt");
    }

    @Test
    void registerArchivesOlderMonthsButPreservesStatusLookup() throws Exception {
        Path logPath = tempDir.resolve("outreach-log.jsonl");
        Files.writeString(
                logPath,
                """
                {"timestamp":"2026-04-23T10:15:30Z","orgNumber":"123456789","companyName":"April AS","status":"sent","price":4500,"channel":"email","offerType":"website-offer","note":"April"}
                """,
                java.nio.file.StandardOpenOption.CREATE,
                java.nio.file.StandardOpenOption.TRUNCATE_EXISTING,
                java.nio.file.StandardOpenOption.WRITE
        );

        OutreachLogService service = new OutreachLogService(
                logPath,
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-05-02T08:00:00Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        service.register(new OutreachStatusRequest("987654321", "Mai AS", "AS", true, null, 4500, "email", "website-offer", null));

        Path archivePath = tempDir.resolve("archive").resolve("outreach-log-2026-04.jsonl");
        assertThat(Files.exists(archivePath)).isTrue();
        assertThat(Files.readString(logPath)).contains("987654321").doesNotContain("123456789");
        assertThat(Files.readString(archivePath)).contains("123456789");
        assertThat(service.statusFor("123456789").sent()).isTrue();
        assertThat(service.statusFor("987654321").sent()).isTrue();
    }

    @Test
    void registerNotRelevantStoresInactiveStatus() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        OutreachStatusResponse response = service.register(new OutreachStatusRequest(
                "123456789",
                "Test AS",
                "AS",
                false,
                "not_relevant",
                4500,
                "email",
                "website-offer",
                "Ikke relevant for tilbud"
        ));

        assertThat(response.sent()).isFalse();
        assertThat(response.status()).isEqualTo("not_relevant");
        assertThat(response.note()).isEqualTo("Ikke relevant for tilbud");
    }

    @Test
    void registerRepliedStoresReplyWithoutLosingContactHistory() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        service.register(new OutreachStatusRequest(
                "123456789", "Test AS", "AS", true, null, null,
                "email", "website-offer", "Første e-post sendt"
        ));
        OutreachStatusResponse response = service.register(new OutreachStatusRequest(
                "123456789", "Test AS", "AS", false, "replied", null,
                "email", "website-offer", "Svar mottatt – interessert"
        ));

        assertThat(response.sent()).isFalse();
        assertThat(response.status()).isEqualTo("replied");
        assertThat(response.note()).isEqualTo("Svar mottatt – interessert");
        assertThat(response.everSent()).isTrue();
        assertThat(response.sendBlocked()).isTrue();
    }

    @Test
    void registerAutoReplyKeepsOriginalOfferEligibleForFollowUp() throws Exception {
        Path logPath = tempDir.resolve("outreach-log.jsonl");
        Files.writeString(logPath, """
                {"timestamp":"2026-04-17T10:15:30Z","orgNumber":"123456789","companyName":"Test AS","organizationForm":"AS","status":"sent","price":null,"channel":"email","offerType":"website-offer","note":null}
                """);
        OutreachLogService service = new OutreachLogService(
                logPath,
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-27T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        OutreachStatusResponse response = service.register(new OutreachStatusRequest(
                "123456789", "Test AS", "AS", false, "auto_replied", null,
                "email", "website-offer", "Automatisk mottaksbekreftelse; avventer reelt svar."
        ));

        assertThat(response.status()).isEqualTo("auto_replied");
        assertThat(response.everSent()).isTrue();
        assertThat(response.sendBlocked()).isTrue();
        assertThat(Files.readString(tempDir.resolve("outreach-log-2026-04.md")))
                .contains("Aktive kontaktede selskaper: 1")
                .contains("Test AS");
        assertThat(service.reserveFollowUp(new OutreachStatusRequest(
                "123456789", "Test AS", "AS", true, "sent", null,
                "email", "website-follow-up", null
        ))).isTrue();
    }

    @Test
    void statusesReturnsAllOutreachEventsInReverseTimestampOrder() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        service.register(new OutreachStatusRequest("123456789", "Sendt AS", "AS", true, null, 4500, "email", "website-offer", "Sendt"));
        service.register(new OutreachStatusRequest("987654321", "Ikke AS", "AS", false, "not_relevant", 4500, "email", "website-offer", "Ikke aktuell"));
        service.register(new OutreachStatusRequest("123456789", "Sendt AS", "AS", false, null, 4500, "email", "website-offer", "Angret etter sendt"));

        var statuses = service.statuses();

        assertThat(statuses).hasSize(3);
        assertThat(statuses).extracting(OutreachStatusResponse::orgNumber)
                .containsExactly("123456789", "987654321", "123456789");
        assertThat(statuses).extracting(OutreachStatusResponse::note)
                .containsExactly("Sendt", "Ikke aktuell", "Angret etter sendt");
        assertThat(statuses.stream().filter(OutreachStatusResponse::sent).toList()).hasSize(1);
        assertThat(statuses.getFirst().timestamp()).isEqualTo("2026-04-23T10:15:30Z");
    }

    @Test
    void exportJsonlReturnsAllEntriesInTimestampOrder() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        service.register(new OutreachStatusRequest("123456789", "Sendt AS", "AS", true, null, 4500, "email", "website-offer", "Sendt"));
        service.register(new OutreachStatusRequest("123456789", "Sendt AS", "AS", false, null, 4500, "email", "website-offer", "Angret"));

        String export = service.exportJsonl();

        assertThat(export)
                .contains("\"orgNumber\":\"123456789\"")
                .contains("\"status\":\"sent\"")
                .contains("\"status\":\"reverted\"");
        assertThat(export.lines()).hasSize(2);
    }

    @Test
    void importJsonlAddsMissingEntriesAndSkipsDuplicates() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );
        String jsonl = """
                {"timestamp":"2026-04-20T08:00:00Z","orgNumber":"123456789","companyName":"Import AS","organizationForm":"AS","status":"sent","price":4500,"channel":"email","offerType":"website-offer","note":"Importert"}
                {"timestamp":"2026-04-20T08:00:00Z","orgNumber":"123456789","companyName":"Import AS","organizationForm":"AS","status":"sent","price":4500,"channel":"email","offerType":"website-offer","note":"Importert"}
                """;

        OutreachImportResponse firstImport = service.importJsonl(jsonl);
        OutreachImportResponse secondImport = service.importJsonl(jsonl);

        assertThat(firstImport.imported()).isEqualTo(1);
        assertThat(firstImport.skipped()).isEqualTo(1);
        assertThat(secondImport.imported()).isZero();
        assertThat(secondImport.skipped()).isEqualTo(2);
        assertThat(service.statusFor("123456789").sent()).isTrue();
        assertThat(service.exportJsonl().lines()).hasSize(1);
    }

    @Test
    void reserveSendAtomicallyBlocksASecondSendAttempt() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );
        OutreachStatusRequest request = new OutreachStatusRequest(
                "123456789", "Test AS", "AS", false, null, 4500,
                "email", "website-offer", null
        );

        assertThat(service.reserveSend(request)).isTrue();
        assertThat(service.reserveSend(request)).isFalse();

        OutreachStatusResponse status = service.statusFor("123456789");
        assertThat(status.status()).isEqualTo("sending");
        assertThat(status.sendBlocked()).isTrue();
        assertThat(status.sent()).isFalse();
        assertThat(status.everSent()).isFalse();
    }

    @Test
    void reserveFollowUpRequiresEligibleInitialSendAndAllowsOnlyOneAttempt() throws Exception {
        Path logPath = tempDir.resolve("outreach-log.jsonl");
        Files.writeString(logPath, """
                {"timestamp":"2026-04-15T10:15:30Z","orgNumber":"123456789","companyName":"Test AS","organizationForm":"AS","status":"sent","price":4500,"channel":"email","offerType":"website-offer","note":null}
                """);
        OutreachLogService service = new OutreachLogService(
                logPath,
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );
        OutreachStatusRequest followUp = new OutreachStatusRequest(
                "123456789", "Test AS", "AS", true, "sent", null,
                "email", "website-follow-up", "Oppfølging sendt – avslutt hvis stille"
        );
        assertThat(service.reserveFollowUp(followUp)).isTrue();
        assertThat(service.reserveFollowUp(followUp)).isFalse();
        assertThat(service.statusFor("123456789").status()).isEqualTo("sending");
    }

    @Test
    void reserveFollowUpRejectsOffersOutsideSixToEightBusinessDayWindow() throws Exception {
        Path logPath = tempDir.resolve("outreach-log.jsonl");
        Files.writeString(logPath, """
                {"timestamp":"2026-04-14T10:15:30Z","orgNumber":"111111111","companyName":"Gammel AS","organizationForm":"AS","status":"sent","price":4500,"channel":"email","offerType":"website-offer","note":null}
                {"timestamp":"2026-04-24T10:15:30Z","orgNumber":"222222222","companyName":"Ny AS","organizationForm":"AS","status":"sent","price":4500,"channel":"email","offerType":"website-offer","note":null}
                """);
        OutreachLogService service = new OutreachLogService(
                logPath,
                tempDir,
                tempDir.resolve("archive"),
                Clock.fixed(Instant.parse("2026-04-27T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        assertThat(service.reserveFollowUp(new OutreachStatusRequest(
                "111111111", "Gammel AS", "AS", true, "sent", null,
                "email", "website-follow-up", null
        ))).isFalse();
        assertThat(service.reserveFollowUp(new OutreachStatusRequest(
                "222222222", "Ny AS", "AS", true, "sent", null,
                "email", "website-follow-up", null
        ))).isFalse();
    }

    @Test
    void uncertainDeliveryRemainsBlockedAfterRestart() {
        Path logPath = tempDir.resolve("outreach-log.jsonl");
        Path archivePath = tempDir.resolve("archive");
        Clock clock = Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC);
        OutreachLogService service = new OutreachLogService(
                logPath, tempDir, archivePath, clock, new ObjectMapper()
        );
        OutreachStatusRequest request = new OutreachStatusRequest(
                "123456789", "Test AS", "AS", false, null, 4500,
                "email", "website-offer", null
        );

        assertThat(service.reserveSend(request)).isTrue();
        service.markDeliveryUncertain(request, "SMTP svarte ikke entydig");

        OutreachLogService restartedService = new OutreachLogService(
                logPath, tempDir, archivePath, clock, new ObjectMapper()
        );
        OutreachStatusResponse status = restartedService.statusFor("123456789");
        assertThat(status.status()).isEqualTo("delivery_uncertain");
        assertThat(status.sendBlocked()).isTrue();
        assertThat(status.sent()).isFalse();
        assertThat(status.everSent()).isFalse();
        assertThat(restartedService.reserveSend(request)).isFalse();
    }

    @Test
    void permanentDeliveryFailureRemainsBlockedAfterRestart() {
        Path logPath = tempDir.resolve("outreach-log.jsonl");
        Path archivePath = tempDir.resolve("archive");
        Clock clock = Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC);
        OutreachLogService service = new OutreachLogService(
                logPath, tempDir, archivePath, clock, new ObjectMapper()
        );

        OutreachStatusResponse response = service.register(new OutreachStatusRequest(
                "123456789", "Test AS", "AS", false, "delivery_failed", null,
                "email", "website-offer", "Permanent feillevering: 550 5.1.1 adressen finnes ikke."
        ));

        assertThat(response.status()).isEqualTo("delivery_failed");
        assertThat(response.sendBlocked()).isTrue();
        OutreachLogService restartedService = new OutreachLogService(
                logPath, tempDir, archivePath, clock, new ObjectMapper()
        );
        assertThat(restartedService.statusFor("123456789").sendBlocked()).isTrue();
        assertThat(restartedService.reserveSend(new OutreachStatusRequest(
                "123456789", "Test AS", "AS", false, null, null,
                "email", "website-offer", null
        ))).isFalse();
    }
}
