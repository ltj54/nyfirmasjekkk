package io.ltj.nyfirmasjekk.api.v1;

import org.jsoup.Jsoup;
import org.jsoup.Connection;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class WebsiteContentSnapshotFetcher {
    @Cacheable(value = "websiteContent", key = "#url")
    public WebsiteContentInspectionService.WebsiteContentSnapshot fetchSnapshot(String url) {
        return fetch(url);
    }

    static WebsiteContentInspectionService.WebsiteContentSnapshot fetch(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        try {
            Connection.Response response = Jsoup.connect(url)
                    .userAgent("Nyfirmasjekk-App")
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
            String generator = attrOrNull(document.selectFirst("meta[name=generator]"), "content");
            String htmlSnapshot = document.outerHtml();
            String detectedBuilder = detectBuilder(generator, htmlSnapshot);
            int imageCount = document.select("img").size();
            int imagesWithoutAlt = document.select("img:not([alt]), img[alt=\"\"]").size();
            int formControlCount = document.select("input:not([type=hidden]), textarea, select").size();
            int unlabeledFormControlCount = document.select("input:not([type=hidden]):not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby])")
                    .stream()
                    .filter(element -> {
                        String id = element.id();
                        return id.isBlank() || document.selectFirst("label[for=\"" + id + "\"]") == null;
                    })
                    .toList()
                    .size();
            int emptyButtonCount = document.select("button, a[role=button]").stream()
                    .filter(element -> element.text().isBlank() && attrOrNull(element, "aria-label") == null)
                    .toList()
                    .size();
            boolean fixedWidthLayoutSignal = htmlSnapshot.matches("(?is).*\\b(width|min-width)\\s*:\\s*(9\\d{2}|[1-9]\\d{3,})px.*");
            boolean mixedContentSignal = !document.select("[src^=http://], [href^=http://]").isEmpty();
            boolean privacyLink = !document.select("a[href*=personvern], a[href*=privacy], a[href*=gdpr], a[href*=datenschutz]").isEmpty()
                    || bodyText.toLowerCase().contains("personvern")
                    || bodyText.toLowerCase().contains("privacy");
            boolean cookieOrTrackingSignal = hasCookieOrTrackingSignal(htmlSnapshot);
            boolean cookieConsentSignal = hasCookieConsentSignal(htmlSnapshot);
            int externalScriptCount = document.select("script[src^=http]").size();
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
            boolean outlineNoneSignal = htmlSnapshot.matches("(?is).*outline\\s*:\\s*(0|none).*");
            boolean autoplayMediaSignal = document.selectFirst("video[autoplay], audio[autoplay], iframe[src*=autoplay=1]") != null;
            boolean motionWithoutReducedMotionSignal = hasMotionSignalWithoutReducedMotion(htmlSnapshot);
            int videoCount = document.select("video").size();
            int iframeWithoutTitleCount = document.select("iframe:not([title]), iframe[title=\"\"]").size();
            Map<String, String> headers = response.headers();
            boolean hstsHeader = hasHeader(headers, "strict-transport-security");
            boolean contentSecurityPolicyHeader = hasHeader(headers, "content-security-policy");
            boolean contentTypeOptionsHeader = hasHeader(headers, "x-content-type-options");
            boolean referrerPolicyHeader = hasHeader(headers, "referrer-policy");
            boolean permissionsPolicyHeader = hasHeader(headers, "permissions-policy");
            boolean frameOptionsHeader = hasHeader(headers, "x-frame-options");
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
            boolean termsLink = hasLinkOrText(document, bodyText, "vilkar", "vilkår", "villkor", "terms", "policy", "salgsbetingelser", "kjopsvilkar", "kjøpsvilkår", "kopvillkor", "köpvillkor", "allmanna villkor", "allmänna villkor");
            boolean returnInfo = hasLinkOrText(document, bodyText, "retur", "angrerett", "angerratt", "ångerrätt", "reklamasjon", "reklamation", "return", "refund", "aterbetalning", "återbetalning", "byte");
            boolean deliveryInfo = hasLinkOrText(document, bodyText, "frakt", "levering", "leverans", "shipping", "delivery");
            boolean cartOrCheckoutSignal = hasAny(htmlSnapshot, "checkout", "cart", "handlekurv", "shopping-cart");
            boolean platformDomainSignal = hasPlatformDomainSignal(response.url().toString());
            int placeholderSocialLinkCount = placeholderSocialLinkCount(document);
            boolean cloudflareEmailProtectionSignal = hasAny(htmlSnapshot, "/cdn-cgi/l/email-protection", "data-cfemail");
            boolean loadingOverlaySignal = hasAny(htmlSnapshot, "ett ögonblick", "ett ogonblick", "loading icon", "please wait", "laddar", "loader");
            boolean visibleDiscountCodeSignal = hasAny(htmlSnapshot, "discount=", "coupon=", "rabattkode", "rabattkod", "promo code");
            boolean paymentLogoSignal = hasAny(htmlSnapshot, "visa", "mastercard", "apple pay", "klarna", "vipps");
            boolean paymentTrustInfoSignal = hasAny(bodyText + " " + htmlSnapshot, "sikker betaling", "trygg betaling", "secure payment", "ssl", "kryptert", "säker betalning", "saker betalning", "safe checkout");
            boolean newsletterFormSignal = hasAny(bodyText + " " + htmlSnapshot, "newsletter", "nyhetsbrev", "prenumerera", "subscribe");
            LinkCheckResult linkCheckResult = checkInternalLinks(document, response.url().toString());

            return new WebsiteContentInspectionService.WebsiteContentSnapshot(
                    title,
                    bodyText,
                    document.outerHtml(),
                    attrOrNull(description, "content"),
                    attrOrNull(viewport, "content"),
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
                    linkCheckResult.checkedCount(),
                    linkCheckResult.brokenCount()
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
        if (combined.contains("vite") || combined.contains("/assets/index-")) {
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
        return (int) document.select("a[href]").stream()
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
                                    + input.attr("placeholder") + " "
                                    + input.attr("aria-label")
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
                        + input.attr("placeholder") + " "
                        + input.attr("aria-label")
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
                || combined.contains("adresse");
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
        String combined = (bodyText == null ? "" : bodyText) + " " + document.select("a[href]").eachAttr("href");
        return hasAny(combined, needles);
    }

    private static boolean hasFooterContentSignal(Document document, String bodyText) {
        String combined = (bodyText == null ? "" : bodyText)
                + " " + document.select("a[href]").eachText()
                + " " + document.select("a[href]").eachAttr("href");
        return hasAny(combined,
                "copyright",
                "kontakt",
                "contact",
                "personvern",
                "privacy",
                "villkor",
                "vilkår",
                "policy",
                "frakt",
                "leverans",
                "retur",
                "visa",
                "mastercard",
                "apple pay");
    }

    private static boolean hasEcommerceSignal(Document document, String html) {
        return hasAny(html, "shopify", "woocommerce", "klarna", "vipps", "stripe", "nets", "checkout", "handlekurv")
                || document.selectFirst("button:contains(Kjøp), button:contains(Bestill), a:contains(Legg i handlekurv), a[href*=checkout], form[action*=checkout]") != null;
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
        return (int) document.select("a[href]").stream()
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

    private static LinkCheckResult checkInternalLinks(Document document, String baseUrl) {
        URI baseUri = URI.create(baseUrl);
        Set<String> links = document.select("a[href]").stream()
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
        return href.startsWith("http://") || href.startsWith("https://");
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
            connection.setRequestProperty("User-Agent", "Nyfirmasjekk-App");
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
            connection.setRequestProperty("User-Agent", "Nyfirmasjekk-App");
            return connection.getResponseCode() >= 400;
        } catch (IOException | IllegalArgumentException exception) {
            return false;
        }
    }

    private record LinkCheckResult(int checkedCount, int brokenCount) {
    }
}
