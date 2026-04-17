package io.ltj.nyfirmasjekk.announcements;

import io.ltj.nyfirmasjekk.api.v1.Announcement;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnnouncementServiceTests {

    private final AnnouncementService service = new AnnouncementService(new BrregAnnouncementsClient(null) {
        @Override
        public String hentKunngjoringerHtml(String organisasjonsnummer) {
            return "";
        }
    });

    @Test
    void returnsEmptyListWhenNoOpenAnnouncementsArePresent() {
        var enhet = new EnhetResponse(
                "123456789",
                "Trygg AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                null,
                List.of(),
                null,
                null,
                null,
                null,
                false,
                false,
                false,
                true,
                true,
                null,
                false,
                null,
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2023, 12, 1),
                null,
                null
        );

        assertThat(service.announcementsFor(enhet)).isEmpty();
    }

    @Test
    void returnsNormalizedAnnouncementsForSeriousBrregSignals() {
        var enhet = new EnhetResponse(
                "987654321",
                "Varsel AS",
                new EnhetResponse.Organisasjonsform("AS", "Aksjeselskap"),
                null,
                List.of(),
                null,
                null,
                null,
                null,
                true,
                true,
                true,
                true,
                true,
                null,
                false,
                null,
                LocalDate.of(2024, 1, 1),
                LocalDate.of(2023, 12, 1),
                null,
                null
        );

        assertThat(service.announcementsFor(enhet))
                .extracting(Announcement::type)
                .containsExactly("BANKRUPTCY", "DISSOLUTION", "WINDING_UP");
    }

    @Test
    void parsesAnnouncementRowsFromBrregHtml() {
        String html = """
                <html><body>
                <table>
                  <tr bgcolor="#ffffff">
                    <td><p>&nbsp;</p></td>
                    <td nowrap="true"><p>20.06.2025</p></td>
                    <td><p>&nbsp;</p></td>
                    <td nowrap="true"><p><a href="hent_en.jsp?kid=1">Tvangsoppløsning</a></p></td>
                    <td><p>&nbsp;</p></td>
                  </tr>
                  <tr bgcolor="#ffffff">
                    <td><p>&nbsp;</p></td>
                    <td nowrap="true"><p>05.09.2023</p></td>
                    <td><p>&nbsp;</p></td>
                    <td nowrap="true"><p><a href="hent_en.jsp?kid=2">Godkjente årsregnskap</a></p></td>
                    <td><p>&nbsp;</p></td>
                  </tr>
                </table>
                </body></html>
                """;

        assertThat(service.parseAnnouncementsHtml(html))
                .extracting(Announcement::type, Announcement::title, Announcement::date)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("DISSOLUTION", "Tvangsoppløsning", "20.06.2025"),
                        org.assertj.core.groups.Tuple.tuple("ANNUAL_ACCOUNTS", "Godkjente årsregnskap", "05.09.2023")
                );
    }
}
