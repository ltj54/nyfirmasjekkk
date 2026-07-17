package io.ltj.nyfirmasjekk.api.v1;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WebsiteCandidateGeneratorTests {

    @Test
    void generatesCompactAndDashedCandidatesWithoutCompanyForm() {
        assertThat(WebsiteCandidateGenerator.generate("Nordlys Design Holding AS"))
                .startsWith("https://nordlysdesign.no", "https://nordlys-design.no");
    }

    @Test
    void returnsNoCandidatesForMissingName() {
        assertThat(WebsiteCandidateGenerator.generate(null)).isEmpty();
        assertThat(WebsiteCandidateGenerator.generate("  ")).isEmpty();
    }
}
