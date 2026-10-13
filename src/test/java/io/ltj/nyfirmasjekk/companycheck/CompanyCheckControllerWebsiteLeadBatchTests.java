package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.BrregClient;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CompanyCheckControllerWebsiteLeadBatchTests {
    private static final String ORG_NUMBER = "837522102";

    @Test
    void senderIkkeNarNettsidenSvarer() {
        BrregClient brreg = mock(BrregClient.class);
        OutreachEmailService email = mock(OutreachEmailService.class);
        OutreachLogService outreach = mock(OutreachLogService.class);
        WebsiteAvailabilityService availability = mock(WebsiteAvailabilityService.class);
        CompanyCheckController controller = new CompanyCheckController(
                null, null, brreg, null, outreach, email,
                new CompanyCheckControllerInfrastructure(mock(AdminAccessService.class), null, null, null, availability,
                        mock(WebsiteLeadBatchLogService.class)));
        when(brreg.hentEnhet(ORG_NUMBER)).thenReturn(company());
        when(outreach.statusFor(ORG_NUMBER)).thenReturn(new OutreachStatusResponse(
                ORG_NUMBER, false, null, null, null, null, null, null, null, null, null, false, false));
        when(availability.check(ORG_NUMBER)).thenReturn(new WebsiteAvailabilityResponse(
                ORG_NUMBER, "gainsdeal.app", "REACHABLE", "OK", 200,
                Instant.now(), Instant.now(), null, "REVIEW", "Nettsiden svarer", null));

        OutreachEmailSendRequest sendRequest = request();
        assertThatThrownBy(() -> controller.sendOutreachEmail(ORG_NUMBER, sendRequest, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("ikke bekreftet utilgjengelig");
        verify(email, never()).send(any());
    }

    private OutreachEmailSendRequest request() {
        return new OutreachEmailSendRequest("support@gainsdeal.app", "Et spørsmål", "Hei",
                null, "MELHUS GAINS DEAL", "ENK", null, "email", "website-lead-batch",
                null, null, UUID.randomUUID().toString());
    }

    private EnhetResponse company() {
        return new EnhetResponse(ORG_NUMBER, "MELHUS GAINS DEAL",
                new EnhetResponse.Organisasjonsform("ENK", "Enkeltpersonforetak"), null, List.of(),
                "gainsdeal.app", "support@gainsdeal.app", null, null, false, false, false,
                false, false, 0, false, null, LocalDate.now().minusMonths(8), null, null, null);
    }
}
