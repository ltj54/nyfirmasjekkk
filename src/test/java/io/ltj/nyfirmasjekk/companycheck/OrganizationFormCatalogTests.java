package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrganizationFormCatalogTests {

    @Test
    void normalisererHistoriskeAliasTilKanoniskKode() {
        assertThat(OrganizationFormCatalog.normalizeCode("Aksjeselskap")).isEqualTo("AS");
        assertThat(OrganizationFormCatalog.normalizeCode("Selskap med delt ansvar")).isEqualTo("DA");
        assertThat(OrganizationFormCatalog.normalizeCode("STI")).isEqualTo("STIFT");
        assertThat(OrganizationFormCatalog.normalizeCode("BO")).isEqualTo("KBO");
    }

    @Test
    void byggerKanoniskVisningslabelFraAlias() {
        assertThat(OrganizationFormCatalog.displayLabelForValue("Aksjeselskap")).isEqualTo("AS - Aksjeselskap");
        assertThat(OrganizationFormCatalog.displayLabelForValue("STI")).isEqualTo("STIFT - Stiftelse");
        assertThat(OrganizationFormCatalog.displayLabelForValue("BO")).isEqualTo("KBO - Konkursbo");
    }

    @Test
    void scorerVanligeOrganisasjonsformerEtterRisikosignal() {
        assertThat(OrganizationFormCatalog.scoreAdjustment("ASA")).isEqualTo(2);
        assertThat(OrganizationFormCatalog.scoreAdjustment("AS")).isEqualTo(1);
        assertThat(OrganizationFormCatalog.scoreAdjustment("SA")).isEqualTo(1);
        assertThat(OrganizationFormCatalog.scoreAdjustment("STI")).isEqualTo(2);
        assertThat(OrganizationFormCatalog.scoreAdjustment("ENK")).isEqualTo(-1);
        assertThat(OrganizationFormCatalog.scoreAdjustment("ANS")).isEqualTo(-2);
        assertThat(OrganizationFormCatalog.scoreAdjustment("DA")).isEqualTo(-2);
        assertThat(OrganizationFormCatalog.scoreAdjustment("NUF")).isEqualTo(-3);
        assertThat(OrganizationFormCatalog.scoreAdjustment("UTLA")).isEqualTo(-2);
        assertThat(OrganizationFormCatalog.scoreAdjustment("FIL")).isEqualTo(-2);
    }
}
