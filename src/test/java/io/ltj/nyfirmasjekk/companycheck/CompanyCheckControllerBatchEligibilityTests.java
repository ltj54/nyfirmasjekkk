package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.api.v1.CompanyApiV1Mapper;
import io.ltj.nyfirmasjekk.api.v1.WebsiteContentInspectionService;
import io.ltj.nyfirmasjekk.api.v1.WebsiteContentMatch;
import io.ltj.nyfirmasjekk.api.v1.WebsiteInspectionResponse;
import io.ltj.nyfirmasjekk.api.v1.WebsiteQualityAssessment;
import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CompanyCheckControllerBatchEligibilityTests {
    private static final String ORG_NUMBER = "123456789";

    private CompanyApiV1Mapper mapper;
    private BrregClient brregClient;
    private WebsiteContentInspectionService websiteContentInspectionService;
    private CompanyCheckController controller;

    @BeforeEach
    void setUp() {
        mapper = mock(CompanyApiV1Mapper.class);
        brregClient = mock(BrregClient.class);
        websiteContentInspectionService = mock(WebsiteContentInspectionService.class);
        controller = new CompanyCheckController(
                null,
                mapper,
                brregClient,
                null,
                mock(OutreachLogService.class),
                null,
                null,
                mock(InMemoryRateLimitService.class),
                null,
                websiteContentInspectionService
        );
    }

    @Test
    void ukontrollertNavnebasertDomeneforslagErTillatt() {
        when(brregClient.hentEnhet(ORG_NUMBER)).thenReturn(company(null, "kontakt@gmail.com"));

        var result = controller.batchEligibility(ORG_NUMBER);

        assertThat(result.eligible()).isTrue();
        assertThat(result.reason()).isNull();
    }

    @Test
    void epostdomeneSomIkkeSvarerErTillatt() {
        when(brregClient.hentEnhet(ORG_NUMBER)).thenReturn(company(null, "kontakt@testfirma.no"));
        when(websiteContentInspectionService.inspect("https://testfirma.no", "Testfirma AS", null))
                .thenReturn(new WebsiteContentMatch(false, "Domene svarte ikke ved sjekk.", null));

        var result = controller.batchEligibility(ORG_NUMBER);

        assertThat(result.eligible()).isTrue();
    }

    @Test
    void epostdomeneSomSvarerUtenSelskapsmatchErTillatt() {
        when(brregClient.hentEnhet(ORG_NUMBER)).thenReturn(company(null, "kontakt@testfirma.no"));
        when(websiteContentInspectionService.inspect("https://testfirma.no", "Testfirma AS", null))
                .thenReturn(new WebsiteContentMatch(false, "Siden svarte uten tydelig selskapsmatch.", "Forside"));

        var result = controller.batchEligibility(ORG_NUMBER);

        assertThat(result.eligible()).isTrue();
    }

    @Test
    void epostdomeneMedSelskapsmatchBlirSperret() {
        when(brregClient.hentEnhet(ORG_NUMBER)).thenReturn(company(null, "kontakt@testfirma.no"));
        when(websiteContentInspectionService.inspect("https://testfirma.no", "Testfirma AS", null))
                .thenReturn(new WebsiteContentMatch(true, "Innholdet matcher selskapsnavnet.", "Testfirma"));

        var result = controller.batchEligibility(ORG_NUMBER);

        assertThat(result.eligible()).isFalse();
        assertThat(result.reason()).contains("har innhold som matcher virksomhetsnavnet");
    }

    @Test
    void registrertFungerendeNettsideBlirSperret() {
        String website = "https://testfirma.no";
        when(brregClient.hentEnhet(ORG_NUMBER)).thenReturn(company(website, "kontakt@testfirma.no"));
        when(mapper.inspectWebsite(website)).thenReturn(new WebsiteInspectionResponse(
                website,
                website,
                new WebsiteQualityAssessment("OK", "OK", "Nettsiden svarer.", List.of()),
                List.of()
        ));

        var result = controller.batchEligibility(ORG_NUMBER);

        assertThat(result.eligible()).isFalse();
        assertThat(result.reason()).isEqualTo("Registrert nettside svarer: " + website);
    }

    private EnhetResponse company(String website, String email) {
        return new EnhetResponse(
                ORG_NUMBER,
                "Testfirma AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                null,
                List.of(),
                website,
                email,
                null,
                null,
                false,
                false,
                false,
                true,
                true,
                0,
                false,
                null,
                null,
                null,
                null,
                null
        );
    }
}
