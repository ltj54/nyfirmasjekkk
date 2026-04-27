package io.ltj.nyfirmasjekk.api.v1;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WebsiteContentInspectionServiceTests {

    @Test
    void innholdsmatchIgnorererRomertallSuffiksIFirmanavn() {
        var service = new StubWebsiteContentInspectionService(
                new WebsiteContentInspectionService.WebsiteContentSnapshot(
                        "Fonnes Båtservice",
                        "Service, opplag og vedlikehold av båter."
                )
        );

        WebsiteContentMatch match = service.inspect(
                "https://fonnesbatservice.no",
                "FONNES BÅTSERVICE II AS",
                null
        );

        assertThat(match.matched()).isTrue();
        assertThat(match.reason()).isEqualTo("Innholdet på siden ligner på selskapsnavnet.");
    }

    @Test
    void innholdsmatchTalerOgOgStruktursuffiks() {
        var service = new StubWebsiteContentInspectionService(
                new WebsiteContentInspectionService.WebsiteContentSnapshot(
                        "ABC Bygg og Olsen Sønn",
                        "ABC Bygg leverer håndverk. Olsen Sønn leverer service."
                )
        );

        WebsiteContentMatch holdingMatch = service.inspect("https://abcbygg.no", "ABC BYGG HOLDING AS", null);
        WebsiteContentMatch ogMatch = service.inspect("https://olsensonn.no", "OLSEN & SØNN AS", null);

        assertThat(holdingMatch.matched()).isTrue();
        assertThat(ogMatch.matched()).isTrue();
    }

    private static final class StubWebsiteContentInspectionService extends WebsiteContentInspectionService {
        private final WebsiteContentSnapshot snapshot;

        private StubWebsiteContentInspectionService(WebsiteContentSnapshot snapshot) {
            this.snapshot = snapshot;
        }

        @Override
        public WebsiteContentSnapshot fetchSnapshot(String url) {
            return snapshot;
        }
    }
}
