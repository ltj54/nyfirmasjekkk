package io.ltj.nyfirmasjekk.companycheck;

import java.net.IDN;
import java.net.URI;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Keeps malformed register values and social profiles out of the broken-website lead cohort. */
final class WebsiteLeadUrlPolicy {
    private static final Pattern HTTP_SCHEME = Pattern.compile("(?i)^https?://.*");
    private static final Pattern HOST_LABEL = Pattern.compile("[a-z0-9](?:[a-z0-9-]*[a-z0-9])?");
    private static final Set<String> SOCIAL_HOSTS = Set.of(
            "facebook.com", "fb.com", "instagram.com", "linkedin.com",
            "tiktok.com", "youtube.com", "youtu.be", "x.com", "twitter.com",
            "linktr.ee"
    );

    private WebsiteLeadUrlPolicy() {
    }

    static boolean isPlausibleBusinessWebsite(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String website = value.trim();
        boolean hasHttpScheme = HTTP_SCHEME.matcher(website).matches();
        if (website.contains("://") && !hasHttpScheme) {
            return false;
        }
        try {
            URI uri = URI.create(hasHttpScheme ? website : "https://" + website);
            if (uri.getUserInfo() != null || uri.getRawAuthority() == null || uri.getRawAuthority().contains("@")) {
                return false;
            }
            String host = extractHost(uri);
            if (host == null) return false;
            String asciiHost = IDN.toASCII(host, IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
            return hasValidHostLabels(asciiHost) && !isSocialHost(asciiHost);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String extractHost(URI uri) {
        if (uri.getHost() != null) return uri.getHost();
        // URI.getHost() does not recognize internationalized domains until converted to ASCII.
        String authority = uri.getRawAuthority();
        return authority.contains(":") ? null : authority;
    }

    private static boolean hasValidHostLabels(String host) {
        String[] labels = host.split("\\.", -1);
        if (labels.length < 2 || labels[labels.length - 1].length() < 2) return false;
        for (String label : labels) {
            if (label.length() > 63 || !HOST_LABEL.matcher(label).matches()) return false;
        }
        return true;
    }

    private static boolean isSocialHost(String host) {
        for (String socialHost : SOCIAL_HOSTS) {
            if (host.equals(socialHost) || host.endsWith("." + socialHost)) return true;
        }
        return false;
    }
}
