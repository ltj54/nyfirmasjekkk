package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.EnhetResponse;

import java.net.URI;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Conservative, explainable screening for the registered-website lead list. */
final class WebsiteLeadSuitabilityPolicy {
    private static final Set<String> FOREIGN_COUNTRY_DOMAINS = Set.of(
            "nl", "de", "se", "dk", "fi", "fr", "be", "ch", "at", "pl", "es", "it", "uk"
    );
    private static final String EXCLUDE = "EXCLUDE";
    private static final Pattern WEBSITE_PROVIDER_TERMS = Pattern.compile(
            "webutvikling|webdesign|nettsidedesign|website design|web development",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern WEBSITE_PROVIDER_NORWEGIAN = Pattern.compile(
            "(?:lager|bygger|utvikler|designer|leverer)\\s+(?:[\\p{L}]+\\s+){0,3}(?:nettsider|websider|webapplikasjoner)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );
    private static final Pattern WEBSITE_PROVIDER_ENGLISH = Pattern.compile(
            "(?:build|develop|design)\\s+(?:[a-z]+\\s+){0,3}websites?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
    );

    private WebsiteLeadSuitabilityPolicy() {
    }

    static Assessment assess(EnhetResponse company, String status, String title, String body) {
        String name = company.navn() == null ? "" : company.navn();
        String form = company.organisasjonsform() == null ? "" : company.organisasjonsform().kode();
        String industry = company.naeringskode1() == null ? "" : company.naeringskode1().kode();
        String content = ((title == null ? "" : title) + " " + (body == null ? "" : body));

        if ("FLI".equalsIgnoreCase(form) && name.toLowerCase(Locale.ROOT).matches(".*\\b(lokallag|fylkeslag)\\b.*")) {
            return new Assessment(EXCLUDE, "Lokallag/fylkeslag: avklar om hovedorganisasjonen eier nettsiden.");
        }
        if (isForeignCountryDomain(company.hjemmeside())) {
            return new Assessment(EXCLUDE, "Registrert utenlandsk landdomene: kan være et etablert konsernnettsted.");
        }
        if ("REACHABLE".equals(status) && (industry.startsWith("62.") || industry.startsWith("73.11"))
                && (WEBSITE_PROVIDER_TERMS.matcher(content).find()
                || WEBSITE_PROVIDER_NORWEGIAN.matcher(content).find()
                || WEBSITE_PROVIDER_ENGLISH.matcher(content).find())) {
            return new Assessment(EXCLUDE, "Nettsiden tilbyr selv web-/nettsideutvikling.");
        }
        if ("CONFIRMED_CONTACT_PATH_BROKEN".equals(status)) {
            return new Assessment("CANDIDATE", "Kontakt- eller bookinglenke svarte med feil ved to adskilte sjekker; kontroller manuelt.");
        }
        if ("CONFIRMED_UNREACHABLE".equals(status)) {
            return new Assessment("CANDIDATE", "Registrert URL svarte ikke ved to adskilte sjekker; kontroller manuelt.");
        }
        return new Assessment("REVIEW", "Fungerende eller uavklart nettside: konkret forbedringsbehov må bekreftes manuelt.");
    }

    private static boolean isForeignCountryDomain(String website) {
        if (website == null || website.isBlank()) return false;
        try {
            URI uri = URI.create(website.matches("(?i)^https?://.*") ? website : "https://" + website);
            String host = uri.getHost();
            if (host == null) return false;
            int lastDot = host.lastIndexOf('.');
            return lastDot >= 0 && FOREIGN_COUNTRY_DOMAINS.contains(host.substring(lastDot + 1).toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }

    record Assessment(String status, String reason) {
    }
}
