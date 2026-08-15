package io.ltj.nyfirmasjekk.api.v1;

import org.junit.jupiter.api.Test;

import java.net.IDN;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SafeWebTargetPolicyTests {
    @Test
    void normalisererInternasjonaleDomenenavn() {
        var uri = SafeWebTargetPolicy.requireHttpUri("https://følka.no/om-oss", true);

        assertThat(uri.getHost()).isEqualTo(IDN.toASCII("følka.no"));
        assertThat(uri.getPath()).isEqualTo("/om-oss");
    }

    @Test
    void godtarKunOffentligHttpOgHttps() {
        assertThat(SafeWebTargetPolicy.requirePublicHttpUri("https://93.184.216.34/path").getHost())
                .isEqualTo("93.184.216.34");
        assertThatThrownBy(() -> SafeWebTargetPolicy.requirePublicHttpUri("file:///etc/passwd"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SafeWebTargetPolicy.requirePublicHttpUri("https://user:secret@93.184.216.34/"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void blokkererLokalePrivateOgReserverteMal() {
        for (String url : java.util.List.of(
                "http://localhost/",
                "http://127.0.0.1/",
                "http://10.0.0.1/",
                "http://172.16.0.1/",
                "http://192.168.1.1/",
                "http://169.254.169.254/latest/meta-data/",
                "http://[::1]/",
                "http://[fc00::1]/"
        )) {
            assertThatThrownBy(() -> SafeWebTargetPolicy.requirePublicHttpUri(url))
                    .as(url)
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
