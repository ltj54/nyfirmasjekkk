package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.announcements.BrregAnnouncementsClient;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetFinnesIkkeException;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.EnheterSearchResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompanyCheckApiIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BrregClient brregClient;

    @MockBean
    private BrregAnnouncementsClient announcementsClient;

    @Test
    void hentDetaljerReturnerer200() throws Exception {
        String orgnr = "123456789";
        when(brregClient.hentEnhet(orgnr)).thenReturn(stubEnhet(orgnr));
        when(brregClient.hentRoller(orgnr)).thenReturn(new RollerResponse(List.of()));

        mockMvc.perform(get("/api/company-check/" + orgnr))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.orgNumber").value(orgnr))
                .andExpect(jsonPath("$.name").value("Test AS"))
                .andExpect(jsonPath("$.events").isArray())
                .andExpect(jsonPath("$.events[0].type").exists())
                .andExpect(jsonPath("$.structureSignals").isArray())
                .andExpect(jsonPath("$.score.evidence").isArray())
                .andExpect(jsonPath("$.score.evidence[0].label").exists());
    }

    @Test
    void hentDetaljerMedUgyldigOrgnrReturnerer400() throws Exception {
        mockMvc.perform(get("/api/company-check/123"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void hentDetaljerSomIkkeFinnesReturnerer404() throws Exception {
        when(brregClient.hentEnhet(anyString())).thenThrow(new EnhetFinnesIkkeException("Fant ikke enhet"));

        mockMvc.perform(get("/api/company-check/999888777"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title").value("Virksomhet ikke funnet"));
    }

    @Test
    void hentDetaljerMedBrregFeilReturnerer502() throws Exception {
        when(brregClient.hentEnhet(anyString())).thenThrow(new BrregClientException("Brreg nede", null));

        mockMvc.perform(get("/api/company-check/123456789"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.title").value("Feil mot BRREG"));
    }

    @Test
    void sokReturnererObjekt() throws Exception {
        String orgnr = "123456789";
        when(brregClient.sok(any())).thenReturn(new EnheterSearchResponse(
                new EnheterSearchResponse.Embedded(List.of(stubEnhet(orgnr))),
                new EnheterSearchResponse.Page(1, 1, 1, 0)
        ));
        when(brregClient.hentEnhet(orgnr)).thenReturn(stubEnhet(orgnr));

        mockMvc.perform(get("/api/company-check/search?navn=Test"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].orgNumber").value(orgnr))
                .andExpect(jsonPath("$.items[0].events").isArray())
                .andExpect(jsonPath("$.items[0].events[0].type").value("REGISTRATION"))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void historyReturnerer200() throws Exception {
        String orgnr = "123456789";
        mockMvc.perform(get("/api/company-check/" + orgnr + "/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void networkReturnerer200() throws Exception {
        String orgnr = "123456789";
        mockMvc.perform(get("/api/company-check/" + orgnr + "/network"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void eventsReturnerer200() throws Exception {
        String orgnr = "123456789";
        when(brregClient.hentEnhet(orgnr)).thenReturn(stubEnhet(orgnr));
        when(announcementsClient.hentKunngjoringerHtml(orgnr)).thenReturn("");

        mockMvc.perform(get("/api/company-check/" + orgnr + "/events"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].type").value("REGISTRATION"))
                .andExpect(jsonPath("$[0].severity").value("INFO"));
    }

    @Test
    void filtersReturnerer200() throws Exception {
        mockMvc.perform(get("/api/company-check/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.counties").isArray());
    }

    private EnhetResponse stubEnhet(String orgnr) {
        return new EnhetResponse(
                orgnr,
                "Test AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                null,
                List.of(),
                null,
                null,
                null,
                null,
                false,
                false,
                false,
                false,
                false,
                null,
                false,
                null,
                LocalDate.now(),
                LocalDate.now(),
                null,
                null
        );
    }
}
