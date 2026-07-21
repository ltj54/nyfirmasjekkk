package io.ltj.nyfirmasjekk.api.v1;

import org.jsoup.Jsoup;
import org.jsoup.Connection;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.security.cert.X509Certificate;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.naming.NamingException;
import javax.naming.directory.InitialDirContext;
import javax.net.ssl.HttpsURLConnection;

@Component
public class WebsiteContentSnapshotFetcher {
    private static final int EXTENDED_CRAWL_LIMIT = 6;
    private static final int EXTENDED_CRAWL_TIMEOUT_MS = 900;
    private static final int EXTENDED_CRAWL_BYTES = 12_000;
    private static final int EXTENDED_CRAWL_TEXT_BYTES = 16_000;
    private static final String SELECTOR_FORM_CONTROLS = "input:not([type=hidden]), textarea, select";
    private static final String SELECTOR_EXTERNAL_SCRIPTS = "script[src^=http]";
    private static final String SELECTOR_URL_ATTRIBUTES = "[href], [src], form[action]";
    private static final String SELECTOR_LINKS = "a[href]";
    private static final String HEADER_USER_AGENT = "User-Agent";
    private static final String USER_AGENT_VALUE = "Nyfirmasjekk-App";
    private static final String ATTRIBUTE_ARIA_LABEL = "aria-label";
    private static final String ATTRIBUTE_PLACEHOLDER = "placeholder";
    private static final String ATTRIBUTE_ACTION = "action";
    private static final String ATTRIBUTE_CONTENT = "content";
    private static final String HTTPS_PREFIX = "https://";
    private static final String TERM_PRIVACY = "privacy";
    private static final String TERM_PERSONVERN = "personvern";
    private static final String TERM_POLICY = "policy";
    private static final String TERM_RETUR = "retur";
    private static final String TERM_VILLKOR = "villkor";
    private static final String TERM_VILKAR = "vilkår";
    private static final Pattern ACCESSIBILITY_VIOLATION_PATTERN = Pattern.compile("brudd\\s+p[åa]\\s+(\\d+)\\s+av\\s+(\\d+)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final java.util.List<Pattern> FIXED_WIDTH_LAYOUT_PATTERNS = java.util.List.of(
            Pattern.compile("\\b(?:width|min-width)\\s*+:\\s*+9\\d{2}px", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\b(?:width|min-width)\\s*+:\\s*+[1-9]\\d{3,}+px", Pattern.CASE_INSENSITIVE)
    );
    private static final Pattern OUTLINE_NONE_PATTERN = Pattern.compile("outline\\s*:\\s*(?:0|none)", Pattern.CASE_INSENSITIVE);
    private static final Pattern CSP_WILDCARD_SCRIPT_PATTERN = Pattern.compile("(?:^|;)\\s*+script-src[^;*]*+\\*", Pattern.CASE_INSENSITIVE);
    private static final java.util.List<Pattern> CMS_VERSION_PATTERNS = java.util.List.of(
            Pattern.compile("wordpress\\s+\\d+\\.\\d", Pattern.CASE_INSENSITIVE),
            Pattern.compile("wp-(?:includes|content)/[^?\\s]++\\?ver=\\d+\\.\\d", Pattern.CASE_INSENSITIVE),
            Pattern.compile("joomla!?(?:\\s+\\d+\\.\\d)?", Pattern.CASE_INSENSITIVE),
            Pattern.compile("drupal\\s+\\d+\\.\\d", Pattern.CASE_INSENSITIVE)
    );
    private static final java.util.List<Pattern> OUTDATED_JAVASCRIPT_PATTERNS = java.util.List.of(
            Pattern.compile("jquery[-.][12]\\.\\d\\D", Pattern.CASE_INSENSITIVE),
            Pattern.compile("bootstrap[-.]3\\.\\d\\D", Pattern.CASE_INSENSITIVE),
            Pattern.compile("angular(?:\\.min)?\\.js\\?ver=1\\.[0-7]", Pattern.CASE_INSENSITIVE),
            Pattern.compile("angular[-.]1\\.[0-7]\\D", Pattern.CASE_INSENSITIVE)
    );
    private static final java.util.List<String> STANDARD_REVIEW_PATHS = java.util.List.of(
            "/kontakt",
            "/contact",
            "/om-oss",
            "/about",
            "/personvern",
            "/privacy",
            "/cookies",
            "/vilkar",
            "/vilkår",
            "/terms",
            "/tjenester",
            "/services",
            "/menneskene",
            "/team",
            "/referanser",
            "/referanse",
            "/references",
            "/case",
            "/prosjekter",
            "/faq",
            "/pris",
            "/pricing",
            "/arbeidshelsesjekken",
            "/arbeidshelseradaren"
    );
    static WebsiteContentInspectionService.WebsiteContentSnapshot fetch(String url, boolean extended) {
        if (url == null || url.isBlank()) {
            return null;
        }

        try {
            Connection.Response response = Jsoup.connect(url)
                    .userAgent(USER_AGENT_VALUE)
                    .timeout(4000)
                    .followRedirects(true)
                    .execute();
            Document document = response.parse();

            String title = document.title();
            String bodyText = document.body().text();
            if (bodyText.length() > 4000) {
                bodyText = bodyText.substring(0, 4000);
            }
            Element description = document.selectFirst("meta[name=description]");
            Element viewport = document.selectFirst("meta[name=viewport]");
            Element html = document.selectFirst("html");
            Element h1 = document.selectFirst("h1");
            boolean openGraphTitle = document.selectFirst("meta[property=og:title], meta[name=twitter:title]") != null;
            boolean openGraphDescription = document.selectFirst("meta[property=og:description], meta[name=twitter:description]") != null;
            boolean structuredData = document.selectFirst("script[type=application/ld+json]") != null;
            int linkCount = document.select("a[href]:not([href^=#]):not([href^=mailto:]):not([href^=tel:]):not([href^=javascript:])").size();
            int headingCount = document.select("h1, h2, h3").size();
            int h1Count = document.select("h1").size();
            boolean navigation = document.selectFirst("nav, header a[href], [role=navigation], .nav, .navbar, .menu") != null;
            String generator = attrOrNull(document.selectFirst("meta[name=generator]"), ATTRIBUTE_CONTENT);
            String htmlSnapshot = document.outerHtml();
            String detectedBuilder = detectBuilder(generator, htmlSnapshot);
            int imageCount = document.select("img").size();
            int imagesWithoutAlt = document.select("img:not([alt]), img[alt=\"\"]").size();
            int formControlCount = document.select(SELECTOR_FORM_CONTROLS).size();
            int unlabeledFormControlCount = document.select("input:not([type=hidden]):not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby])")
                    .stream()
                    .filter(element -> {
                        String id = element.id();
                        return id.isBlank() || document.selectFirst("label[for=\"" + id + "\"]") == null;
                    })
                    .toList()
                    .size();
            int emptyButtonCount = document.select("button, a[role=button]").stream()
                    .filter(element -> element.text().isBlank() && attrOrNull(element, ATTRIBUTE_ARIA_LABEL) == null)
                    .toList()
                    .size();
            boolean fixedWidthLayoutSignal = FIXED_WIDTH_LAYOUT_PATTERNS.stream()
                    .anyMatch(pattern -> pattern.matcher(htmlSnapshot).find());
            boolean mixedContentSignal = !document.select("[src^=http://], [href^=http://]").isEmpty();
            boolean privacyLink = !document.select("a[href*=personvern], a[href*=privacy], a[href*=gdpr], a[href*=datenschutz]").isEmpty()
                    || bodyText.toLowerCase().contains(TERM_PERSONVERN)
                    || bodyText.toLowerCase().contains(TERM_PRIVACY);
            boolean cookieOrTrackingSignal = hasCookieOrTrackingSignal(htmlSnapshot);
            boolean cookieConsentSignal = hasCookieConsentSignal(htmlSnapshot);
            int externalScriptCount = document.select(SELECTOR_EXTERNAL_SCRIPTS).size();
            int externalIframeCount = document.select("iframe[src^=http]").size();
            boolean mainLandmark = document.selectFirst("main, [role=main]") != null;
            boolean headerLandmark = document.selectFirst("header, [role=banner]") != null;
            boolean footerLandmark = document.selectFirst("footer, [role=contentinfo], #footer, .footer, [class*=footer], [id*=footer]") != null
                    || hasFooterContentSignal(document, bodyText);
            int skippedHeadingLevelCount = skippedHeadingLevelCount(document);
            int vagueLinkTextCount = vagueLinkTextCount(document);
            int tableCount = document.select("table").size();
            int dataTablesWithoutHeadersCount = dataTablesWithoutHeadersCount(document);
            int inputsWithoutAutocompleteCount = inputsWithoutAutocompleteCount(document);
            int wrongEmailInputTypeCount = wrongInputTypeCount(document, "email", "epost", "e-post");
            int wrongPhoneInputTypeCount = wrongInputTypeCount(document, "tel", "telefon", "phone", "mobil");
            boolean outlineNoneSignal = OUTLINE_NONE_PATTERN.matcher(htmlSnapshot).find();
            boolean autoplayMediaSignal = document.selectFirst("video[autoplay], audio[autoplay], iframe[src*=autoplay=1]") != null;
            boolean motionWithoutReducedMotionSignal = hasMotionSignalWithoutReducedMotion(htmlSnapshot);
            int videoCount = document.select("video").size();
            int iframeWithoutTitleCount = document.select("iframe:not([title]), iframe[title=\"\"]").size();
            int placeholderImageCount = placeholderImageCount(document);
            boolean ctaMismatchSignal = ctaMismatchSignal(document);
            Map<String, String> headers = response.headers();
            boolean hstsHeader = hasHeader(headers, "strict-transport-security");
            boolean contentSecurityPolicyHeader = hasHeader(headers, "content-security-policy");
            boolean contentTypeOptionsHeader = hasHeader(headers, "x-content-type-options");
            boolean referrerPolicyHeader = hasHeader(headers, "referrer-policy");
            boolean permissionsPolicyHeader = hasHeader(headers, "permissions-policy");
            boolean frameOptionsHeader = hasHeader(headers, "x-frame-options");
            boolean weakHstsHeaderSignal = weakHstsHeaderSignal(headerValue(headers, "strict-transport-security"));
            boolean weakContentSecurityPolicySignal = weakContentSecurityPolicySignal(headerValue(headers, "content-security-policy"));
            boolean serverTechnologyHeaderSignal = hasHeader(headers, "server") || hasHeader(headers, "x-powered-by");
            boolean insecureFormActionSignal = document.selectFirst("form[action^=http://]") != null;
            int passwordFieldsWithoutAutocompleteCount = document.select("input[type=password]:not([autocomplete])").size();
            boolean googleAnalyticsSignal = hasAny(htmlSnapshot, "google-analytics", "googletagmanager", "gtag(");
            boolean metaPixelSignal = hasAny(htmlSnapshot, "fbq(", "connect.facebook.net", "facebook.com/tr");
            boolean hotjarSignal = hasAny(htmlSnapshot, "hotjar");
            boolean claritySignal = hasAny(htmlSnapshot, "clarity.ms");
            boolean mapsEmbedSignal = hasAny(htmlSnapshot, "google.com/maps", "maps.googleapis.com", "openstreetmap", "mapbox");
            boolean youtubeEmbedSignal = hasAny(htmlSnapshot, "youtube.com/embed", "youtu.be", "youtube-nocookie.com", "vimeo.com");
            boolean thirdPartyFormSignal = hasAny(htmlSnapshot, "typeform.com", "jotform", "hubspot", "mailchimp", "calendly", "forms.gle");
            boolean ecommerceSignal = hasEcommerceSignal(document, htmlSnapshot);
            boolean termsLink = hasLinkOrText(document, bodyText, "vilkar", TERM_VILKAR, TERM_VILLKOR, "terms", TERM_POLICY, "salgsbetingelser", "kjopsvilkar", "kjøpsvilkår", "kopvillkor", "köpvillkor", "allmanna villkor", "allmänna villkor");
            boolean returnInfo = hasLinkOrText(document, bodyText, TERM_RETUR, "angrerett", "angerratt", "ångerrätt", "reklamasjon", "reklamation", "return", "refund", "aterbetalning", "återbetalning", "byte");
            boolean deliveryInfo = hasLinkOrText(document, bodyText, "frakt", "levering", "leverans", "shipping", "delivery");
            boolean cartOrCheckoutSignal = hasCartOrCheckoutSignal(document, htmlSnapshot);
            boolean platformDomainSignal = hasPlatformDomainSignal(response.url().toString());
            int placeholderSocialLinkCount = placeholderSocialLinkCount(document);
            boolean cloudflareEmailProtectionSignal = hasAny(htmlSnapshot, "/cdn-cgi/l/email-protection", "data-cfemail");
            boolean loadingOverlaySignal = hasAny(htmlSnapshot, "ett ögonblick", "ett ogonblick", "loading icon", "please wait", "laddar", "loader");
            boolean visibleDiscountCodeSignal = hasAny(htmlSnapshot, "discount=", "coupon=", "rabattkode", "rabattkod", "promo code");
            boolean paymentLogoSignal = hasAny(htmlSnapshot, "visa", "mastercard", "apple pay", "klarna", "vipps");
            boolean paymentTrustInfoSignal = hasAny(bodyText + " " + htmlSnapshot, "sikker betaling", "trygg betaling", "secure payment", "ssl", "kryptert", "säker betalning", "saker betalning", "safe checkout");
            boolean newsletterFormSignal = hasAny(bodyText + " " + htmlSnapshot, "newsletter", "nyhetsbrev", "prenumerera", "subscribe");
            int insecureCookieCount = insecureCookieCount(headers, response.url().getProtocol());
            int cookieWithoutHttpOnlyCount = cookieWithoutAttributeCount(headers, "httponly");
            int cookieWithoutSameSiteCount = cookieWithoutAttributeCount(headers, "samesite");
            boolean adminOrLoginPathSignal = hasAdminOrLoginPathSignal(document, htmlSnapshot);
            boolean loginFormSignal = document.selectFirst("input[type=password], form[action*=login], form[action*=signin], form[action*=wp-login]") != null;
            boolean fileUploadSignal = document.selectFirst("input[type=file]") != null;
            int apiEndpointReferenceCount = apiEndpointReferenceCount(document, htmlSnapshot);
            boolean exposedCmsVersionSignal = hasExposedCmsVersionSignal(generator, htmlSnapshot);
            boolean sourceMapReferenceSignal = hasAny(htmlSnapshot, ".js.map", ".css.map", "sourceMappingURL=");
            boolean developmentReferenceSignal = hasDevelopmentReferenceSignal(document, htmlSnapshot);
            int targetBlankWithoutNoopenerCount = targetBlankWithoutNoopenerCount(document);
            boolean personalDataGetFormSignal = personalDataGetFormSignal(document);
            boolean externalFormActionSignal = externalFormActionSignal(document, response.url().toString());
            boolean sensitiveDataFormSignal = sensitiveDataFormSignal(document);
            boolean noIndexSignal = document.selectFirst("meta[name=robots][content*=noindex], meta[name=googlebot][content*=noindex]") != null;
            boolean sitemapSignal = hasSitemap(response.url().toString());
            int inlineEventHandlerCount = inlineEventHandlerCount(document);
            int javascriptHrefCount = document.select("a[href^=javascript:]").size();
            boolean domXssSinkSignal = hasDomXssSinkSignal(htmlSnapshot);
            boolean clientUrlInputSignal = hasClientUrlInputSignal(htmlSnapshot);
            int externalScriptsWithoutIntegrityCount = externalScriptsWithoutIntegrityCount(document);
            int thirdPartyScriptHostCount = thirdPartyScriptHostCount(document, response.url().toString());
            int inlineScriptCount = inlineScriptCount(document);
            int postFormsWithoutCsrfTokenCount = postFormsWithoutCsrfTokenCount(document);
            boolean outdatedJavascriptLibrarySignal = hasOutdatedJavascriptLibrarySignal(htmlSnapshot);
            DnsSecurityResult dnsSecurityResult = dnsSecurityResult(response.url().getHost());
            TlsCertificateResult tlsCertificateResult = tlsCertificateResult(response.url().toString());
            boolean httpRedirectsToHttps = httpRedirectsToHttps(response.url().getHost());
            boolean securityTxtSignal = hasSecurityTxt(response.url().toString());
            boolean robotsSensitivePathSignal = robotsSensitivePathSignal(response.url().toString());
            LinkCheckResult linkCheckResult = checkInternalLinks(document, response.url().toString());
            ExtendedCrawlResult crawlResult = extendedCrawl(document, response.url().toString());
            boolean healthPlatformSignal = hasAny(htmlSnapshot + " " + crawlResult.bodyText(),
                    "pasientsky.no", "helseboka.no", "helsenorge.no", "conveniens.no", "pridok.no", "visitlege.no");
            String accessibilityDeclarationUrl = accessibilityDeclarationUrl(document, response.url().toString());
            AccessibilityDeclarationResult accessibilityDeclarationResult = extended
                    ? accessibilityDeclarationResult(accessibilityDeclarationUrl)
                    : new AccessibilityDeclarationResult(null, null);

            return new WebsiteContentInspectionService.WebsiteContentSnapshot(
                    title,
                    bodyText,
                    crawlResult.bodyText(),
                    document.outerHtml(),
                    attrOrNull(description, ATTRIBUTE_CONTENT),
                    attrOrNull(viewport, ATTRIBUTE_CONTENT),
                    attrOrNull(html, "lang"),
                    textOrNull(h1),
                    openGraphTitle,
                    openGraphDescription,
                    structuredData,
                    navigation,
                    linkCount,
                    headingCount,
                    h1Count,
                    generator,
                    detectedBuilder,
                    imageCount,
                    imagesWithoutAlt,
                    formControlCount,
                    unlabeledFormControlCount,
                    emptyButtonCount,
                    fixedWidthLayoutSignal,
                    mixedContentSignal,
                    privacyLink,
                    cookieOrTrackingSignal,
                    cookieConsentSignal,
                    externalScriptCount,
                    externalIframeCount,
                    mainLandmark,
                    headerLandmark,
                    footerLandmark,
                    skippedHeadingLevelCount,
                    vagueLinkTextCount,
                    tableCount,
                    dataTablesWithoutHeadersCount,
                    inputsWithoutAutocompleteCount,
                    wrongEmailInputTypeCount,
                    wrongPhoneInputTypeCount,
                    outlineNoneSignal,
                    autoplayMediaSignal,
                    motionWithoutReducedMotionSignal,
                    videoCount,
                    iframeWithoutTitleCount,
                    placeholderImageCount,
                    ctaMismatchSignal,
                    response.statusCode(),
                    response.url().toString(),
                    hstsHeader,
                    contentSecurityPolicyHeader,
                    contentTypeOptionsHeader,
                    referrerPolicyHeader,
                    permissionsPolicyHeader,
                    frameOptionsHeader,
                    insecureFormActionSignal,
                    passwordFieldsWithoutAutocompleteCount,
                    googleAnalyticsSignal,
                    metaPixelSignal,
                    hotjarSignal,
                    claritySignal,
                    mapsEmbedSignal,
                    youtubeEmbedSignal,
                    thirdPartyFormSignal,
                    ecommerceSignal,
                    termsLink,
                    returnInfo,
                    deliveryInfo,
                    cartOrCheckoutSignal,
                    platformDomainSignal,
                    placeholderSocialLinkCount,
                    cloudflareEmailProtectionSignal,
                    loadingOverlaySignal,
                    visibleDiscountCodeSignal,
                    paymentLogoSignal,
                    paymentTrustInfoSignal,
                    newsletterFormSignal,
                    insecureCookieCount,
                    cookieWithoutHttpOnlyCount,
                    cookieWithoutSameSiteCount,
                    adminOrLoginPathSignal,
                    loginFormSignal,
                    fileUploadSignal,
                    apiEndpointReferenceCount,
                    exposedCmsVersionSignal,
                    sourceMapReferenceSignal,
                    developmentReferenceSignal,
                    targetBlankWithoutNoopenerCount,
                    personalDataGetFormSignal,
                    externalFormActionSignal,
                    sensitiveDataFormSignal,
                    healthPlatformSignal,
                    noIndexSignal,
                    sitemapSignal,
                    inlineEventHandlerCount,
                    javascriptHrefCount,
                    domXssSinkSignal,
                    clientUrlInputSignal,
                    externalScriptsWithoutIntegrityCount,
                    thirdPartyScriptHostCount,
                    inlineScriptCount,
                    postFormsWithoutCsrfTokenCount,
                    outdatedJavascriptLibrarySignal,
                    httpRedirectsToHttps,
                    tlsCertificateResult.valid(),
                    tlsCertificateResult.daysRemaining(),
                    weakHstsHeaderSignal,
                    weakContentSecurityPolicySignal,
                    serverTechnologyHeaderSignal,
                    securityTxtSignal,
                    robotsSensitivePathSignal,
                    dnsSecurityResult.spf(),
                    dnsSecurityResult.dkim(),
                    dnsSecurityResult.dmarc(),
                    dnsSecurityResult.mx(),
                    dnsSecurityResult.caa(),
                    dnsSecurityResult.spfSoftfail(),
                    dnsSecurityResult.spfTooManyLookups(),
                    dnsSecurityResult.duplicateSpf(),
                    dnsSecurityResult.dmarcPolicyNone(),
                    dnsSecurityResult.dmarcRuaMissing(),
                    linkCheckResult.checkedCount(),
                    linkCheckResult.brokenCount(),
                    crawlResult.pageCount(),
                    crawlResult.privacyPageFound(),
                    crawlResult.contactPageFound(),
                    crawlResult.aboutPageFound(),
                    crawlResult.termsPageFound(),
                    crawlResult.formPageCount(),
                    crawlResult.privacyTextPageCount(),
                    crawlResult.repeatedMetaDescriptionCount(),
                    crawlResult.faqPageFound(),
                    crawlResult.pricingSignal(),
                    crawlResult.dataHandlingPageFound(),
                    accessibilityDeclarationUrl,
                    accessibilityDeclarationResult.violationCount(),
                    accessibilityDeclarationResult.requirementCount()
            );
        } catch (IOException | IllegalArgumentException exception) {
            return null;
        }
    }

    private static String attrOrNull(Element element, String attribute) {
        if (element == null) {
            return null;
        }
        String value = element.attr(attribute);
        return value.isBlank() ? null : value;
    }

    private static String textOrNull(Element element) {
        if (element == null) {
            return null;
        }
        String value = element.text();
        return value.isBlank() ? null : value;
    }

    private static int placeholderImageCount(Document document) {
        return document.select("img").stream()
                .filter(image -> hasAny((image.attr("src") + " " + image.attr("alt") + " " + image.attr("class") + " " + image.attr("id")).toLowerCase(Locale.ROOT),
                        ATTRIBUTE_PLACEHOLDER, "placeholder_img", "dummy", "avatar-placeholder", "profile-placeholder"))
                .toList()
                .size();
    }

    private static boolean ctaMismatchSignal(Document document) {
        return document.select("a[href], button").stream()
                .anyMatch(element -> {
                    String text = element.text().toLowerCase(Locale.ROOT);
                    String href = element.attr("href").toLowerCase(Locale.ROOT);
                    return hasAny(text, "start arbeidshelsesjekken", "arbeidshelsesjekken")
                            && href.contains("arbeidshelseradaren");
                });
    }

    private static String accessibilityDeclarationUrl(Document document, String baseUrl) {
        Element link = document.selectFirst("a[href*=uustatus.no], a:contains(Tilgjengelighetserklæring), a:contains(Tilgjengeerklæring), a:contains(Accessibility statement)");
        if (link == null) {
            return null;
        }
        String href = link.attr("href");
        if (href.isBlank()) {
            return null;
        }
        try {
            return URI.create(baseUrl).resolve(href.trim()).toString();
        } catch (IllegalArgumentException exception) {
            return href.trim();
        }
    }

    private static AccessibilityDeclarationResult accessibilityDeclarationResult(String url) {
        if (url == null || url.isBlank() || !url.toLowerCase(Locale.ROOT).contains("uustatus.no")) {
            return new AccessibilityDeclarationResult(null, null);
        }
        try {
            Connection.Response response = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (compatible; Nyfirmasjekk-App)")
                    .timeout(2500)
                    .followRedirects(true)
                    .execute();
            Matcher matcher = ACCESSIBILITY_VIOLATION_PATTERN.matcher(Jsoup.parse(response.body()).text());
            if (matcher.find()) {
                return new AccessibilityDeclarationResult(
                        Integer.parseInt(matcher.group(1)),
                        Integer.parseInt(matcher.group(2))
                );
            }
        } catch (IOException | IllegalArgumentException exception) {
            return new AccessibilityDeclarationResult(null, null);
        }
        return new AccessibilityDeclarationResult(null, null);
    }

    static String detectBuilder(String generator, String html) {
        String combined = ((generator == null ? "" : generator) + " " + (html == null ? "" : html)).toLowerCase();
        if (combined.contains("emergent.sh") || combined.contains("made with emergent") || combined.contains("a product of emergent")) {
            return "Emergent";
        }
        if (combined.contains("webflow")) {
            return "Webflow";
        }
        if (combined.contains("wix.com") || combined.contains("wixstatic") || combined.contains("x-wix")) {
            return "Wix";
        }
        if (combined.contains("wp-content") || combined.contains("wordpress")) {
            return "WordPress";
        }
        if (combined.contains("framerusercontent") || combined.contains("data-framer")) {
            return "Framer";
        }
        if (combined.contains("squarespace")) {
            return "Squarespace";
        }
        if (combined.contains("shopify")) {
            return "Shopify";
        }
        if (combined.contains("next/static") || combined.contains("__next")) {
            return "Next.js";
        }
        if ((generator != null && generator.toLowerCase(Locale.ROOT).contains("vite"))
                || combined.contains("/@vite/")
                || combined.contains("/vite.svg")
                || combined.contains("type=\"module\" crossorigin src=\"/assets/")
                || combined.contains("type='module' crossorigin src='/assets/")
                || combined.contains("type=\"module\" src=\"/assets/")
                || combined.contains("type='module' src='/assets/")
                || combined.contains("/assets/index-")) {
            return "Vite";
        }
        return generator == null || generator.isBlank() ? null : generator.trim();
    }

    private static boolean hasCookieOrTrackingSignal(String html) {
        String normalized = html == null ? "" : html.toLowerCase();
        return normalized.contains("google-analytics")
                || normalized.contains("googletagmanager")
                || normalized.contains("gtag(")
                || normalized.contains("fbq(")
                || normalized.contains("facebook.net")
                || normalized.contains("hotjar")
                || normalized.contains("clarity.ms")
                || normalized.contains("cookie");
    }

    private static boolean hasCookieConsentSignal(String html) {
        String normalized = html == null ? "" : html.toLowerCase();
        return normalized.contains("cookie consent")
                || normalized.contains("cookiebanner")
                || normalized.contains("cookiebot")
                || normalized.contains("klaro")
                || normalized.contains("samtykke")
                || normalized.contains("consent");
    }

    private static int skippedHeadingLevelCount(Document document) {
        int previousLevel = 0;
        int skipped = 0;
        for (Element heading : document.select("h1, h2, h3, h4, h5, h6")) {
            int level = Character.digit(heading.tagName().charAt(1), 10);
            if (previousLevel > 0 && level - previousLevel > 1) {
                skipped++;
            }
            previousLevel = level;
        }
        return skipped;
    }

    private static int vagueLinkTextCount(Document document) {
        return (int) document.select(SELECTOR_LINKS).stream()
                .filter(link -> {
                    String text = link.text().trim().toLowerCase();
                    return "her".equals(text)
                            || "les mer".equals(text)
                            || "read more".equals(text)
                            || "more".equals(text)
                            || "click here".equals(text)
                            || "klikk her".equals(text);
                })
                .count();
    }

    private static int dataTablesWithoutHeadersCount(Document document) {
        return (int) document.select("table").stream()
                .filter(table -> table.select("th, thead").isEmpty())
                .count();
    }

    private static int inputsWithoutAutocompleteCount(Document document) {
        return (int) document.select("input:not([type=hidden])").stream()
                .filter(WebsiteContentSnapshotFetcher::isPersonalDataInput)
                .filter(input -> attrOrNull(input, "autocomplete") == null)
                .count();
    }

    private static int wrongInputTypeCount(Document document, String expectedType, String... identifiers) {
        return (int) document.select("input:not([type=hidden])").stream()
                .filter(input -> {
                    String combined = (
                            input.attr("name") + " "
                                    + input.attr("id") + " "
                                    + input.attr(ATTRIBUTE_PLACEHOLDER) + " "
                                    + input.attr(ATTRIBUTE_ARIA_LABEL)
                    ).toLowerCase();
                    for (String identifier : identifiers) {
                        if (combined.contains(identifier)) {
                            return true;
                        }
                    }
                    return false;
                })
                .filter(input -> !expectedType.equalsIgnoreCase(input.attr("type")))
                .count();
    }

    private static boolean isPersonalDataInput(Element input) {
        String combined = (
                input.attr("name") + " "
                        + input.attr("id") + " "
                        + input.attr(ATTRIBUTE_PLACEHOLDER) + " "
                        + input.attr(ATTRIBUTE_ARIA_LABEL)
        ).toLowerCase();
        return combined.contains("name")
                || combined.contains("navn")
                || combined.contains("email")
                || combined.contains("epost")
                || combined.contains("e-post")
                || combined.contains("tel")
                || combined.contains("telefon")
                || combined.contains("phone")
                || combined.contains("mobil")
                || combined.contains("address")
                || combined.contains("adresse")
                || isSensitivePersonalDataInput(input);
    }

    private static boolean isSensitivePersonalDataInput(Element input) {
        String combined = (
                input.attr("name") + " "
                        + input.attr("id") + " "
                        + input.attr(ATTRIBUTE_PLACEHOLDER) + " "
                        + input.attr(ATTRIBUTE_ARIA_LABEL)
        ).toLowerCase();
        return combined.contains("personnummer")
                || combined.contains("fodselsnummer")
                || combined.contains("fødselsnummer")
                || combined.contains("fnr")
                || combined.contains("ssn");
    }

    private static boolean hasMotionSignalWithoutReducedMotion(String html) {
        String normalized = html == null ? "" : html.toLowerCase();
        boolean hasMotionSignal = normalized.contains("animation:")
                || normalized.contains("transition:")
                || normalized.contains("carousel")
                || normalized.contains("parallax")
                || normalized.contains("scrolltrigger")
                || normalized.contains("gsap");
        return hasMotionSignal && !normalized.contains("prefers-reduced-motion");
    }

    private static boolean hasHeader(Map<String, String> headers, String headerName) {
        return headers.keySet().stream().anyMatch(key -> key.equalsIgnoreCase(headerName));
    }

    private static String headerValue(Map<String, String> headers, String headerName) {
        return headers.entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase(headerName))
                .map(Map.Entry::getValue)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse("");
    }

