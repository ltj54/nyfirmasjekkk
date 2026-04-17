package io.ltj.nyfirmasjekk.announcements;

import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.Charset;

@Configuration
class BrregAnnouncementsClientConfiguration {
    @Bean
    RestClient brregAnnouncementsRestClient() {
        return RestClient.builder()
                .baseUrl("https://w2.brreg.no/kunngjoring")
                .defaultHeader("User-Agent", "Nyfirmasjekk-App")
                .build();
    }
}

@Component
public class BrregAnnouncementsClient {

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");

    private final RestClient restClient;

    public BrregAnnouncementsClient(@Qualifier("brregAnnouncementsRestClient") RestClient brregAnnouncementsRestClient) {
        this.restClient = brregAnnouncementsRestClient;
    }

    public String hentKunngjoringerHtml(String organisasjonsnummer) {
        try {
            byte[] response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/hent_nr.jsp")
                            .queryParam("orgnr", organisasjonsnummer)
                            .build())
                    .retrieve()
                    .body(byte[].class);
            if (response == null || response.length == 0) {
                return "";
            }
            return new String(response, WINDOWS_1252);
        } catch (RestClientResponseException exception) {
            throw new BrregClientException("Klarte ikke hente kunngjøringer", exception);
        }
    }
}
