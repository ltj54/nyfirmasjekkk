package io.ltj.nyfirmasjekk.companycheck;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
public class OutreachLogService {
    private static final Logger log = LoggerFactory.getLogger(OutreachLogService.class);

    private final Path logPath;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    @Autowired
    public OutreachLogService(
            @Value("${company-check.outreach-log-path:./data/outreach-log.jsonl}") String logPath,
            ObjectMapper objectMapper
    ) {
        this(Path.of(logPath), Clock.systemDefaultZone(), objectMapper);
    }

    OutreachLogService(Path logPath, Clock clock, ObjectMapper objectMapper) {
        this.logPath = logPath;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    public synchronized OutreachStatusResponse statusFor(String orgNumber) {
        List<OutreachLogEntry> entries = readEntries();
        OutreachLogEntry latestEntry = entries.stream()
                .filter(entry -> orgNumber.equals(entry.orgNumber()))
                .reduce((first, second) -> second)
                .orElse(null);

        if (latestEntry == null || !"sent".equalsIgnoreCase(latestEntry.status())) {
            return new OutreachStatusResponse(orgNumber, false, latestEntry == null ? null : latestEntry.companyName(),
                    latestEntry == null ? null : latestEntry.price(),
                    latestEntry == null ? null : latestEntry.channel(),
                    latestEntry == null ? null : latestEntry.offerType(),
                    null);
        }

        return new OutreachStatusResponse(
                orgNumber,
                true,
                latestEntry.companyName(),
                latestEntry.price(),
                latestEntry.channel(),
                latestEntry.offerType(),
                latestEntry.timestamp()
        );
    }

    public synchronized OutreachStatusResponse register(OutreachStatusRequest request) {
        validateRequest(request);
        OutreachLogEntry entry = new OutreachLogEntry(
                Instant.now(clock).toString(),
                request.orgNumber(),
                blankToNull(request.companyName()),
                request.sent() ? "sent" : "reverted",
                request.price() == null ? 4500 : request.price(),
                blankToNull(request.channel()) == null ? "email" : request.channel().trim(),
                blankToNull(request.offerType()) == null ? "website-offer" : request.offerType().trim(),
                blankToNull(request.note())
        );
        appendEntry(entry);
        return statusFor(request.orgNumber());
    }

    private void validateRequest(OutreachStatusRequest request) {
        if (request == null || request.orgNumber() == null || !request.orgNumber().matches("\\d{9}")) {
            throw new IllegalArgumentException("Organisasjonsnummer må være ni siffer");
        }
    }

    private void appendEntry(OutreachLogEntry entry) {
        try {
            Path parent = logPath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            String line = objectMapper.writeValueAsString(entry) + System.lineSeparator();
            Files.writeString(
                    logPath,
                    line,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.WRITE,
                    StandardOpenOption.APPEND
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke skrive utsendelseslogg", exception);
        }
    }

    private List<OutreachLogEntry> readEntries() {
        if (!Files.exists(logPath)) {
            return List.of();
        }
        try {
            return Files.readAllLines(logPath).stream()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty())
                    .map(this::parseEntry)
                    .filter(Objects::nonNull)
                    .toList();
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke lese utsendelseslogg", exception);
        }
    }

    private OutreachLogEntry parseEntry(String line) {
        try {
            return objectMapper.readValue(line, OutreachLogEntry.class);
        } catch (IOException exception) {
            log.warn("Ignorerer ugyldig linje i utsendelseslogg: {}", line);
            return null;
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record OutreachLogEntry(
            String timestamp,
            String orgNumber,
            String companyName,
            String status,
            Integer price,
            String channel,
            String offerType,
            String note
    ) {
    }
}
