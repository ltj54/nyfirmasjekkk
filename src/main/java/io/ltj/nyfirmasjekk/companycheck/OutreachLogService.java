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
            return new OutreachStatusResponse(orgNumber, false, latestEntry == null ? null : latestEntry.status(), latestEntry == null ? null : latestEntry.companyName(),
                    latestEntry == null ? null : latestEntry.organizationForm(),
                    latestEntry == null ? null : latestEntry.price(),
                    latestEntry == null ? null : latestEntry.channel(),
                    latestEntry == null ? null : latestEntry.offerType(),
                    null,
                    latestEntry == null ? null : latestEntry.note());
        }

        return new OutreachStatusResponse(
                orgNumber,
                true,
                latestEntry.status(),
                latestEntry.companyName(),
                latestEntry.organizationForm(),
                latestEntry.price(),
                latestEntry.channel(),
                latestEntry.offerType(),
                latestEntry.timestamp(),
                latestEntry.note()
        );
    }

    public synchronized List<OutreachStatusResponse> statuses() {
        Map<String, OutreachLogEntry> latestByOrgNumber = new LinkedHashMap<>();
        readAllEntries().stream()
                .filter(entry -> "sent".equalsIgnoreCase(entry.status()))
                .sorted(Comparator.comparing(this::sortTimestamp))
                .forEach(entry -> latestByOrgNumber.put(entry.orgNumber(), entry));

        return latestByOrgNumber.values().stream()
                .sorted(Comparator.comparing(this::sortTimestamp).reversed())
                .map(this::toStatusResponse)
                .toList();
    }

    public synchronized String exportJsonl() {
        StringBuilder export = new StringBuilder();
        readAllEntries().stream()
                .sorted(Comparator.comparing(this::sortTimestamp))
                .map(this::serializeEntry)
                .forEach(export::append);
        return export.toString();
    }

    public synchronized OutreachImportResponse importJsonl(String jsonl) {
        List<OutreachLogEntry> importedEntries = parseImportedEntries(jsonl);
        if (importedEntries.isEmpty()) {
            return new OutreachImportResponse(0, 0, readAllEntries().size());
        }

        Map<String, OutreachLogEntry> existingByKey = readAllEntries().stream()
                .collect(java.util.stream.Collectors.toMap(
                        this::entryKey,
                        entry -> entry,
                        (first, second) -> second,
                        LinkedHashMap::new
                ));

        List<OutreachLogEntry> newEntries = importedEntries.stream()
                .filter(entry -> !existingByKey.containsKey(entryKey(entry)))
                .collect(java.util.stream.Collectors.toMap(
                        this::entryKey,
                        entry -> entry,
                        (first, second) -> second,
                        LinkedHashMap::new
                ))
                .values()
                .stream()
                .toList();

        if (!newEntries.isEmpty()) {
            List<OutreachLogEntry> activeEntries = Stream.concat(
                            readEntriesFromPath(logPath).stream(),
                            newEntries.stream()
                    )
                    .sorted(Comparator.comparing(this::sortTimestamp))
                    .toList();
            writeEntries(logPath, activeEntries);
            rotateArchivedEntries();

            newEntries.stream()
                    .map(entry -> parseYearMonth(entry.timestamp()))
                    .filter(Objects::nonNull)
                    .distinct()
                    .forEach(month -> refreshMonthlyReport(month, readEntriesForMonth(month)));
        }

        return new OutreachImportResponse(
                newEntries.size(),
                importedEntries.size() - newEntries.size(),
                readAllEntries().size()
        );
    }

    public synchronized OutreachStatusResponse register(OutreachStatusRequest request) {
        validateRequest(request);
        OutreachLogEntry entry = new OutreachLogEntry(
                Instant.now(clock).toString(),
                request.orgNumber(),
                blankToNull(request.companyName()),
                blankToNull(request.organizationForm()),
                normalizeStatus(request),
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

    private OutreachStatusResponse toStatusResponse(OutreachLogEntry entry) {
        boolean sent = "sent".equalsIgnoreCase(entry.status());
        return new OutreachStatusResponse(
                entry.orgNumber(),
                sent,
                entry.status(),
                entry.companyName(),
                entry.organizationForm(),
                entry.price(),
                entry.channel(),
                entry.offerType(),
                sent ? entry.timestamp() : null,
                entry.note()
        );
    }

    private void validateRequest(OutreachStatusRequest request) {
        if (request == null || request.orgNumber() == null || !request.orgNumber().matches("\\d{9}")) {
            throw new IllegalArgumentException("Organisasjonsnummer må være ni siffer");
        }
    }

    private String normalizeStatus(OutreachStatusRequest request) {
        String requestedStatus = blankToNull(request.status());
        if (requestedStatus == null) {
            return request.sent() ? "sent" : "reverted";
        }
        return switch (requestedStatus.toLowerCase(Locale.ROOT)) {
            case "sent" -> "sent";
            case "reverted" -> "reverted";
            case "not_relevant" -> "not_relevant";
            default -> throw new IllegalArgumentException("Ugyldig outreach-status");
        };
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
                .map(entry -> new MonthlyOutreachLogEntry(parseYearMonth(entry.timestamp()), entry))
                .filter(entry -> entry.month() != null && !currentMonth.equals(entry.month()))
                .collect(java.util.stream.Collectors.groupingBy(
                        MonthlyOutreachLogEntry::month,
                        LinkedHashMap::new,
                        java.util.stream.Collectors.mapping(
                                MonthlyOutreachLogEntry::entry,
                                java.util.stream.Collectors.toList()
                        )
                ));

        if (archiveCandidates.isEmpty()) {
            return;
        }

        archiveCandidates.forEach((month, entries) -> {
            List<OutreachLogEntry> mergedArchiveEntries = Stream.concat(
                            readEntriesFromPath(archivePathFor(month)).stream(),
                            entries.stream()
                    )
                    .collect(java.util.stream.Collectors.toMap(
                            this::entryKey,
                            entry -> entry,
                            (first, second) -> second,
                            LinkedHashMap::new
                    ))
                    .values()
                    .stream()
                    .sorted(Comparator.comparing(this::sortTimestamp))
                    .toList();
            writeEntries(archivePathFor(month), mergedArchiveEntries);
            refreshMonthlyReport(month, mergedArchiveEntries);
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

    private List<OutreachLogEntry> readEntriesForMonth(YearMonth month) {
        return readAllEntries().stream()
                .filter(entry -> month.equals(parseYearMonth(entry.timestamp())))
                .sorted(Comparator.comparing(this::sortTimestamp))
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

    private List<OutreachLogEntry> parseImportedEntries(String jsonl) {
        if (jsonl == null || jsonl.isBlank()) {
            return List.of();
        }

        return jsonl.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .map(this::parseImportedEntry)
                .toList();
    }

    private OutreachLogEntry parseImportedEntry(String line) {
        try {
            OutreachLogEntry entry = objectMapper.readValue(line, OutreachLogEntry.class);
            validateImportedEntry(entry);
            return entry;
        } catch (IOException exception) {
            throw new IllegalArgumentException("Importfilen inneholder ugyldig JSONL", exception);
        }
    }

    private void validateImportedEntry(OutreachLogEntry entry) {
        if (entry == null || entry.orgNumber() == null || !entry.orgNumber().matches("\\d{9}")) {
            throw new IllegalArgumentException("Importfilen inneholder ugyldig organisasjonsnummer");
        }
        if (blankToNull(entry.status()) == null) {
            throw new IllegalArgumentException("Importfilen mangler status");
        }
        validateImportedStatus(entry.status());
        try {
            Instant.parse(entry.timestamp());
        } catch (DateTimeParseException | NullPointerException exception) {
            throw new IllegalArgumentException("Importfilen inneholder ugyldig tidspunkt", exception);
        }
    }

    private void validateImportedStatus(String status) {
        switch (status.trim().toLowerCase(Locale.ROOT)) {
            case "sent", "reverted", "not_relevant" -> {
            }
            default -> throw new IllegalArgumentException("Importfilen inneholder ugyldig status");
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

    private String entryKey(OutreachLogEntry entry) {
        return String.join("|",
                entry.timestamp() == null ? "" : entry.timestamp(),
                entry.orgNumber() == null ? "" : entry.orgNumber(),
                entry.status() == null ? "" : entry.status(),
                entry.companyName() == null ? "" : entry.companyName(),
                entry.organizationForm() == null ? "" : entry.organizationForm(),
                entry.price() == null ? "" : entry.price().toString(),
                entry.channel() == null ? "" : entry.channel(),
                entry.offerType() == null ? "" : entry.offerType(),
                entry.note() == null ? "" : entry.note()
        );
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
            markdown.append("| Dato | Org.nr | Selskap | Selskapsform | Kanal | Pris | Tilbud |").append(System.lineSeparator());
            markdown.append("| --- | --- | --- | --- | --- | --- | --- |").append(System.lineSeparator());
            for (OutreachLogEntry entry : activeCompanies) {
                markdown.append("| ")
                        .append(formatDate(entry.timestamp()))
                        .append(" | ")
                        .append(entry.orgNumber())
                        .append(" | ")
                        .append(markdownValue(entry.companyName()))
                        .append(" | ")
                        .append(markdownValue(entry.organizationForm()))
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
        markdown.append("| Tidspunkt | Status | Org.nr | Selskap | Selskapsform | Kanal | Pris | Notat |").append(System.lineSeparator());
        markdown.append("| --- | --- | --- | --- | --- | --- | --- | --- |").append(System.lineSeparator());
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
                    .append(markdownValue(entry.organizationForm()))
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
            String organizationForm,
            String status,
            Integer price,
            String channel,
            String offerType,
            String note
    ) {
    }

    private record MonthlyOutreachLogEntry(YearMonth month, OutreachLogEntry entry) {
    }
}
