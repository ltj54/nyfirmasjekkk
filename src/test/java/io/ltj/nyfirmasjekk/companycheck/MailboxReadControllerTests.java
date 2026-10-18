package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class MailboxReadControllerTests {
    private final MailboxReadService mailbox = mock(MailboxReadService.class);
    private final MockHttpServletRequest localRequest = new MockHttpServletRequest();

    @Test
    void rejectsAccessWhenTokenIsNotConfigured() {
        MailboxReadController controller = new MailboxReadController(mailbox, "");
        localRequest.setRemoteAddr("127.0.0.1");

        assertThatThrownBy(() -> controller.recent(10, null, localRequest))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
        verifyNoInteractions(mailbox);
    }

    @Test
    void rejectsRemoteAccessEvenWithValidToken() {
        MailboxReadController controller = new MailboxReadController(mailbox, "test-token");
        localRequest.setRemoteAddr("192.0.2.10");

        assertThatThrownBy(() -> controller.recent(10, "test-token", localRequest))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(mailbox);
    }

    @Test
    void rejectsWrongTokenWithoutReadingMailbox() {
        MailboxReadController controller = new MailboxReadController(mailbox, "test-token");
        localRequest.setRemoteAddr("127.0.0.1");

        assertThatThrownBy(() -> controller.recent(10, "wrong", localRequest))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN));
        verifyNoInteractions(mailbox);
    }

    @Test
    void allowsExplicitLocalReadWithMatchingToken() throws Exception {
        MailboxReadController controller = new MailboxReadController(mailbox, "test-token");
        localRequest.setRemoteAddr("127.0.0.1");
        when(mailbox.recent(10)).thenReturn(List.of());

        assertThat(controller.recent(10, "test-token", localRequest).getBody()).isEmpty();
    }
}
