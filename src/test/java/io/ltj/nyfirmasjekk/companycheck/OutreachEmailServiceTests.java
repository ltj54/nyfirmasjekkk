package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OutreachEmailServiceTests {
    private static final String ORGANIZATION_NUMBER_LINE = "Org.nr. 838 632 122";

    @Test
    void addsOrganizationNumberToPlainBodyOnlyOnce() {
        String body = OutreachEmailService.withSenderOrganizationNumber("Hei\nLars Johannessen");

        assertThat(body).endsWith("Lars Johannessen\n" + ORGANIZATION_NUMBER_LINE);
        assertThat(OutreachEmailService.withSenderOrganizationNumber(body)).isEqualTo(body);
    }

    @Test
    void addsOrganizationNumberToHtmlBodyOnlyWhenMissing() {
        OutreachEmailService service = new OutreachEmailService(null, "", "", "", "");
        OutreachEmailSendRequest request = new OutreachEmailSendRequest(
                "kunde@example.no", "Hei", "Hei", "<div>Hei</div>",
                "Kunde", "AS", null, "email", "website-offer", null, null, null);

        String html = service.htmlOrPlain(request, OutreachEmailService.withSenderOrganizationNumber(request.body()));
        assertThat(html).endsWith("<p>" + ORGANIZATION_NUMBER_LINE + "</p>");
        OutreachEmailSendRequest alreadySigned = new OutreachEmailSendRequest(
                request.to(), request.subject(), request.body(), html,
                request.companyName(), request.organizationForm(), request.price(), request.channel(),
                request.offerType(), request.evidenceCode(), request.note(), request.batchId());
        assertThat(service.htmlOrPlain(alreadySigned, OutreachEmailService.withSenderOrganizationNumber(request.body())))
                .isEqualTo(html);
    }
}
