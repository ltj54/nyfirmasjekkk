package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.announcements.BrregAnnouncementsClient;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.BrregClientException;
import io.ltj.nyfirmasjekk.brreg.EnhetFinnesIkkeException;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import io.ltj.nyfirmasjekk.brreg.EnheterSearchResponse;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "company-check.outreach-log-path=./build/test-outreach-log.jsonl",
        "company-check.outreach-report-dir=./build/test-outreach-reports",
        "company-check.outreach-archive-dir=./build/test-outreach-archive"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompanyCheckApiIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BrregClient brregClient;

    @MockitoBean
    private BrregAnnouncementsClient announcementsClient;

    @BeforeEach
    void ryddTestOutreachFiler() throws Exception {
        deleteRecursively(Path.of("./build/test-outreach-log.jsonl"));
        deleteRecursively(Path.of("./build/test-outreach-reports"));
        deleteRecursively(Path.of("./build/test-outreach-archive"));
    }

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
    void historyFinnesIkkeIOyeblikksbildeVersjon() throws Exception {
        String orgnr = "123456789";
        mockMvc.perform(get("/api/company-check/" + orgnr + "/history"))
                .andExpect(status().isNotFound());
    }

    @Test
    void networkFinnesIkkeIOyeblikksbildeVersjon() throws Exception {
        String orgnr = "123456789";
        mockMvc.perform(get("/api/company-check/" + orgnr + "/network"))
                .andExpect(status().isNotFound());
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
                .andExpect(jsonPath("$.organizationForms").isArray());
    }

    @Test
    void outreachStatusKanLesesOgOppdateres() throws Exception {
        String orgnr = "123456789";

        mockMvc.perform(get("/api/company-check/" + orgnr + "/outreach-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orgNumber").value(orgnr))
                .andExpect(jsonPath("$.sent").value(false));

        mockMvc.perform(post("/api/company-check/" + orgnr + "/outreach-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "companyName": "Test AS",
                                  "sent": true,
                                  "status": "sent",
                                  "price": 4500,
                                  "channel": "email",
                                  "offerType": "website-offer"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orgNumber").value(orgnr))
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.status").value("sent"))
                .andExpect(jsonPath("$.price").value(4500));

        mockMvc.perform(get("/api/company-check/" + orgnr + "/outreach-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.channel").value("email"));

        mockMvc.perform(get("/api/company-check/outreach"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].orgNumber").value(orgnr))
                .andExpect(jsonPath("$[0].status").value("sent"));

        mockMvc.perform(get("/api/company-check/outreach/export"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"outreach-log-export.jsonl\""))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"orgNumber\":\"" + orgnr + "\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"status\":\"sent\"")));
    }

    @Test
    void outreachLogKanImporteresFraJsonl() throws Exception {
        mockMvc.perform(post("/api/company-check/outreach/import")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("""
                                {"timestamp":"2026-04-20T08:00:00Z","orgNumber":"987654321","companyName":"Import AS","organizationForm":"AS","status":"sent","price":4500,"channel":"email","offerType":"website-offer","note":"Importert"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(1))
                .andExpect(jsonPath("$.skipped").value(0));

        mockMvc.perform(get("/api/company-check/outreach"))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"orgNumber\":\"987654321\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"companyName\":\"Import AS\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"status\":\"sent\"")));
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

    private void deleteRecursively(Path path) throws IOException {
        if (Files.notExists(path)) {
            return;
        }

        try (var paths = Files.walk(path)) {
            paths.sorted(Comparator.reverseOrder())
                    .forEach(file -> {
                        try {
                            Files.deleteIfExists(file);
                        } catch (IOException exception) {
                            throw new UncheckedIOException(exception);
                        }
                    });
        } catch (UncheckedIOException exception) {
            throw exception.getCause();
        }
    }
}
