package io.ltj.nyfirmasjekk.companycheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class WebsiteLeadBatchLogService {
    private final Path logPath;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Autowired
    public WebsiteLeadBatchLogService(
            @Value("${company-check.website-lead-batch-log-path:./data/website-lead-batch-log.jsonl}") String logPath,
            ObjectMapper objectMapper
    ) {
        this(Path.of(logPath), objectMapper, Clock.systemDefaultZone());
    }

    WebsiteLeadBatchLogService(Path logPath, ObjectMapper objectMapper, Clock clock) {
        this.logPath = logPath;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public synchronized void appendBatchEvent(String batchId, String orgNumber, String companyName,
                                    String recipient, String subject, String status, String note) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("timestamp", Instant.now(clock).toString());
        entry.put("batchId", batchId);
        entry.put("orgNumber", orgNumber);
        entry.put("companyName", companyName);
        entry.put("recipient", recipient);
        entry.put("subject", subject);
        entry.put("status", status);
        entry.put("note", note);
        try {
            Path parent = logPath.getParent();
            if (parent != null) Files.createDirectories(parent);
            Files.writeString(logPath, objectMapper.writeValueAsString(entry) + System.lineSeparator(),
                    StandardOpenOption.CREATE, StandardOpenOption.WRITE, StandardOpenOption.APPEND);
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke skrive nettsidelead-batchlogg", exception);
        }
    }

    public synchronized String exportJsonl() {
        try {
            return Files.exists(logPath) ? Files.readString(logPath) : "";
        } catch (IOException exception) {
            throw new IllegalStateException("Klarte ikke lese nettsidelead-batchlogg", exception);
        }
    }
}
