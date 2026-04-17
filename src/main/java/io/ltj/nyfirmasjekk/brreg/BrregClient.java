package io.ltj.nyfirmasjekk.brreg;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
class BrregClientConfiguration {
    @Bean
    RestClient brregRestClient() {
        return RestClient.builder()
                .baseUrl("https://data.brreg.no/enhetsregisteret/api")
                .defaultHeader("User-Agent", "Nyfirmasjekk-App")
                .build();
    }
}

@Component
public class BrregClient {
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);

    private final RestClient restClient;
    private final ConcurrentHashMap<String, CacheEntry<?>> cache = new ConcurrentHashMap<>();

    public BrregClient(@Qualifier("brregRestClient") RestClient restClient) {
        this.restClient = restClient;
    }

    public EnhetResponse hentEnhet(String organisasjonsnummer) {
        String cacheKey = "enhet:" + organisasjonsnummer;
        var cached = hentFraCache(cacheKey, EnhetResponse.class);
        if (cached != null) {
            return cached;
        }

        try {
            var response = restClient.get()
                    .uri("/enheter/{organisasjonsnummer}", organisasjonsnummer)
                    .retrieve()
                    .body(EnhetResponse.class);
            leggICache(cacheKey, response);
            return response;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                throw new EnhetFinnesIkkeException(organisasjonsnummer);
            }
            throw new BrregClientException("Klarte ikke hente enhet", exception);
        }
    }

    public RollerResponse hentRoller(String organisasjonsnummer) {
        String cacheKey = "roller:" + organisasjonsnummer;
        var cached = hentFraCache(cacheKey, RollerResponse.class);
        if (cached != null) {
            return cached;
        }

        try {
            var response = restClient.get()
                    .uri("/enheter/{organisasjonsnummer}/roller", organisasjonsnummer)
                    .retrieve()
                    .body(RollerResponse.class);
            var resolved = response == null ? new RollerResponse(null) : response;
            leggICache(cacheKey, resolved);
            return resolved;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                var empty = new RollerResponse(null);
                leggICache(cacheKey, empty);
                return empty;
            }
            throw new BrregClientException("Klarte ikke hente roller", exception);
        }
    }

    public EnheterSearchResponse sok(Map<String, String> filter) {
        String cacheKey = "search:" + cacheNokkel(filter);
        var cached = hentFraCache(cacheKey, EnheterSearchResponse.class);
        if (cached != null) {
            return cached;
        }

        try {
            var response = restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path("/enheter");
                        filter.forEach(uriBuilder::queryParam);
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .body(EnheterSearchResponse.class);
            cacheSearchResults(response);
            leggICache(cacheKey, response);
            return response;
        } catch (RestClientResponseException exception) {
            throw new BrregClientException("Søk feilet: " + exception.getResponseBodyAsString(), exception);
        }
    }

    private void cacheSearchResults(EnheterSearchResponse response) {
        if (response == null || response._embedded() == null || response._embedded().enheter() == null) {
            return;
        }

        response._embedded().enheter().stream()
                .filter(enhet -> enhet != null && enhet.organisasjonsnummer() != null && !enhet.organisasjonsnummer().isBlank())
                .forEach(enhet -> leggICache("enhet:" + enhet.organisasjonsnummer(), enhet));
    }

    private String cacheNokkel(Map<String, String> filter) {
        return filter.entrySet().stream()
                .sorted(Map.Entry.comparingByKey(Comparator.naturalOrder()))
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .reduce((left, right) -> left + "&" + right)
                .orElse("empty");
    }

    private <T> T hentFraCache(String key, Class<T> type) {
        var entry = cache.get(key);
        if (entry == null) {
            return null;
        }
        if (entry.erUtlopt()) {
            cache.remove(key);
            return null;
        }
        return type.cast(entry.value());
    }

    private void leggICache(String key, Object value) {
        if (value == null) {
            return;
        }
        cache.put(key, new CacheEntry<>(value, Instant.now().plus(CACHE_TTL)));
    }

    private record CacheEntry<T>(T value, Instant expiresAt) {
        private boolean erUtlopt() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
