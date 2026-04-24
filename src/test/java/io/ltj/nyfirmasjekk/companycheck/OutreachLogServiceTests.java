package io.ltj.nyfirmasjekk.companycheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class OutreachLogServiceTests {

    @TempDir
    Path tempDir;

    @Test
    void registerSentStoresAndReturnsSentStatus() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
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
    }

    @Test
    void registerRevertedClearsSentStatus() {
        OutreachLogService service = new OutreachLogService(
                tempDir.resolve("outreach-log.jsonl"),
                Clock.fixed(Instant.parse("2026-04-23T10:15:30Z"), ZoneOffset.UTC),
                new ObjectMapper()
        );

        service.register(new OutreachStatusRequest("123456789", "Test AS", true, 4500, "email", "website-offer", null));
        OutreachStatusResponse response = service.register(new OutreachStatusRequest("123456789", "Test AS", false, 4500, "email", "website-offer", null));

        assertThat(response.sent()).isFalse();
        assertThat(response.sentAt()).isNull();
    }
}
