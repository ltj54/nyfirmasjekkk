package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebsiteLeadSuitabilityPolicyTests {
    @Test
    void webAgencyWithProgrammingCodeAndWebsiteServicesIsExcluded() {
        var company = company("DIGITALVERK AS", "AS", "62.100", "digitalverk.com");
        var result = WebsiteLeadSuitabilityPolicy.assess(company, "REACHABLE",
                "Digitalverk – Webutvikling og nettsider", "Vi utvikler nettsider for bedrifter.");
        assertThat(result.status()).isEqualTo("EXCLUDE");
    }

    @Test
    void programmingCodeAloneDoesNotExclude() {
        var company = company("PROGRAMVARE AS", "AS", "62.100", "programvare.no");
        var result = WebsiteLeadSuitabilityPolicy.assess(company, "REACHABLE",
                "Programvare", "Vi lager systemer for lagerstyring.");
        assertThat(result.status()).isEqualTo("REVIEW");
    }

    @Test
    void localChapterAndForeignGroupDomainAreExcludedFromSalesList() {
        var chapter = company("EKSEMPEL NORGE RANA LOKALLAG", "FLI", "94.999", "eksempel.no");
        var group = company("NORSK AVDELING AS", "AS", "71.129", "konsern.nl");
        assertThat(WebsiteLeadSuitabilityPolicy.assess(chapter, "REACHABLE", "Eksempel Norge", "").status())
                .isEqualTo("EXCLUDE");
        assertThat(WebsiteLeadSuitabilityPolicy.assess(group, "REACHABLE", "Konsern", "").status())
                .isEqualTo("EXCLUDE");
    }

    @Test
    void confirmedDomesticFailureRemainsCandidate() {
        var company = company("LOKAL BEDRIFT AS", "AS", "43.210", "lokalbedrift.no");
        assertThat(WebsiteLeadSuitabilityPolicy.assess(company, "CONFIRMED_UNREACHABLE", null, null).status())
                .isEqualTo("CANDIDATE");
    }

    private EnhetResponse company(String name, String form, String industry, String website) {
        EnhetResponse result = mock(EnhetResponse.class);
        when(result.navn()).thenReturn(name);
        when(result.organisasjonsform()).thenReturn(new EnhetResponse.Organisasjonsform(form, form));
        when(result.naeringskode1()).thenReturn(new EnhetResponse.Naeringskode(industry, industry));
        when(result.hjemmeside()).thenReturn(website);
        return result;
    }
}
