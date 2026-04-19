package io.ltj.nyfirmasjekk.companycheck;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class OrganizationFormCatalog {
    private static final List<OrganizationFormDefinition> DEFINITIONS = List.of(
            form("AS", "Aksjeselskap", "Aksjeselskap"),
            form("ASA", "Allmennaksjeselskap", "Allmennaksjeselskap"),
            form("ENK", "Enkeltpersonforetak", "Enkeltpersonforetak"),
            form("ANS", "Ansvarlig selskap", "Ansvarlig selskap"),
            form("DA", "Selskap med delt ansvar", "Delt ansvar", "Selskap med delt ansvar"),
            form("BA", "Selskap med begrenset ansvar", "Selskap med begrenset ansvar (utgått, men finnes historisk)"),
            form("SA", "Samvirkeforetak", "Samvirkeforetak"),
            form("NUF", "Norskregistrert utenlandsk foretak", "Norskregistrert utenlandsk foretak"),
            form("STIFT", "Stiftelse", "Stiftelse", "STI"),
            form("FLI", "Forening/lag/innretning", "Forening/lag/innretning"),
            form("IKS", "Interkommunalt selskap", "Interkommunalt selskap"),
            form("KF", "Kommunalt foretak", "Kommunalt foretak"),
            form("ORG", "Organisasjon (generell)", "Organisasjon (generell)"),
            form("KOMM", "Kommune", "Kommune"),
            form("FYLK", "Fylkeskommune", "Fylkeskommune"),
            form("STAT", "Statlig virksomhet", "Statlig virksomhet"),
            form("SF", "Statsforetak", "Statsforetak"),
            form("SÆR", "Særlovsselskap", "Særlovsselskap"),
            form("BANK", "Bank", "Bank"),
            form("FORS", "Forsikringsselskap", "Forsikringsselskap"),
            form("SPAR", "Sparebank", "Sparebank"),
            form("VERD", "Verdipapirfond", "Verdipapirfond"),
            form("UTLA", "Utenlandsk foretak", "Utenlandsk foretak"),
            form("FIL", "Filial av utenlandsk foretak", "Filial av utenlandsk foretak"),
            form("SAME", "Sameie", "Sameie"),
            form("KBO", "Konkursbo", "Konkursbo", "Konkursbo/dødsbo", "BO"),
            form("KIRK", "Kirkelig organisasjon", "Kirkelig organisasjon"),
            form("PART", "Partirelatert organisasjon", "Partirelatert organisasjon")
    );
    private static final Map<String, Integer> SCORE_ADJUSTMENTS = Map.of(
            "ASA", 2,
            "STIFT", 2,
            "AS", 1,
            "SA", 1,
            "ENK", -1,
            "ANS", -2,
            "DA", -2,
            "NUF", -3,
            "UTLA", -2,
            "FIL", -2
    );

    private static final Map<String, String> TOKEN_TO_CODE = buildTokenToCode();
    private static final Map<String, String> CODE_TO_LABEL = buildCodeToLabel();
    private static final List<String> DISPLAY_LABELS = DEFINITIONS.stream()
            .map(OrganizationFormDefinition::displayLabel)
            .toList();

    private OrganizationFormCatalog() {
    }

    public static List<String> displayLabels() {
        return DISPLAY_LABELS;
    }

    public static String normalizeCode(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }

        int separatorIndex = trimmed.indexOf(" - ");
        if (separatorIndex > 0) {
            String codePart = trimmed.substring(0, separatorIndex).trim();
            String canonicalCode = TOKEN_TO_CODE.get(normalizeToken(codePart));
            if (canonicalCode != null) {
                return canonicalCode;
            }
        }

        String canonicalCode = TOKEN_TO_CODE.get(normalizeToken(trimmed));
        return canonicalCode != null ? canonicalCode : trimmed;
    }

    public static String displayLabelForValue(String value) {
        String normalized = normalizeCode(value);
        if (normalized == null) {
            return null;
        }

        String label = CODE_TO_LABEL.get(normalized);
        if (label == null) {
            return null;
        }

        return normalized + " - " + label;
    }

    public static int scoreAdjustment(String value) {
        String normalized = normalizeCode(value);
        if (normalized == null) {
            return 0;
        }
        return SCORE_ADJUSTMENTS.getOrDefault(normalized, 0);
    }

    private static Map<String, String> buildTokenToCode() {
        Map<String, String> tokens = new HashMap<>();
        for (OrganizationFormDefinition definition : DEFINITIONS) {
            register(tokens, definition.code(), definition.code());
            register(tokens, definition.label(), definition.code());
            for (String alias : definition.aliases()) {
                register(tokens, alias, definition.code());
            }
        }
        return Map.copyOf(tokens);
    }

    private static Map<String, String> buildCodeToLabel() {
        Map<String, String> labels = new HashMap<>();
        for (OrganizationFormDefinition definition : DEFINITIONS) {
            labels.put(definition.code(), definition.label());
        }
        return Map.copyOf(labels);
    }

    private static void register(Map<String, String> tokens, String token, String code) {
        String normalizedToken = normalizeToken(token);
        if (normalizedToken != null) {
            tokens.put(normalizedToken, code);
        }
    }

    private static String normalizeToken(String value) {
        if (value == null) {
            return null;
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "");
        return normalized.isBlank() ? null : normalized;
    }

    private static OrganizationFormDefinition form(String code, String label, String... aliases) {
        return new OrganizationFormDefinition(code, label, List.of(aliases));
    }

    private record OrganizationFormDefinition(String code, String label, List<String> aliases) {
        String displayLabel() {
            return code + " - " + label;
        }
    }
}
