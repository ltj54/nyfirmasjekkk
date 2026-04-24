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
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

@Service
public class OutreachLogService {
    private static final Logger log = LoggerFactory.getLogger(OutreachLogService.class);
    private static final DateTimeFormatter REPORT_DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter REPORT_TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm", Locale.ROOT);

    private final Path logPath;
    private final Path reportDirectory;
    private final Path archiveDirectory;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    @Autowired
    public OutreachLogService(
            @Value("${company-check.outreach-log-path:./data/outreach-log.jsonl}") String logPath,
            @Value("${company-check.outreach-report-dir:./data}") String reportDirectory,
            @Value("${company-check.outreach-archive-dir:./data/archive}") String archiveDirectory,
            ObjectMapper objectMapper
    ) {
        this(Path.of(logPath), Path.of(reportDirectory), Path.of(archiveDirectory), Clock.systemDefaultZone(), objectMapper);
    }

    OutreachLogService(Path logPath, Path reportDirectory, Path archiveDirectory, Clock clock, ObjectMapper objectMapper) {
        this.logPath = logPath;
        this.reportDirectory = reportDirectory;
        this.archiveDirectory = archiveDirectory;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    public synchronized OutreachStatusResponse statusFor(String orgNumber) {
        List<OutreachLogEntry> entries = readAllEntries();
        OutreachLogEntry latestEntry = entries.stream()
                .filter(entry -> orgNumber.equals(entry.orgNumber()))
                .sorted(Comparator.comparing(this::sortTimestamp))
                .reduce((first, second) -> second)
                .orElse(null);

        if (latestEntry == null || !"sent".equalsIgnoreCase(latestEntry.status())) {
            return new OutreachStatusResponse(orgNumber, false, latestEntry == null ? null : latestEntry.companyName(),
                    latestEntry == null ? null : latestEntry.price(),
                    latestEntry == null ? null : latestEntry.channel(),
                    latestEntry == null ? null : latestEntry.offerType(),
                    null,
                    latestEntry == null ? null : latestEntry.note());
        }

        return new OutreachStatusResponse(
                orgNumber,
                true,
                latestEntry.companyName(),
                latestEntry.price(),
                latestEntry.channel(),
                latestEntry.offerType(),
                latestEntry.timestamp(),
                latestEntry.note()
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
        rotateArchivedEntries();
        refreshMonthlyReportFor(entry.timestamp());
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

    private void refreshMonthlyReportFor(String timestamp) {
        YearMonth month = parseYearMonth(timestamp);
        if (month == null) {
            return;
        }

        List<OutreachLogEntry> monthEntries = readAllEntries().stream()
                .filter(entry -> month.equals(parseYearMonth(entry.timestamp())))
                .sorted(Comparator.comparing(OutreachLogEntry::timestamp))
                .toList();

        if (monthEntries.isEmpty()) {
            return;
        }

        Path reportPath = reportDirectory.resolve("outreach-log-" + month + ".md");
        try {
            Files.createDirectories(reportDirectory);
            Files.writeString(
                    reportPath,
                    buildMonthlyMarkdownReport(month, monthEntries),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke skrive månedlig outreach-rapport", exception);
        }
    }

    private void rotateArchivedEntries() {
        List<OutreachLogEntry> activeEntries = readEntriesFromPath(logPath);
        if (activeEntries.isEmpty()) {
            return;
        }

        YearMonth currentMonth = YearMonth.now(clock);
        Map<YearMonth, List<OutreachLogEntry>> archiveCandidates = activeEntries.stream()
                .filter(entry -> {
                    YearMonth month = parseYearMonth(entry.timestamp());
                    return month != null && !currentMonth.equals(month);
                })
                .collect(java.util.stream.Collectors.groupingBy(
                        entry -> parseYearMonth(entry.timestamp()),
                        LinkedHashMap::new,
                        java.util.stream.Collectors.toList()
                ));

        if (archiveCandidates.isEmpty()) {
            return;
        }

        archiveCandidates.forEach((month, entries) -> {
            writeEntries(archivePathFor(month), entries);
            refreshMonthlyReport(month, entries);
        });

        List<OutreachLogEntry> retainedEntries = activeEntries.stream()
                .filter(entry -> {
                    YearMonth month = parseYearMonth(entry.timestamp());
                    return month == null || currentMonth.equals(month);
                })
                .toList();
        writeEntries(logPath, retainedEntries);
    }

    private List<OutreachLogEntry> readAllEntries() {
        return Stream.concat(
                        readEntriesFromPath(logPath).stream(),
                        readArchiveEntries().stream()
                )
                .filter(Objects::nonNull)
                .toList();
    }

    private List<OutreachLogEntry> readArchiveEntries() {
        if (!Files.isDirectory(archiveDirectory)) {
            return List.of();
        }
        try (Stream<Path> paths = Files.list(archiveDirectory)) {
            return paths
                    .filter(path -> path.getFileName().toString().startsWith("outreach-log-"))
                    .filter(path -> path.getFileName().toString().endsWith(".jsonl"))
                    .sorted()
                    .flatMap(path -> readEntriesFromPath(path).stream())
                    .toList();
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke lese arkiverte outreach-logger", exception);
        }
    }

    private List<OutreachLogEntry> readEntriesFromPath(Path path) {
        if (!Files.exists(path)) {
            return List.of();
        }
        try {
            return Files.readAllLines(path).stream()
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

    private void writeEntries(Path path, List<OutreachLogEntry> entries) {
        try {
            Path parent = path.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            String content = entries.stream()
                    .map(this::serializeEntry)
                    .reduce("", (left, right) -> left + right);
            Files.writeString(
                    path,
                    content,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke skrive outreach-logg", exception);
        }
    }

    private String serializeEntry(OutreachLogEntry entry) {
        try {
            return objectMapper.writeValueAsString(entry) + System.lineSeparator();
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke serialisere outreach-logg", exception);
        }
    }

    private YearMonth parseYearMonth(String timestamp) {
        try {
            return YearMonth.from(Instant.parse(timestamp).atZone(zoneId()));
        } catch (DateTimeParseException exception) {
            log.warn("Klarte ikke tolke timestamp i utsendelseslogg: {}", timestamp);
            return null;
        }
    }

    private Instant sortTimestamp(OutreachLogEntry entry) {
        try {
            return Instant.parse(entry.timestamp());
        } catch (DateTimeParseException exception) {
            return Instant.EPOCH;
        }
    }

    private Path archivePathFor(YearMonth month) {
        return archiveDirectory.resolve("outreach-log-" + month + ".jsonl");
    }

    private void refreshMonthlyReport(YearMonth month, List<OutreachLogEntry> entries) {
        if (entries.isEmpty()) {
            return;
        }

        Path reportPath = reportDirectory.resolve("outreach-log-" + month + ".md");
        try {
            Files.createDirectories(reportDirectory);
            Files.writeString(
                    reportPath,
                    buildMonthlyMarkdownReport(month, entries),
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE
            );
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke skrive månedlig outreach-rapport", exception);
        }
    }

    private String buildMonthlyMarkdownReport(YearMonth month, List<OutreachLogEntry> entries) {
        Map<String, OutreachLogEntry> latestByOrgNumber = new LinkedHashMap<>();
        for (OutreachLogEntry entry : entries) {
            latestByOrgNumber.put(entry.orgNumber(), entry);
        }

        List<OutreachLogEntry> activeCompanies = latestByOrgNumber.values().stream()
                .filter(entry -> "sent".equalsIgnoreCase(entry.status()))
                .sorted(Comparator.comparing(OutreachLogEntry::timestamp).reversed())
                .toList();

        long sentCount = entries.stream().filter(entry -> "sent".equalsIgnoreCase(entry.status())).count();
        long revertedCount = entries.stream().filter(entry -> "reverted".equalsIgnoreCase(entry.status())).count();

        StringBuilder markdown = new StringBuilder();
        markdown.append("# Outreach-logg ").append(month).append(System.lineSeparator()).append(System.lineSeparator());
        markdown.append("Automatisk generert fra `").append(logPath.getFileName()).append("`.").append(System.lineSeparator()).append(System.lineSeparator());
        markdown.append("## Oppsummering").append(System.lineSeparator()).append(System.lineSeparator());
        markdown.append("- Antall hendelser: ").append(entries.size()).append(System.lineSeparator());
        markdown.append("- Sendt: ").append(sentCount).append(System.lineSeparator());
        markdown.append("- Angret: ").append(revertedCount).append(System.lineSeparator());
        markdown.append("- Aktive kontaktede selskaper: ").append(activeCompanies.size()).append(System.lineSeparator()).append(System.lineSeparator());

        markdown.append("## Aktive kontaktede selskaper").append(System.lineSeparator()).append(System.lineSeparator());
        if (activeCompanies.isEmpty()) {
            markdown.append("Ingen aktive utsendelser i denne måneden.").append(System.lineSeparator()).append(System.lineSeparator());
        } else {
            markdown.append("| Dato | Org.nr | Selskap | Kanal | Pris | Tilbud |").append(System.lineSeparator());
            markdown.append("| --- | --- | --- | --- | --- | --- |").append(System.lineSeparator());
            for (OutreachLogEntry entry : activeCompanies) {
                markdown.append("| ")
                        .append(formatDate(entry.timestamp()))
                        .append(" | ")
                        .append(entry.orgNumber())
                        .append(" | ")
                        .append(markdownValue(entry.companyName()))
                        .append(" | ")
                        .append(markdownValue(entry.channel()))
                        .append(" | ")
                        .append(formatPrice(entry.price()))
                        .append(" | ")
                        .append(markdownValue(entry.offerType()))
                        .append(" |")
                        .append(System.lineSeparator());
            }
            markdown.append(System.lineSeparator());
        }

        markdown.append("## Hendelser").append(System.lineSeparator()).append(System.lineSeparator());
        markdown.append("| Tidspunkt | Status | Org.nr | Selskap | Kanal | Pris | Notat |").append(System.lineSeparator());
        markdown.append("| --- | --- | --- | --- | --- | --- | --- |").append(System.lineSeparator());
        for (OutreachLogEntry entry : entries.stream().sorted(Comparator.comparing(OutreachLogEntry::timestamp).reversed()).toList()) {
            markdown.append("| ")
                    .append(formatTimestamp(entry.timestamp()))
                    .append(" | ")
                    .append(markdownValue(entry.status()))
                    .append(" | ")
                    .append(entry.orgNumber())
                    .append(" | ")
                    .append(markdownValue(entry.companyName()))
                    .append(" | ")
                    .append(markdownValue(entry.channel()))
                    .append(" | ")
                    .append(formatPrice(entry.price()))
                    .append(" | ")
                    .append(markdownValue(entry.note()))
                    .append(" |")
                    .append(System.lineSeparator());
        }

        return markdown.toString();
    }

    private String formatDate(String timestamp) {
        try {
            return REPORT_DATE_FORMAT.format(Instant.parse(timestamp).atZone(zoneId()));
        } catch (DateTimeParseException exception) {
            return timestamp;
        }
    }

    private String formatTimestamp(String timestamp) {
        try {
            return REPORT_TIMESTAMP_FORMAT.format(Instant.parse(timestamp).atZone(zoneId()));
        } catch (DateTimeParseException exception) {
            return timestamp;
        }
    }

    private String formatPrice(Integer price) {
        return price == null ? "-" : "kr " + String.format(Locale.ROOT, "%,d", price).replace(',', '.');
    }

    private String markdownValue(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace("|", "\\|").trim();
    }

    private ZoneId zoneId() {
        return clock.getZone();
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
