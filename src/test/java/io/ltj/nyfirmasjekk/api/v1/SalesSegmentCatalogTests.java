package io.ltj.nyfirmasjekk.api.v1;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalesSegmentCatalogTests {
    @Test
    void klassifisererPrioriterteNaceKoder() {
        assertThat(SalesSegmentCatalog.fromNaceCode("43.341").code()).isEqualTo("HANDVERK");
        assertThat(SalesSegmentCatalog.fromNaceCode("4321").code()).isEqualTo("HANDVERK");
        assertThat(SalesSegmentCatalog.fromNaceCode("43.21").code()).isEqualTo("HANDVERK");
        assertThat(SalesSegmentCatalog.fromNaceCode("43.341").label()).isEqualTo("Bygg og håndverk");
        assertThat(SalesSegmentCatalog.fromNaceCode("81.210").code()).isEqualTo("RENHOLD_OG_DRIFT");
        assertThat(SalesSegmentCatalog.fromNaceCode("96010").code()).isEqualTo("PERSONLIG_TJENESTE");
        assertThat(SalesSegmentCatalog.fromNaceCode("96.020").code()).isEqualTo("PERSONLIG_TJENESTE");
        assertThat(SalesSegmentCatalog.fromNaceCode("70.220").code()).isEqualTo("KONSULENT");
    }

    @Test
    void nedprioritererLiteRelevantePrefixer() {
        assertThat(SalesSegmentCatalog.fromNaceCode("94.991").code()).isEqualTo("FORENING_KLUBB");
        assertThat(SalesSegmentCatalog.fromNaceCode("94.991").score()).isEqualTo(15);
        assertThat(SalesSegmentCatalog.fromNaceCode("01.110").score()).isLessThan(50);
        assertThat(SalesSegmentCatalog.fromNaceCode("85.590").score()).isEqualTo(40);
    }
}
