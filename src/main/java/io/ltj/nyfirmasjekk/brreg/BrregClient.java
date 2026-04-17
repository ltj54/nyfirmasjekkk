package io.ltj.nyfirmasjekk.brreg;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

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

    private final RestClient restClient;
    private final CacheManager cacheManager;

    public BrregClient(@Qualifier("brregRestClient") RestClient restClient, CacheManager cacheManager) {
        this.restClient = restClient;
        this.cacheManager = cacheManager;
    }

    @Cacheable(value = "enheter", key = "#organisasjonsnummer")
    public EnhetResponse hentEnhet(String organisasjonsnummer) {
        try {
            return restClient.get()
                    .uri("/enheter/{organisasjonsnummer}", organisasjonsnummer)
                    .retrieve()
                    .body(EnhetResponse.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                throw new EnhetFinnesIkkeException(organisasjonsnummer);
            }
            throw new BrregClientException("Klarte ikke hente enhet", exception);
        }
    }

    @Cacheable(value = "roller", key = "#organisasjonsnummer")
    public RollerResponse hentRoller(String organisasjonsnummer) {
        try {
            var response = restClient.get()
                    .uri("/enheter/{organisasjonsnummer}/roller", organisasjonsnummer)
                    .retrieve()
                    .body(RollerResponse.class);
            return response == null ? new RollerResponse(null) : response;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 404) {
                return new RollerResponse(null);
            }
            throw new BrregClientException("Klarte ikke hente roller", exception);
        }
    }

    @Cacheable(value = "search")
    public EnheterSearchResponse sok(Map<String, String> filter) {
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
            return response;
        } catch (RestClientResponseException exception) {
            throw new BrregClientException("Søk feilet: " + exception.getResponseBodyAsString(), exception);
        }
    }

    private void cacheSearchResults(EnheterSearchResponse response) {
        if (response == null || response._embedded() == null || response._embedded().enheter() == null) {
            return;
        }

        var enhetCache = cacheManager.getCache("enheter");
        if (enhetCache == null) {
            return;
        }

        response._embedded().enheter().stream()
                .filter(enhet -> enhet != null && enhet.organisasjonsnummer() != null && !enhet.organisasjonsnummer().isBlank())
                .forEach(enhet -> enhetCache.put(enhet.organisasjonsnummer(), enhet));
    }
}
