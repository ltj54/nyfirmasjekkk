package io.ltj.nyfirmasjekk.api.v1;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;

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
    private final Function<String, WebsiteContentSnapshot> snapshotFetcher;

    public WebsiteContentInspectionService() {
        this.snapshotFetcher = this::fetchSnapshot;
    }

    public WebsiteContentMatch inspect(String url, String companyName, String emailDomain) {
        var snapshot = snapshotFetcher.apply(url);
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

    public WebsiteContentSnapshot fetchSnapshot(String url) {
        return WebsiteContentSnapshotFetcher.fetch(url, false);
    }

    public WebsiteContentSnapshot fetchExtendedSnapshot(String url) {
        return WebsiteContentSnapshotFetcher.fetch(url, true);
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

    public record WebsiteContentSnapshot(
            String title,
            String bodyText,
            String html,
            String metaDescription,
            String viewport,
            String language,
            String h1,
            boolean openGraphTitle,
            boolean openGraphDescription,
            boolean structuredData,
            boolean navigation,
            int linkCount,
            int headingCount,
            int h1Count,
            String generator,
            String detectedBuilder,
            int imageCount,
            int imagesWithoutAlt,
            int formControlCount,
            int unlabeledFormControlCount,
            int emptyButtonCount,
            boolean fixedWidthLayoutSignal,
            boolean mixedContentSignal,
            boolean privacyLink,
            boolean cookieOrTrackingSignal,
            boolean cookieConsentSignal,
            int externalScriptCount,
            int externalIframeCount,
            boolean mainLandmark,
            boolean headerLandmark,
            boolean footerLandmark,
            int skippedHeadingLevelCount,
            int vagueLinkTextCount,
            int tableCount,
            int dataTablesWithoutHeadersCount,
            int inputsWithoutAutocompleteCount,
            int wrongEmailInputTypeCount,
            int wrongPhoneInputTypeCount,
            boolean outlineNoneSignal,
            boolean autoplayMediaSignal,
            boolean motionWithoutReducedMotionSignal,
            int videoCount,
            int iframeWithoutTitleCount,
            int placeholderImageCount,
            boolean ctaMismatchSignal,
            int statusCode,
            String finalUrl,
            boolean hstsHeader,
            boolean contentSecurityPolicyHeader,
            boolean contentTypeOptionsHeader,
            boolean referrerPolicyHeader,
            boolean permissionsPolicyHeader,
            boolean frameOptionsHeader,
            boolean insecureFormActionSignal,
            int passwordFieldsWithoutAutocompleteCount,
            boolean googleAnalyticsSignal,
            boolean metaPixelSignal,
            boolean hotjarSignal,
            boolean claritySignal,
            boolean mapsEmbedSignal,
            boolean youtubeEmbedSignal,
            boolean thirdPartyFormSignal,
            boolean ecommerceSignal,
            boolean termsLink,
            boolean returnInfo,
            boolean deliveryInfo,
            boolean cartOrCheckoutSignal,
            boolean platformDomainSignal,
            int placeholderSocialLinkCount,
            boolean cloudflareEmailProtectionSignal,
            boolean loadingOverlaySignal,
            boolean visibleDiscountCodeSignal,
            boolean paymentLogoSignal,
            boolean paymentTrustInfoSignal,
            boolean newsletterFormSignal,
            int insecureCookieCount,
            int cookieWithoutHttpOnlyCount,
            int cookieWithoutSameSiteCount,
            boolean adminOrLoginPathSignal,
            boolean loginFormSignal,
            boolean fileUploadSignal,
            int apiEndpointReferenceCount,
            boolean exposedCmsVersionSignal,
            boolean httpRedirectsToHttps,
            boolean tlsCertificateValid,
            Integer tlsCertificateDaysRemaining,
            boolean weakHstsHeaderSignal,
            boolean weakContentSecurityPolicySignal,
            boolean serverTechnologyHeaderSignal,
            boolean securityTxtSignal,
            boolean robotsSensitivePathSignal,
            boolean spfRecord,
            boolean dkimRecord,
            boolean dmarcRecord,
            boolean spfSoftfailSignal,
            boolean dmarcPolicyNoneSignal,
            int checkedInternalLinkCount,
            int brokenInternalLinkCount,
            int crawledPageCount,
            boolean crawlPrivacyPageFound,
            boolean crawlContactPageFound,
            boolean crawlAboutPageFound,
            boolean crawlTermsPageFound,
            int crawledFormPageCount,
            int crawledPrivacyTextPageCount,
            int repeatedMetaDescriptionCount,
            boolean crawlFaqPageFound,
            boolean crawlPricingSignal,
            boolean crawlDataHandlingPageFound,
            String accessibilityDeclarationUrl,
            Integer accessibilityViolationCount,
            Integer accessibilityRequirementCount
    ) {
        public WebsiteContentSnapshot(
                String title,
                String bodyText,
                String html,
                String metaDescription,
                String viewport,
                String language,
                String h1
        ) {
            this(title, bodyText, html, metaDescription, viewport, language, h1,
                    false, false, false, false,
                    0, hasTextValue(h1) ? 1 : 0, hasTextValue(h1) ? 1 : 0,
                    null, null,
                    0, 0, 0, 0, 0,
                    false, false, false, false, false,
                    0, 0,
                    false, false, false,
                    0, 0, 0, 0, 0, 0, 0,
                    false, false, false,
                    0, 0, 0, false,
                    0, null,
                    false, false, false, false, false, false,
                    false, 0,
                    false, false, false, false, false, false, false,
                    false, false, false, false, false, false,
                    0,
                    false, false, false, false, false, false,
                    0, 0, 0,
                    false, false, false, 0, false, false, false, null,
                    false, false, false, false, false, false, false, false, false, false,
                    0, 0,
                    0, false, false, false, false, 0, 0, 0, false, false, false,
                    null, null, null);
        }

        public WebsiteContentSnapshot(String title, String bodyText) {
            this(title, bodyText, "", null, null, null, null);
        }

        private static boolean hasTextValue(String value) {
            return value != null && !value.isBlank();
        }
    }
}
