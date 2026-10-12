package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WebsiteLeadUrlPolicyTests {
    @Test
    void acceptsRealDomainsWithoutNeedingLiveDns() {
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("moskar.no")).isTrue();
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("https://www.merennlyd.no/path")).isTrue();
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("blåbær.no")).isTrue();
    }

    @Test
    void rejectsRegisterPlaceholdersAndSocialProfiles() {
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("FacebookBigImpress")).isFalse();
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("https://www.facebook.com/BigImpress")).isFalse();
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("instagram.com/example")).isFalse();
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("mailto:post@example.no")).isFalse();
        assertThat(WebsiteLeadUrlPolicy.isPlausibleBusinessWebsite("ikke en adresse")).isFalse();
    }
}
