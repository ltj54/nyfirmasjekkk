package io.ltj.nyfirmasjekk.api.v1;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

final class WebsiteCandidateGenerator {
    private static final String HTTPS_PREFIX = "https://";
    private static final Set<String> COMPANY_FORM_WORDS = Set.of("as", "enk", "nuf", "sa", "fli", "da", "ans");
    private static final Set<String> TRAILING_QUALIFIERS = Set.of(
            "ny", "drift", "holding", "holdings", "eiendom", "eiendommer", "invest",
            "investment", "investments", "norge", "norway", "group", "gruppen"
    );
    private static final Set<String> SEQUENCE_TOKENS = Set.of(
            "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"
    );
    private static final Map<String, String> COMPOUND_SUFFIX_REPLACEMENTS = Map.of(
            "vedlikeholdsservice", "service",
            "renholdsservice", "service",
            "batservice", "service",
            "byggservice", "service",
            "vaktmesterservice", "service"
    );
    private static final Pattern NON_ALPHANUMERIC_SPACE_PATTERN = Pattern.compile("[^a-z0-9 ]");

    private WebsiteCandidateGenerator() {
    }

    static List<String> generate(String companyName) {
        List<String> normalizedVariants = normalizeCompanyNameVariants(companyName);
        if (normalizedVariants.isEmpty()) {
            return List.of();
        }
        var candidates = new LinkedHashSet<String>();
        normalizedVariants.forEach(variant -> addCandidatesForVariant(candidates, variant, companyName));
        return candidates.stream().limit(5).toList();
    }

    private static void addCandidatesForVariant(
            LinkedHashSet<String> candidates,
            String normalized,
            String companyName
    ) {
        String compact = normalized.replace("-", "");
        if (!hasText(compact) || compact.length() < 4) {
            return;
        }
        candidates.add(HTTPS_PREFIX + normalized + ".no");
        if (!normalized.contains("-")) {
            String dashed = dashedDomainVariant(normalized, companyName);
            if (hasText(dashed) && !dashed.equals(normalized)) {
                candidates.add(HTTPS_PREFIX + dashed + ".no");
            }
        }
        if (shouldSuggestPluralVariant(compact)) {
            candidates.add(HTTPS_PREFIX + compact + "er.no");
        }
        if (compact.endsWith("er")) {
            candidates.add(HTTPS_PREFIX + compact.substring(0, compact.length() - 2) + ".no");
        }
    }

    private static boolean shouldSuggestPluralVariant(String normalized) {
        return !normalized.endsWith("er")
                && !normalized.endsWith("ene")
                && !normalized.endsWith("e")
                && !normalized.endsWith("i")
                && !normalized.endsWith("og")
                && Character.isLetter(normalized.charAt(normalized.length() - 1));
    }

    private static List<String> normalizeCompanyNameVariants(String companyName) {
        List<String> tokens = normalizeCompanyNameTokens(companyName);
        if (tokens.isEmpty()) {
            return List.of();
        }
        var variants = new LinkedHashSet<String>();
        List<String> withoutTrailingNoise = stripTrailingNoiseTokens(tokens);
        if (!withoutTrailingNoise.equals(tokens)) {
            addDomainVariant(variants, withoutTrailingNoise);
            addDomainVariant(variants, removeGlueWords(withoutTrailingNoise));
        }
        if (tokens.size() == 3 && "og".equals(tokens.get(1))) {
            addDomainVariant(variants, tokens);
            addDomainVariant(variants, removeGlueWords(tokens));
        }
        if (tokens.size() > 2) {
            addDomainVariant(variants, tokens.subList(0, 2));
            addDomainVariant(variants, removeGlueWords(tokens.subList(0, 2)));
            addFirstTwoAndLastBusinessWordVariant(variants, tokens);
        }
        addDomainVariant(variants, removeGlueWords(tokens));
        addDomainVariant(variants, tokens);
        addFirstAndLastBusinessWordVariant(variants, tokens);
        return variants.stream().toList();
    }

    private static void addDomainVariant(LinkedHashSet<String> variants, List<String> tokens) {
        String normalized = tokens.stream()
                .filter(part -> !part.isBlank())
                .limit(3)
                .collect(Collectors.joining());
        if (hasText(normalized)) {
            variants.add(normalized);
        }
    }

    private static List<String> removeGlueWords(List<String> tokens) {
        return tokens.stream().filter(token -> !"og".equals(token)).toList();
    }

    private static void addFirstAndLastBusinessWordVariant(
            LinkedHashSet<String> variants,
            List<String> tokens
    ) {
        List<String> businessWords = removeGlueWords(stripTrailingNoiseTokens(tokens));
        if (businessWords.size() < 3) {
            return;
        }
        String first = businessWords.getFirst();
        String last = normalizedSuffix(businessWords.getLast());
        if (hasText(first) && hasText(last) && !first.equals(last)) {
            addDomainVariant(variants, List.of(first, last));
        }
    }

    private static void addFirstTwoAndLastBusinessWordVariant(
            LinkedHashSet<String> variants,
            List<String> tokens
    ) {
        List<String> businessWords = removeGlueWords(stripTrailingNoiseTokens(tokens));
        if (businessWords.size() < 3) {
            return;
        }
        String first = businessWords.get(0);
        String second = businessWords.get(1);
        String last = normalizedSuffix(businessWords.getLast());
        if (hasText(first) && hasText(second) && hasText(last) && !second.equals(last)) {
            addDomainVariant(variants, List.of(first, second, last));
        }
    }

    private static String normalizedSuffix(String value) {
        return COMPOUND_SUFFIX_REPLACEMENTS.getOrDefault(value, value);
    }

    private static List<String> stripTrailingNoiseTokens(List<String> tokens) {
        List<String> stripped = new ArrayList<>(tokens);
        while (stripped.size() > 1 && isDroppableTrailingToken(stripped.getLast())) {
            stripped.removeLast();
        }
        return stripped;
    }

    private static boolean isDroppableTrailingToken(String token) {
        String normalized = token.trim().toLowerCase(Locale.ROOT);
        return normalized.matches("\\d+")
                || SEQUENCE_TOKENS.contains(normalized)
                || TRAILING_QUALIFIERS.contains(normalized);
    }

    private static String dashedDomainVariant(String normalized, String companyName) {
        List<String> tokens = normalizeCompanyNameTokens(companyName);
        List<String> withoutTrailingNoise = stripTrailingNoiseTokens(tokens);
        List<String> selectedTokens = withoutTrailingNoise.isEmpty() ? tokens : withoutTrailingNoise;
        String compact = selectedTokens.stream().limit(3).collect(Collectors.joining());
        if (!compact.equals(normalized) || selectedTokens.size() < 2) {
            return null;
        }
        return selectedTokens.stream().limit(3).collect(Collectors.joining("-"));
    }

    private static List<String> normalizeCompanyNameTokens(String companyName) {
        if (!hasText(companyName)) {
            return List.of();
        }
        String cleaned = companyName
                .toLowerCase(Locale.ROOT)
                .replace('æ', 'a')
                .replace('ø', 'o')
                .replace('å', 'a')
                .replace("&", " og ")
                .replace("+", " og ")
                .transform(value -> NON_ALPHANUMERIC_SPACE_PATTERN.matcher(value).replaceAll(" "));
        return Arrays.stream(cleaned.trim().split("\\s+"))
                .filter(part -> !part.isBlank())
                .filter(part -> !COMPANY_FORM_WORDS.contains(part))
                .toList();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
