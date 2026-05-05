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

            return new WebsiteContentInspectionService.WebsiteContentSnapshot(
                    title,
                    bodyText,
                    document.outerHtml(),
                    attrOrNull(description, "content"),
                    attrOrNull(viewport, "content"),
                    attrOrNull(html, "lang"),
                    textOrNull(h1)
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
}
