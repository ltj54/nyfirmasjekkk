package io.ltj.nyfirmasjekk.companycheck;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class InMemoryRateLimitService {
    private final Map<String, ArrayDeque<Instant>> attemptsByKey = new ConcurrentHashMap<>();
    private final Clock clock;

    public InMemoryRateLimitService(Clock clock) {
        this.clock = clock;
    }

    public void requireAllowed(String key, int maxAttempts, Duration window) {
        Instant now = clock.instant();
        ArrayDeque<Instant> attempts = attemptsByKey.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (attempts) {
            Instant cutoff = now.minus(window);
            while (!attempts.isEmpty() && attempts.peekFirst().isBefore(cutoff)) {
                attempts.removeFirst();
            }
            if (attempts.size() >= maxAttempts) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "For mange forespørsler. Prøv igjen senere.");
            }
            attempts.addLast(now);
        }
    }
}
