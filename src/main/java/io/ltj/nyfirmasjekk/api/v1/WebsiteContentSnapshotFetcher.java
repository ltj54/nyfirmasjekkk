package io.ltj.nyfirmasjekk.api.v1;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.io.IOException;

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
            Element description = document.selectFirst("meta[name=description]");
            Element viewport = document.selectFirst("meta[name=viewport]");
            Element html = document.selectFirst("html");
            Element h1 = document.selectFirst("h1");
            boolean openGraphTitle = document.selectFirst("meta[property=og:title], meta[name=twitter:title]") != null;
            boolean openGraphDescription = document.selectFirst("meta[property=og:description], meta[name=twitter:description]") != null;
            boolean structuredData = document.selectFirst("script[type=application/ld+json]") != null;
            int linkCount = document.select("a[href]:not([href^=#]):not([href^=mailto:]):not([href^=tel:]):not([href^=javascript:])").size();
            int headingCount = document.select("h1, h2, h3").size();
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
                    externalIframeCount
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

    private static String detectBuilder(String generator, String html) {
        String combined = ((generator == null ? "" : generator) + " " + (html == null ? "" : html)).toLowerCase();
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
}
