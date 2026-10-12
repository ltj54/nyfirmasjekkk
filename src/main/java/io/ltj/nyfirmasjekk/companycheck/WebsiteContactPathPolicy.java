package io.ltj.nyfirmasjekk.companycheck;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;

import java.net.URI;
import java.util.Locale;

/** Finds one explicit contact or booking link on the homepage for a conservative availability check. */
final class WebsiteContactPathPolicy {
    private WebsiteContactPathPolicy() {
    }

    static String priorityUrl(String html, String baseUrl) {
        if (html == null || html.isBlank()) return null;
        Document document = Jsoup.parse(html, baseUrl);
        String contactUrl = null;
        for (Element link : document.select("a[href]")) {
            String url = link.attr("abs:href");
            if (!isCheckableUrl(url)) continue;
            String label = (link.text() + " " + link.attr("aria-label") + " "
                    + link.attr("title") + " " + link.attr("href")).toLowerCase(Locale.ROOT);
            if (isBookingLink(label)) return url;
            if (contactUrl == null && isContactLink(label)) contactUrl = url;
        }
        return contactUrl;
    }

    static boolean isConfirmedFailure(String reasonCode, Integer httpStatus) {
        return "HTTP_ERROR".equals(reasonCode) && httpStatus != null
                && (httpStatus == 404 || httpStatus == 410 || httpStatus >= 500);
    }

    private static boolean isCheckableUrl(String value) {
        try {
            URI uri = URI.create(value);
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getFragment() == null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean isBookingLink(String label) {
        return label.contains("booking") || label.contains("timebestilling")
                || label.contains("bestill time") || label.contains("book time")
                || label.contains("book now") || label.contains("appointment");
    }

    private static boolean isContactLink(String label) {
        return label.contains("kontakt") || label.contains("contact");
    }
}
