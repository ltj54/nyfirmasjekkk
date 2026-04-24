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
                true,
                4500,
                "email",
                "website-offer",
                null
        ));

        assertThat(response.sent()).isTrue();
        assertThat(response.orgNumber()).isEqualTo("123456789");
        assertThat(response.companyName()).isEqualTo("Test AS");
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

        service.register(new OutreachStatusRequest("123456789", "Test AS", true, 4500, "email", "website-offer", null));
        OutreachStatusResponse response = service.register(new OutreachStatusRequest("123456789", "Test AS", false, 4500, "email", "website-offer", null));

        assertThat(response.sent()).isFalse();
        assertThat(response.sentAt()).isNull();
        assertThat(response.note()).isNull();
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

        service.register(new OutreachStatusRequest("123456789", "Test AS", true, 4500, "email", "website-offer", "Ferdig utkast sendt"));

        Path reportPath = tempDir.resolve("outreach-log-2026-04.md");
        assertThat(Files.exists(reportPath)).isTrue();
        String report = Files.readString(reportPath);

        assertThat(report).contains("# Outreach-logg 2026-04");
        assertThat(report).contains("Aktive kontaktede selskaper: 1");
        assertThat(report).contains("Test AS");
        assertThat(report).contains("kr 4.500");
        assertThat(report).contains("Ferdig utkast sendt");
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

        service.register(new OutreachStatusRequest("987654321", "Mai AS", true, 4500, "email", "website-offer", null));

        Path archivePath = tempDir.resolve("archive").resolve("outreach-log-2026-04.jsonl");
        assertThat(Files.exists(archivePath)).isTrue();
        assertThat(Files.readString(logPath)).contains("987654321").doesNotContain("123456789");
        assertThat(Files.readString(archivePath)).contains("123456789");
        assertThat(service.statusFor("123456789").sent()).isTrue();
        assertThat(service.statusFor("987654321").sent()).isTrue();
    }
}
