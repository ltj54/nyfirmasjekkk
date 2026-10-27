package io.ltj.nyfirmasjekk.companycheck;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class WebsiteLeadBatchLogServiceTests {
    @TempDir
    Path temporaryDirectory;

    @Test
    void skriverEgenJsonlLoggMedBatchIdOgStatus() {
        Path logPath = temporaryDirectory.resolve("website-lead-batch-log.jsonl");
        ObjectMapper mapper = new ObjectMapper();
        Clock clock = Clock.fixed(Instant.parse("2026-10-13T10:00:00Z"), ZoneOffset.UTC);
        WebsiteLeadBatchLogService service = new WebsiteLeadBatchLogService(logPath, mapper, clock);

        service.appendBatchEvent("batch-1", "837522102", "MELHUS GAINS DEAL", "support@gainsdeal.app",
                "Planer for gainsdeal.app?", "sending", null);
        service.appendBatchEvent("batch-1", "837522102", "MELHUS GAINS DEAL", "support@gainsdeal.app",
                "Planer for gainsdeal.app?", "sent", null);

        String[] lines = service.exportJsonl().trim().split("\\R");
        assertThat(lines).hasSize(2);
        assertThat(mapper.readTree(lines[0]).get("batchId").asString()).isEqualTo("batch-1");
        assertThat(mapper.readTree(lines[1]).get("status").asString()).isEqualTo("sent");
        assertThat(mapper.readTree(lines[1]).get("timestamp").asString()).isEqualTo("2026-10-13T10:00:00Z");
    }
}