    private static boolean weakHstsHeaderSignal(String hsts) {
        if (hsts == null || hsts.isBlank()) {
            return false;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("max-age\\s*=\\s*(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(hsts);
        return !matcher.find() || Long.parseLong(matcher.group(1)) < 15_552_000L;
    }

    private static boolean weakContentSecurityPolicySignal(String csp) {
        if (csp == null || csp.isBlank()) {
            return false;
        }
        String normalized = csp.toLowerCase(Locale.ROOT);
        return normalized.contains("'unsafe-inline'")
                || normalized.contains("'unsafe-eval'")
                || CSP_WILDCARD_SCRIPT_PATTERN.matcher(normalized).find()
                || !normalized.contains("frame-ancestors");
    }

    private static boolean hasAny(String value, String... needles) {
        String normalized = value == null ? "" : value.toLowerCase(Locale.ROOT);
        for (String needle : needles) {
            if (normalized.contains(needle.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasLinkOrText(Document document, String bodyText, String... needles) {
        String combined = (bodyText == null ? "" : bodyText) + " " + document.select(SELECTOR_LINKS).eachAttr("href");
        return hasAny(combined, needles);
    }

    private static boolean hasFooterContentSignal(Document document, String bodyText) {
        String combined = (bodyText == null ? "" : bodyText)
                + " " + document.select(SELECTOR_LINKS).eachText()
                + " " + document.select(SELECTOR_LINKS).eachAttr("href");
        return hasAny(combined,
                "copyright",
                "kontakt",
                "contact",
                TERM_PERSONVERN,
                TERM_PRIVACY,
                TERM_VILLKOR,
                TERM_VILKAR,
                TERM_POLICY,
                "frakt",
                "leverans",
                TERM_RETUR,
                "visa",
                "mastercard",
                "apple pay");
    }

    private static boolean hasEcommerceSignal(Document document, String html) {
        String normalized = html == null ? "" : html.toLowerCase(Locale.ROOT);
        boolean cartOrCheckoutSignal = hasCartOrCheckoutSignal(document, html);
        boolean productOrCommerceIntent = hasAny(normalized, "add-to-cart", "add_to_cart", "product_id", "single-product", "wc-block-cart")
                || document.selectFirst("button:contains(Kjøp), a:contains(Legg i handlekurv), form[class*=cart], form[action*=cart]") != null;
        boolean ecommercePlatform = hasAny(normalized, "shopify", "myshopify")
                || (hasAny(normalized, "woocommerce") && (cartOrCheckoutSignal || productOrCommerceIntent));
        return ecommercePlatform || cartOrCheckoutSignal || productOrCommerceIntent;
    }

    private static boolean hasCartOrCheckoutSignal(Document document, String html) {
        String normalized = html == null ? "" : html.toLowerCase(Locale.ROOT);
        return hasAny(normalized, "handlekurv", "shopping-cart", "cart__", "cart-drawer", "cart-items", "wc-block-cart")
                || document.selectFirst("a[href*=checkout], form[action*=checkout], a[href*=handlekurv], a[href*=cart]") != null;
    }

    private static boolean hasPlatformDomainSignal(String url) {
        String normalized = url == null ? "" : url.toLowerCase(Locale.ROOT);
        return normalized.contains("wixsite.com")
                || normalized.contains("wordpress.com")
                || normalized.contains("webflow.io")
                || normalized.contains("squarespace.com")
                || normalized.contains("myshopify.com")
                || normalized.contains("business.site");
    }

    private static int placeholderSocialLinkCount(Document document) {
        return (int) document.select(SELECTOR_LINKS).stream()
                .filter(link -> {
                    String href = link.attr("href").toLowerCase(Locale.ROOT);
                    boolean socialHost = href.contains("facebook.com")
                            || href.contains("instagram.com")
                            || href.contains("linkedin.com")
                            || href.contains("tiktok.com")
                            || href.contains("youtube.com");
                    return socialHost && (href.endsWith("#")
                            || href.contains("your")
                            || href.contains("username")
                            || href.contains("profile")
                            || href.contains("example"));
                })
                .count();
    }

    private static int insecureCookieCount(Map<String, String> headers, String protocol) {
        if (!"https".equalsIgnoreCase(protocol)) {
            return 0;
        }
        return (int) setCookieHeaders(headers).stream()
                .filter(cookie -> !cookie.toLowerCase(Locale.ROOT).contains("secure"))
                .count();
    }

    private static int cookieWithoutAttributeCount(Map<String, String> headers, String attribute) {
        String normalizedAttribute = attribute.toLowerCase(Locale.ROOT);
        return (int) setCookieHeaders(headers).stream()
                .filter(cookie -> !cookie.toLowerCase(Locale.ROOT).contains(normalizedAttribute))
                .count();
    }

    private static java.util.List<String> setCookieHeaders(Map<String, String> headers) {
        return headers.entrySet().stream()
                .filter(entry -> entry.getKey().equalsIgnoreCase("set-cookie") || entry.getKey().toLowerCase(Locale.ROOT).startsWith("set-cookie"))
                .map(Map.Entry::getValue)
                .filter(value -> value != null && !value.isBlank())
                .toList();
    }

    private static boolean hasAdminOrLoginPathSignal(Document document, String html) {
        String links = String.join(" ", document.select("a[href], form[action]").eachAttr("href"))
                + " " + String.join(" ", document.select("form[action]").eachAttr(ATTRIBUTE_ACTION))
                + " " + html;
        return hasAny(links,
                "/wp-admin",
                "/wp-login",
                "/admin",
                "/administrator",
                "/user/login",
                "/login",
                "/signin",
                "/dashboard");
    }

    private static int apiEndpointReferenceCount(Document document, String html) {
        Set<String> references = new java.util.LinkedHashSet<>();
        document.select(SELECTOR_URL_ATTRIBUTES).forEach(element -> {
            addIfApiReference(references, element.attr("href"));
            addIfApiReference(references, element.attr("src"));
            addIfApiReference(references, element.attr(ATTRIBUTE_ACTION));
        });
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("['\"]([^'\"]*(?:/api/|/wp-json/|graphql|rest/)[^'\"]*)['\"]", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(html == null ? "" : html);
        while (matcher.find() && references.size() < 20) {
            addIfApiReference(references, matcher.group(1));
        }
        return references.size();
    }

    private static void addIfApiReference(Set<String> references, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        String normalized = value.toLowerCase(Locale.ROOT);
        if (normalized.contains("/api/")
                || normalized.contains("/wp-json/")
                || normalized.contains("graphql")
                || normalized.contains("/rest/")) {
            references.add(value);
        }
    }

    private static boolean hasExposedCmsVersionSignal(String generator, String html) {
        String combined = ((generator == null ? "" : generator) + " " + (html == null ? "" : html)).toLowerCase(Locale.ROOT);
        return CMS_VERSION_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(combined).find());
    }

    private static boolean hasDevelopmentReferenceSignal(Document document, String html) {
        String combined = (html == null ? "" : html).toLowerCase(Locale.ROOT)
                + " " + document.select(SELECTOR_URL_ATTRIBUTES).eachAttr("href")
                + " " + document.select(SELECTOR_URL_ATTRIBUTES).eachAttr("src")
                + " " + document.select(SELECTOR_URL_ATTRIBUTES).eachAttr(ATTRIBUTE_ACTION);
        return hasAny(combined,
                "localhost:",
                "127.0.0.1",
                "0.0.0.0",
                "staging.",
                "dev.",
                "test.",
                ".env",
                "debug=true",
                "debug=1",
                "/debug",
                "/backup",
                ".bak",
                ".old",
                ".sql");
    }

    private static int targetBlankWithoutNoopenerCount(Document document) {
        return (int) document.select("a[target=_blank], a[target=\"_blank\"]").stream()
                .filter(link -> {
                    String rel = link.attr("rel").toLowerCase(Locale.ROOT);
                    return !rel.contains("noopener") && !rel.contains("noreferrer");
                })
                .count();
    }

    private static boolean personalDataGetFormSignal(Document document) {
        return document.select("form").stream()
                .filter(form -> {
                    String method = form.attr("method");
                    return method.isBlank() || "get".equalsIgnoreCase(method);
                })
                .flatMap(form -> form.select(SELECTOR_FORM_CONTROLS).stream())
                .anyMatch(WebsiteContentSnapshotFetcher::isPersonalDataInput);
    }

    private static boolean sensitiveDataFormSignal(Document document) {
        return document.select("form").stream()
                .flatMap(form -> form.select(SELECTOR_FORM_CONTROLS).stream())
                .anyMatch(WebsiteContentSnapshotFetcher::isSensitivePersonalDataInput);
    }

    private static boolean externalFormActionSignal(Document document, String finalUrl) {
        URI baseUri;
        try {
            baseUri = URI.create(finalUrl);
        } catch (IllegalArgumentException exception) {
            return false;
        }
        return document.select("form[action^=http]").stream()
                .map(form -> form.attr(ATTRIBUTE_ACTION))
                .anyMatch(action -> !sameHost(baseUri, action));
    }

    private static int inlineEventHandlerCount(Document document) {
        return (int) document.getAllElements().stream()
                .filter(element -> element.attributes().asList().stream()
                        .anyMatch(attribute -> attribute.getKey().toLowerCase(Locale.ROOT).startsWith("on")))
                .count();
    }

    private static boolean hasDomXssSinkSignal(String html) {
        return hasAny(html,
                "innerHTML",
                "outerHTML",
                "insertAdjacentHTML",
                "document.write",
                "eval(",
                "new Function(",
                "dangerouslySetInnerHTML",
                "v-html");
    }

    private static boolean hasClientUrlInputSignal(String html) {
        return hasAny(html,
                "location.search",
                "window.location.search",
                "location.hash",
                "window.location.hash",
                "URLSearchParams",
                "document.location");
    }

    private static int externalScriptsWithoutIntegrityCount(Document document) {
        return (int) document.select(SELECTOR_EXTERNAL_SCRIPTS).stream()
                .filter(script -> attrOrNull(script, "integrity") == null)
                .count();
    }

    private static int thirdPartyScriptHostCount(Document document, String finalUrl) {
        URI baseUri;
        try {
            baseUri = URI.create(finalUrl);
        } catch (IllegalArgumentException exception) {
            return 0;
        }
        Set<String> hosts = new java.util.LinkedHashSet<>();
        document.select(SELECTOR_EXTERNAL_SCRIPTS).stream()
                .map(script -> script.attr("src"))
                .forEach(src -> {
                    try {
                        URI uri = URI.create(src);
                        if (uri.getHost() != null && !sameHost(baseUri, src)) {
                            hosts.add(uri.getHost().toLowerCase(Locale.ROOT));
                        }
                    } catch (IllegalArgumentException ignored) {
                        // Ignore malformed script URLs in passive checks.
                    }
                });
        return hosts.size();
    }

    private static int inlineScriptCount(Document document) {
        return (int) document.select("script:not([src])").stream()
                .filter(script -> !script.data().isBlank() || !script.html().isBlank())
                .count();
    }

    private static int postFormsWithoutCsrfTokenCount(Document document) {
        return (int) document.select("form").stream()
                .filter(form -> "post".equalsIgnoreCase(form.attr("method")))
                .filter(form -> form.select("input[type=hidden]").stream().noneMatch(input -> {
                    String combined = (input.attr("name") + " " + input.attr("id")).toLowerCase(Locale.ROOT);
                    return combined.contains("csrf")
                            || combined.contains("_token")
                            || combined.contains("authenticity")
                            || combined.contains("xsrf");
                }))
                .count();
    }

    private static boolean hasOutdatedJavascriptLibrarySignal(String html) {
        String normalized = html == null ? "" : html.toLowerCase(Locale.ROOT);
        return OUTDATED_JAVASCRIPT_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(normalized).find());
    }

    private static DnsSecurityResult dnsSecurityResult(String host) {
        String domain = registrableDomain(host);
        if (domain == null) {
            return new DnsSecurityResult(false, false, false, false, false, false, false, false, false, false);
        }
        java.util.List<String> spfRecords = txtRecords(domain).stream()
                .filter(dnsRecord -> dnsRecord.toLowerCase(Locale.ROOT).contains("v=spf1"))
                .toList();
        java.util.List<String> dmarcRecords = txtRecords("_dmarc." + domain).stream()
                .filter(dnsRecord -> dnsRecord.toLowerCase(Locale.ROOT).contains("v=dmarc1"))
                .toList();
        String combinedSpf = String.join(" ", spfRecords).toLowerCase(Locale.ROOT);
        String combinedDmarc = String.join(" ", dmarcRecords).toLowerCase(Locale.ROOT);
        return new DnsSecurityResult(
                !spfRecords.isEmpty(),
                hasDkimRecord(domain),
                !dmarcRecords.isEmpty(),
                hasMxRecord(domain),
                hasCaaRecord(domain),
                spfRecords.stream().anyMatch(dnsRecord -> dnsRecord.contains("~all") || dnsRecord.contains("?all")),
                spfLookupTokenCount(combinedSpf) > 8,
                spfRecords.size() > 1,
                combinedDmarc.contains("p=none"),
                !dmarcRecords.isEmpty() && !combinedDmarc.contains("rua=")
        );
    }

    private static boolean hasMxRecord(String domain) {
        return hasDnsRecord(domain, "MX");
    }

    private static boolean hasCaaRecord(String domain) {
        return hasDnsRecord(domain, "CAA");
    }

    private static boolean hasDnsRecord(String name, String type) {
        try {
            return new InitialDirContext().getAttributes("dns:/" + name, new String[]{type}).get(type) != null;
        } catch (NamingException exception) {
            return false;
        }
    }

    private static int spfLookupTokenCount(String spf) {
        if (spf == null || spf.isBlank()) {
            return 0;
        }
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("\\b(include|a|mx|ptr|exists|redirect)[:=]?", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(spf);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return count;
    }

    private static boolean hasDkimRecord(String domain) {
        return java.util.stream.Stream.of("default", "selector1", "selector2", "google", "k1", "mail", "dkim")
                .map(selector -> selector + "._domainkey." + domain)
                .map(WebsiteContentSnapshotFetcher::txtRecords)
                .flatMap(java.util.Collection::stream)
                .anyMatch(dnsRecord -> dnsRecord.toLowerCase(Locale.ROOT).contains("v=dkim1") || dnsRecord.toLowerCase(Locale.ROOT).contains("p="));
    }

    private static String registrableDomain(String host) {
        if (host == null || host.isBlank()) {
            return null;
        }
        String normalized = host.toLowerCase(Locale.ROOT).replaceFirst("^www\\.", "");
        String[] parts = normalized.split("\\.");
        if (parts.length < 2) {
            return null;
        }
        return parts[parts.length - 2] + "." + parts[parts.length - 1];
    }

    private static java.util.List<String> txtRecords(String name) {
        try {
            var attributes = new InitialDirContext().getAttributes("dns:/" + name, new String[]{"TXT"});
            var txt = attributes.get("TXT");
            if (txt == null) {
                return java.util.List.of();
            }
            java.util.List<String> records = new java.util.ArrayList<>();
            for (int index = 0; index < txt.size(); index++) {
                records.add(String.valueOf(txt.get(index)).replace("\" \"", "").replace("\"", ""));
            }
            return records;
        } catch (NamingException exception) {
            return java.util.List.of();
        }
    }

    private static TlsCertificateResult tlsCertificateResult(String url) {
        if (url == null || !url.toLowerCase(Locale.ROOT).startsWith(HTTPS_PREFIX)) {
            return new TlsCertificateResult(false, null);
        }
        try {
            HttpsURLConnection connection = (HttpsURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("HEAD");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(1500);
            connection.setReadTimeout(1500);
            connection.setRequestProperty(HEADER_USER_AGENT, USER_AGENT_VALUE);
            connection.connect();
            X509Certificate certificate = (X509Certificate) connection.getServerCertificates()[0];
            certificate.checkValidity();
            long daysRemaining = ChronoUnit.DAYS.between(Instant.now(), certificate.getNotAfter().toInstant());
            return new TlsCertificateResult(daysRemaining >= 0, (int) daysRemaining);
        } catch (Exception exception) {
            return new TlsCertificateResult(false, null);
        }
    }

    private static boolean httpRedirectsToHttps(String host) {
        if (host == null || host.isBlank()) {
            return false;
        }
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create("http://" + host).toURL().openConnection();
            connection.setRequestMethod("HEAD");
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(1200);
            connection.setReadTimeout(1200);
            connection.setRequestProperty(HEADER_USER_AGENT, USER_AGENT_VALUE);
            int status = connection.getResponseCode();
            String location = connection.getHeaderField("Location");
            return status >= 300 && status < 400 && location != null && location.toLowerCase(Locale.ROOT).startsWith(HTTPS_PREFIX);
        } catch (IOException | IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean hasSecurityTxt(String finalUrl) {
        URI baseUri = URI.create(finalUrl);
        String origin = baseUri.getScheme() + "://" + baseUri.getHost();
        return hasReadableTextResource(origin + "/.well-known/security.txt")
                || hasReadableTextResource(origin + "/security.txt");
    }

    private static boolean hasSitemap(String finalUrl) {
        URI baseUri = URI.create(finalUrl);
        String origin = baseUri.getScheme() + "://" + baseUri.getHost();
        return hasReadableTextResource(origin + "/sitemap.xml")
                || hasReadableTextResource(origin + "/sitemap_index.xml");
    }

    private static boolean robotsSensitivePathSignal(String finalUrl) {
        URI baseUri = URI.create(finalUrl);
        String origin = baseUri.getScheme() + "://" + baseUri.getHost();
        String robots = readSmallTextResource(origin + "/robots.txt");
        if (robots.isBlank()) {
            return false;
        }
        return hasAny(robots, "/admin", "/wp-admin", "/login", "/user", "/api", "/backup", "/private", "/config");
    }

    private static boolean hasReadableTextResource(String url) {
        return !readSmallTextResource(url).isBlank();
    }

    private static String readSmallTextResource(String url) {
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(1200);
            connection.setReadTimeout(1200);
            connection.setRequestProperty(HEADER_USER_AGENT, USER_AGENT_VALUE);
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                return "";
            }
            try (java.io.InputStream stream = connection.getInputStream()) {
                return new String(stream.readNBytes(4096), java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (IOException | IllegalArgumentException exception) {
            return "";
        }
    }

    private static ExtendedCrawlResult extendedCrawl(Document document, String baseUrl) {
        URI baseUri;
        try {
            baseUri = URI.create(baseUrl);
        } catch (IllegalArgumentException exception) {
            return ExtendedCrawlResult.empty();
        }
        String origin = origin(baseUri);
        if (origin == null) {
            return ExtendedCrawlResult.empty();
        }

        Set<String> candidates = new java.util.LinkedHashSet<>();
        STANDARD_REVIEW_PATHS.stream()
                .map(path -> origin + path)
                .forEach(candidates::add);
        document.select(SELECTOR_LINKS).stream()
                .map(link -> link.attr("abs:href"))
                .filter(java.util.function.Predicate.not(String::isBlank))
                .filter(WebsiteContentSnapshotFetcher::isHttpUrl)
                .filter(href -> sameHost(baseUri, href))
                .filter(href -> !href.contains("#"))
                .filter(WebsiteContentSnapshotFetcher::isLikelyReviewPage)
                .forEach(candidates::add);

        ExtendedCrawlAccumulator accumulator = new ExtendedCrawlAccumulator(
                baseUrl,
                normalizedMetaDescription(document)
        );

        for (String candidate : candidates) {
            if (accumulator.limitReached()) {
                break;
            }
            String html = readSmallHtmlResource(candidate);
            if (!html.isBlank()) {
                accumulator.capture(candidate, html);
            }
        }

        return accumulator.result();
    }

    private static void appendCrawledBodyText(StringBuilder target, Document document) {
        if (target.length() >= EXTENDED_CRAWL_TEXT_BYTES) {
            return;
        }
        String text = document.body().text();
        if (text.isBlank()) {
            return;
        }
        int remaining = EXTENDED_CRAWL_TEXT_BYTES - target.length();
        if (remaining <= 0) {
            return;
        }
        if (!target.isEmpty()) {
            target.append(' ');
            remaining--;
        }
        target.append(text, 0, Math.min(text.length(), remaining));
    }

    private static String normalizedMetaDescription(Document document) {
        Element description = document.selectFirst("meta[name=description]");
        String value = attrOrNull(description, ATTRIBUTE_CONTENT);
        return value == null ? "" : collapseWhitespace(value.toLowerCase(Locale.ROOT));
    }

    private static String collapseWhitespace(String value) {
        StringBuilder normalized = new StringBuilder(value.length());
        boolean previousWasWhitespace = true;
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (Character.isWhitespace(character)) {
                previousWasWhitespace = !normalized.isEmpty();
            } else {
                if (previousWasWhitespace && !normalized.isEmpty()) {
                    normalized.append(' ');
                }
                normalized.append(character);
                previousWasWhitespace = false;
            }
        }
        return normalized.toString();
    }

    private static String origin(URI uri) {
        if (uri.getScheme() == null || uri.getHost() == null) {
            return null;
        }
        return uri.getScheme() + "://" + uri.getHost();
    }

    private static boolean isLikelyReviewPage(String url) {
        String normalized = url.toLowerCase(Locale.ROOT);
        return hasAny(normalized,
                "/kontakt",
                "/contact",
                "/om",
                "/about",
                "/personvern",
                "/privacy",
                "/cookies",
                "/vilkar",
                "/vilkår",
                "/villkor",
                "/terms",
                "/policy",
                "/tjenester",
                "/services",
                "/menneskene",
                "/team",
                "/referanser",
                "/referanse",
                "/references",
                "/case",
                "/cases",
                "/prosjekter",
                "/kunder",
                "/faq",
                "/pris",
                "/pricing",
                "/arbeidshelsesjekken",
                "/arbeidshelseradaren",
                "/retur",
                "/refund");
    }

    private static String readSmallHtmlResource(String url) {
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(EXTENDED_CRAWL_TIMEOUT_MS);
            connection.setReadTimeout(EXTENDED_CRAWL_TIMEOUT_MS);
            connection.setRequestProperty(HEADER_USER_AGENT, USER_AGENT_VALUE);
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                return "";
            }
            String contentType = connection.getContentType();
            if (contentType != null && !contentType.toLowerCase(Locale.ROOT).contains("text/html")) {
                return "";
            }
            try (java.io.InputStream stream = connection.getInputStream()) {
                return new String(stream.readNBytes(EXTENDED_CRAWL_BYTES), java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (IOException | IllegalArgumentException exception) {
            return "";
        }
    }

    private static LinkCheckResult checkInternalLinks(Document document, String baseUrl) {
        URI baseUri = URI.create(baseUrl);
        Set<String> links = document.select(SELECTOR_LINKS).stream()
                .map(link -> link.attr("abs:href"))
                .filter(java.util.function.Predicate.not(String::isBlank))
                .filter(WebsiteContentSnapshotFetcher::isHttpUrl)
                .filter(href -> sameHost(baseUri, href))
                .filter(href -> !href.contains("#"))
                .limit(8)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));

        int broken = 0;
        for (String link : links) {
            if (isBrokenLink(link)) {
                broken++;
            }
        }
        return new LinkCheckResult(links.size(), broken);
    }

    private static boolean isHttpUrl(String href) {
        return href.startsWith("http://") || href.startsWith(HTTPS_PREFIX);
    }

    private static boolean sameHost(URI baseUri, String href) {
        try {
            URI uri = URI.create(href);
            return uri.getHost() != null && uri.getHost().equalsIgnoreCase(baseUri.getHost());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean isBrokenLink(String url) {
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("HEAD");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(1200);
            connection.setReadTimeout(1200);
            connection.setRequestProperty(HEADER_USER_AGENT, USER_AGENT_VALUE);
            int status = connection.getResponseCode();
            if (status == HttpURLConnection.HTTP_BAD_METHOD) {
                return isBrokenLinkWithGet(url);
            }
            return status >= 400;
        } catch (IOException | IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean isBrokenLinkWithGet(String url) {
        try {
            HttpURLConnection connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(1200);
            connection.setReadTimeout(1200);
            connection.setRequestProperty(HEADER_USER_AGENT, USER_AGENT_VALUE);
            return connection.getResponseCode() >= 400;
        } catch (IOException | IllegalArgumentException exception) {
            return false;
        }
    }

    private record LinkCheckResult(int checkedCount, int brokenCount) {
    }

    private static final class ExtendedCrawlAccumulator {
        private final String baseUrl;
        private final String frontPageMetaDescription;
        private final StringBuilder crawledBodyText = new StringBuilder();
        private int crawled;
        private boolean privacyPageFound;
        private boolean contactPageFound;
        private boolean aboutPageFound;
        private boolean termsPageFound;
        private int formPages;
        private int privacyTextPages;
        private int repeatedMetaDescriptionCount;
        private boolean faqPageFound;
        private boolean pricingSignal;
        private boolean dataHandlingPageFound;

        private ExtendedCrawlAccumulator(String baseUrl, String frontPageMetaDescription) {
            this.baseUrl = baseUrl;
            this.frontPageMetaDescription = frontPageMetaDescription;
        }

        private boolean limitReached() {
            return crawled >= EXTENDED_CRAWL_LIMIT;
        }

        private void capture(String candidate, String html) {
            crawled++;
            String normalizedUrl = candidate.toLowerCase(Locale.ROOT);
            String normalizedContent = html.toLowerCase(Locale.ROOT);
            String searchableContent = normalizedUrl + " " + normalizedContent;
            Document crawledDocument = Jsoup.parse(html, candidate);
            appendCrawledBodyText(crawledBodyText, crawledDocument);
            captureMetaDescription(candidate, crawledDocument);
            privacyPageFound |= hasAny(searchableContent, TERM_PERSONVERN, TERM_PRIVACY, "gdpr", "datenschutz", "integritetspolicy");
            contactPageFound |= hasAny(searchableContent, "kontakt", "contact", "kundeservice", "support");
            aboutPageFound |= hasAny(searchableContent, "om-oss", "about", "om oss", "hvem vi er", "about us");
            termsPageFound |= hasAny(searchableContent, "vilkar", TERM_VILKAR, TERM_VILLKOR, "terms", "conditions", TERM_POLICY, TERM_RETUR, "refund");
            faqPageFound |= hasAny(searchableContent, "faq", "ofte stilte", "sporsmal", "spørsmål", "questions");
            pricingSignal |= hasAny(normalizedContent, "pris", "priser", "pricing", "abonnement", "subscription", "gratis prøve", "free trial", "demo");
            dataHandlingPageFound |= hasAny(normalizedContent, "datahåndtering", "datahandtering", "databehandling", "databehandler", "personopplysninger", "arbeidsmiljødata", "arbeidsmiljodata");
            formPages += normalizedContent.contains("<form") ? 1 : 0;
            privacyTextPages += hasAny(normalizedContent, "personopplysninger", TERM_PERSONVERN, TERM_PRIVACY,
                    "gdpr", "databehandler", "cookies", "informasjonskapsler", "integritetspolicy") ? 1 : 0;
        }

        private void captureMetaDescription(String candidate, Document crawledDocument) {
            String crawledMetaDescription = normalizedMetaDescription(crawledDocument);
            if (!frontPageMetaDescription.isBlank()
                    && frontPageMetaDescription.equals(crawledMetaDescription)
                    && !candidate.equals(baseUrl)) {
                repeatedMetaDescriptionCount++;
            }
        }

        private ExtendedCrawlResult result() {
            return new ExtendedCrawlResult(crawled, privacyPageFound, contactPageFound, aboutPageFound,
                    termsPageFound, formPages, privacyTextPages, repeatedMetaDescriptionCount, faqPageFound,
                    pricingSignal, dataHandlingPageFound, crawledBodyText.toString().trim());
        }
    }

    private record ExtendedCrawlResult(
            int pageCount,
            boolean privacyPageFound,
            boolean contactPageFound,
            boolean aboutPageFound,
            boolean termsPageFound,
            int formPageCount,
            int privacyTextPageCount,
            int repeatedMetaDescriptionCount,
            boolean faqPageFound,
            boolean pricingSignal,
            boolean dataHandlingPageFound,
            String bodyText
    ) {
        private static ExtendedCrawlResult empty() {
            return new ExtendedCrawlResult(0, false, false, false, false, 0, 0, 0, false, false, false, "");
        }
    }

    private record DnsSecurityResult(
            boolean spf,
            boolean dkim,
            boolean dmarc,
            boolean mx,
            boolean caa,
            boolean spfSoftfail,
            boolean spfTooManyLookups,
            boolean duplicateSpf,
            boolean dmarcPolicyNone,
            boolean dmarcRuaMissing
    ) {
    }

    private record AccessibilityDeclarationResult(Integer violationCount, Integer requirementCount) {
    }

    private record TlsCertificateResult(boolean valid, Integer daysRemaining) {
    }
}
