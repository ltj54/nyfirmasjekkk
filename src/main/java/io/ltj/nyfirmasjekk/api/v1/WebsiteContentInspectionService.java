package io.ltj.nyfirmasjekk.api.v1;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Service
public class WebsiteContentInspectionService {
    private static final Set<String> COMPANY_FORM_STOP_WORDS = Set.of("as", "enk", "nuf", "sa", "fli", "da", "ans");
    private static final Set<String> TRAILING_QUALIFIERS = Set.of(
            "ny",
            "drift",
            "holding",
            "holdings",
            "eiendom",
            "eiendommer",
            "invest",
            "investment",
            "investments",
            "norge",
            "norway",
            "group",
            "gruppen"
    );
    private static final Set<String> SEQUENCE_TOKENS = Set.of("i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x");

    public WebsiteContentMatch inspect(String url, String companyName, String emailDomain) {
        var snapshot = fetchSnapshot(url);
        if (snapshot == null) {
            return new WebsiteContentMatch(false, "Klarte ikke lese innhold fra nettsiden.", null);
        }

        String normalizedTitle = normalize(snapshot.title());
        String normalizedBody = normalize(snapshot.bodyText());
        String combined = normalizedTitle + " " + normalizedBody;

        if (containsCompanyName(combined, companyName)) {
            return new WebsiteContentMatch(
                    true,
                    "Innholdet på siden ligner på selskapsnavnet.",
                    snapshot.title()
            );
        }

        if (emailDomain != null && !emailDomain.isBlank() && combined.contains(normalize(emailDomain))) {
            return new WebsiteContentMatch(
                    true,
                    "Innholdet på siden inneholder registrert e-postdomene.",
                    snapshot.title()
            );
        }

        return new WebsiteContentMatch(
                false,
                "Nettsiden svarte, men vi fant ingen tydelig kobling til selskapsnavn eller e-postdomene i innholdet.",
                snapshot.title()
        );
    }

    @Cacheable(value = "websiteContent", key = "#url")
    public WebsiteContentSnapshot fetchSnapshot(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        try {
            Document document = Jsoup.connect(url)
                    .userAgent("Nyfirmasjekk-App")
                    .timeout(4000)
                    .followRedirects(true)
                    .get();

            String title = document.title();
            String bodyText = document.body().text();
            if (bodyText.length() > 4000) {
                bodyText = bodyText.substring(0, 4000);
            }

            return new WebsiteContentSnapshot(title, bodyText);
        } catch (IOException | IllegalArgumentException exception) {
            return null;
        }
    }

    private boolean containsCompanyName(String haystack, String companyName) {
        String normalizedCompanyName = normalizeCompanyName(companyName);
        if (normalizedCompanyName.isBlank()) {
            return false;
        }
        String compactHaystack = haystack.replace(" ", "");

        if (haystack.contains(normalizedCompanyName) || compactHaystack.contains(normalizedCompanyName)) {
            return true;
        }

        for (String variant : companyNameVariants(companyName)) {
            if (!variant.isBlank() && (haystack.contains(variant) || compactHaystack.contains(variant))) {
                return true;
            }
        }

        return false;
    }

    private Set<String> companyNameVariants(String companyName) {
        String normalized = normalizeCompanyName(companyName);
        var variants = new LinkedHashSet<String>();
        if (!normalized.isBlank()) {
            variants.add(normalized);
            String withoutTrailingSequence = normalizeCompanyNameWithoutTrailingSequence(companyName);
            if (!withoutTrailingSequence.isBlank()) {
                variants.add(withoutTrailingSequence);
            }
            String withoutGlueWords = normalizeCompanyNameWithoutGlueWords(companyName);
            if (!withoutGlueWords.isBlank()) {
                variants.add(withoutGlueWords);
            }
            if (shouldSuggestPluralVariant(normalized)) {
                variants.add(normalized + "er");
            }
            if (normalized.endsWith("er") && normalized.length() > 4) {
                variants.add(normalized.substring(0, normalized.length() - 2));
            }
        }
        return variants;
    }

    private String normalizeCompanyName(String companyName) {
        return normalizeCompanyNameTokens(companyName).stream()
                .limit(3)
                .reduce("", String::concat);
    }

    private String normalizeCompanyNameWithoutTrailingSequence(String companyName) {
        var tokens = new java.util.ArrayList<>(normalizeCompanyNameTokens(companyName));
        while (tokens.size() > 1 && isDroppableTrailingToken(tokens.getLast())) {
            tokens.removeLast();
        }
        return tokens.stream()
                .limit(3)
                .reduce("", String::concat);
    }

    private String normalizeCompanyNameWithoutGlueWords(String companyName) {
        return normalizeCompanyNameTokens(companyName).stream()
                .filter(token -> !"og".equals(token))
                .limit(3)
                .reduce("", String::concat);
    }

    private boolean shouldSuggestPluralVariant(String normalized) {
        return !normalized.endsWith("er")
                && !normalized.endsWith("ene")
                && !normalized.endsWith("e")
                && !normalized.endsWith("i")
                && Character.isLetter(normalized.charAt(normalized.length() - 1));
    }

    private boolean isSequenceToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        return token.matches("\\d+")
                || SEQUENCE_TOKENS.contains(token);
    }

    private boolean isDroppableTrailingToken(String token) {
        return isSequenceToken(token) || TRAILING_QUALIFIERS.contains(token);
    }

    private java.util.List<String> normalizeCompanyNameTokens(String companyName) {
        return Arrays.stream(normalize(companyName).split("\\s+"))
                .filter(part -> !part.isBlank())
                .filter(part -> !COMPANY_FORM_STOP_WORDS.contains(part))
                .toList();
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.toLowerCase(Locale.ROOT)
                .replace('æ', 'a')
                .replace('ø', 'o')
                .replace('å', 'a')
                .replace("&", " og ")
                .replace("+", " og ")
                .replaceAll("[^a-z0-9@. ]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    public record WebsiteContentSnapshot(String title, String bodyText) {
    }
}
