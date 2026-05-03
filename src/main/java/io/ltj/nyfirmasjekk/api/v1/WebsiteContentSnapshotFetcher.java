package io.ltj.nyfirmasjekk.api.v1;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
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

            return new WebsiteContentInspectionService.WebsiteContentSnapshot(title, bodyText);
        } catch (IOException | IllegalArgumentException exception) {
            return null;
        }
    }
}
