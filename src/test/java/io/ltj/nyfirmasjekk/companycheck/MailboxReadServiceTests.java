package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MailboxReadServiceTests {
    @Test
    void doesNotConnectWithoutConfiguredPassword() {
        MailboxReadService service = new MailboxReadService("mail.ltj-production.no", 993,
                "kontakt@ltj-production.no", "");

        assertThatThrownBy(() -> service.recent(10))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ikke konfigurert");
    }
}
