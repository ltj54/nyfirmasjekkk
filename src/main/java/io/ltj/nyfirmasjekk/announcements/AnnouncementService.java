package io.ltj.nyfirmasjekk.announcements;

import io.ltj.nyfirmasjekk.api.v1.Announcement;
import io.ltj.nyfirmasjekk.brreg.EnhetResponse;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class AnnouncementService {

    private final BrregAnnouncementsClient brregAnnouncementsClient;

    public AnnouncementService(BrregAnnouncementsClient brregAnnouncementsClient) {
        this.brregAnnouncementsClient = brregAnnouncementsClient;
    }

    public List<Announcement> announcementsFor(EnhetResponse enhet) {
        if (enhet == null) {
            return List.of();
        }

        List<Announcement> announcements = hentKunngjoringerFraBrreg(enhet.organisasjonsnummer());
        if (!announcements.isEmpty()) {
            return announcements;
        }

        return fallbackAnnouncements(enhet);
    }

    List<Announcement> parseAnnouncementsHtml(String html) {
        if (html == null || html.isBlank()) {
            return List.of();
        }

        Document document = Jsoup.parse(html);
        List<Announcement> announcements = new ArrayList<>();

        for (Element link : document.select("a[href*=hent_en.jsp]")) {
            Element row = link.closest("tr");
            if (row == null) {
                continue;
            }

            List<Element> cells = row.select("td");
            if (cells.size() < 4) {
                continue;
            }

            String date = normalizeBlank(cells.get(1).text());
            String title = normalizeBlank(link.text());
            if (title == null) {
                continue;
            }

            announcements.add(new Announcement(
                    classifyAnnouncementType(title),
                    title,
                    date,
                    "BRREG kunngjøringer"
            ));
        }

        return announcements.stream()
                .distinct()
                .sorted(Comparator.comparing(Announcement::date, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Announcement::title, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private List<Announcement> hentKunngjoringerFraBrreg(String organisasjonsnummer) {
        try {
            return parseAnnouncementsHtml(brregAnnouncementsClient.hentKunngjoringerHtml(organisasjonsnummer));
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }

    private List<Announcement> fallbackAnnouncements(EnhetResponse enhet) {
        List<Announcement> announcements = new ArrayList<>();

        if (Boolean.TRUE.equals(enhet.konkurs())) {
            announcements.add(new Announcement(
                    "BANKRUPTCY",
                    "Konkursrelatert signal registrert i åpne data",
                    null,
                    "BRREG"
            ));
        }
        if (Boolean.TRUE.equals(enhet.underTvangsavviklingEllerTvangsopplosning())) {
            announcements.add(new Announcement(
                    "DISSOLUTION",
                    "Tvangsoppløsning eller tvangsavvikling registrert i åpne data",
                    null,
                    "BRREG"
            ));
        }
        if (Boolean.TRUE.equals(enhet.underAvvikling())) {
            announcements.add(new Announcement(
                    "WINDING_UP",
                    "Avvikling registrert i åpne data",
                    null,
                    "BRREG"
            ));
        }

        return announcements.stream()
                .sorted(Comparator.comparing(Announcement::type))
                .toList();
    }

    private String normalizeBlank(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String classifyAnnouncementType(String title) {
        String normalized = title.toLowerCase(Locale.ROOT);

        if (normalized.contains("konkurs")) {
            return "BANKRUPTCY";
        }
        if (normalized.contains("tvangsoppl")) {
            return "DISSOLUTION";
        }
        if (normalized.contains("avvikling")) {
            return "WINDING_UP";
        }
        if (normalized.contains("årsregnskap")) {
            return "ANNUAL_ACCOUNTS";
        }
        if (normalized.contains("nyregistrering")) {
            return "REGISTRATION";
        }
        if (normalized.contains("forretningsadresse")) {
            return "ADDRESS_CHANGE";
        }
        if (normalized.contains("vedtektsdato")) {
            return "ARTICLES_OF_ASSOCIATION";
        }

        return "GENERAL";
    }
}
