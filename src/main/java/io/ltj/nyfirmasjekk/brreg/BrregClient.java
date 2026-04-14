package io.ltj.nyfirmasjekk.brreg;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import java.time.LocalDate;
import java.util.HashMap;
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

    public BrregClient(RestClient restClient) {
        this.restClient = restClient;
    }

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

    public EnheterSearchResponse sokEtterNyeAS(LocalDate fraDato) {
        Map<String, String> filter = new HashMap<>();
        filter.put("organisasjonsform", "AS");
        filter.put("fraRegistreringsdatoEnhetsregisteret", fraDato.toString());
        filter.put("size", "20");
        return sok(filter);
    }

    public EnheterSearchResponse sok(Map<String, String> filter) {
        try {
            return restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path("/enheter");
                        filter.forEach(uriBuilder::queryParam);
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .body(EnheterSearchResponse.class);
        } catch (RestClientResponseException exception) {
            throw new BrregClientException("Søk feilet: " + exception.getResponseBodyAsString(), exception);
        }
    }
}
