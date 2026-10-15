package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OutreachEmailServiceTests {
    private static final String SIGNATURE = """
            Med vennlig hilsen
              Lars Johannessen
              https://www.ltj-production.no/
              977 24 209
              kontakt@ltj-production.no
              Org.nr. 838 632 122
            """.stripTrailing();

    @Test
    void normalizesPlainSignatureOnlyOnce() {
        String body = OutreachEmailService.withSenderSignature("Hei\n\nMed vennlig hilsen\nLars Johannessen\nOrg.nr. 838 632 122");

        assertThat(body).isEqualTo("Hei\n\n" + SIGNATURE);
        assertThat(OutreachEmailService.withSenderSignature(body)).isEqualTo(body);
    }

    @Test
    void addsMatchingHtmlSignatureOnlyWhenMissing() {
        OutreachEmailService service = new OutreachEmailService(null, "", "", "", "");
        OutreachEmailSendRequest request = new OutreachEmailSendRequest(
                "kunde@example.no", "Hei", "Hei", "<div>Hei</div>",
                "Kunde", "AS", null, "email", "website-offer", null, null, null);

        String html = service.htmlOrPlain(request, OutreachEmailService.withSenderSignature(request.body()));
        assertThat(html).contains("&nbsp;&nbsp;Lars Johannessen", "https://www.ltj-production.no/", "Org.nr. 838 632 122");
        OutreachEmailSendRequest alreadySigned = new OutreachEmailSendRequest(
                request.to(), request.subject(), request.body(), html,
                request.companyName(), request.organizationForm(), request.price(), request.channel(),
                request.offerType(), request.evidenceCode(), request.note(), request.batchId());
        assertThat(service.htmlOrPlain(alreadySigned, OutreachEmailService.withSenderSignature(request.body())))
                .isEqualTo(html);
    }

    @Test
    void replacesOldHtmlSignature() {
        OutreachEmailService service = new OutreachEmailService(null, "", "", "", "");
        OutreachEmailSendRequest request = new OutreachEmailSendRequest(
                "kunde@example.no", "Hei", "Hei", "<div><p>Hei</p><p>Med vennlig hilsen<br>Lars Johannessen<br>Org.nr. 838 632 122</p></div>",
                "Kunde", "AS", null, "email", "website-offer", null, null, null);

        String html = service.htmlOrPlain(request, OutreachEmailService.withSenderSignature(request.body()));
        assertThat(html)
                .contains("&nbsp;&nbsp;Lars Johannessen", "https://www.ltj-production.no/")
                .containsOnlyOnce("Org.nr. 838 632 122");
    }
}
