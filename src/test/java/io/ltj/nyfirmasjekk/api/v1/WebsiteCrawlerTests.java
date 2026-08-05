package io.ltj.nyfirmasjekk.api.v1;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.Test;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class WebsiteCrawlerTests {
    @Test
    void normalisererFragmentStandardportOgSporingsparametre() {
        assertThat(WebsiteContentSnapshotFetcher.canonicalCrawlUrl(
                "HTTPS://Example.COM:443/kontakt/#team"))
                .isEqualTo("https://example.com/kontakt");
        assertThat(WebsiteContentSnapshotFetcher.canonicalCrawlUrl(
                "https://example.com/personvern?utm_source=test#cookies"))
                .isEqualTo("https://example.com/personvern");
    }

    @Test
    void respektererRobotsForVartNavnOgFellesregler() {
        String robots = """
                User-agent: *
                Disallow: /private
                Allow: /private/public
                User-agent: Nyfirmasjekk-App
                Disallow: /hemmelig
                """;
        assertThat(WebsiteContentSnapshotFetcher.robotsAllows(robots, URI.create("https://example.com/kontakt"))).isTrue();
        assertThat(WebsiteContentSnapshotFetcher.robotsAllows(robots, URI.create("https://example.com/private/data"))).isTrue();
        assertThat(WebsiteContentSnapshotFetcher.robotsAllows(robots, URI.create("https://example.com/private/public/info"))).isTrue();
        assertThat(WebsiteContentSnapshotFetcher.robotsAllows(robots, URI.create("https://example.com/hemmelig"))).isFalse();
    }

    @Test
    void prioritererVirkeligeLenkerBrukerSitemapOgOppdagerNesteNiva() {
        String baseUrl = "https://example.com/";
        String homepageHtml = """
                <html><head><title>Forside</title></head><body>
                  <h1>Eksempelbedrift</h1>
                  <a href="/kontakt">Kontakt</a>
                  <a href="/personvern">Personvern</a>
                  <a href="/private/data">Internt</a>
                </body></html>
                """;
        Document homepage = Jsoup.parse(homepageHtml, baseUrl);
        Map<String, String> pages = new HashMap<>();
        pages.put("https://example.com/personvern", page("Personvern", "Vi behandler personopplysninger og cookies."));
        pages.put("https://example.com/kontakt", """
                <html><head><title>Kontakt</title></head><body><h1>Kontakt oss</h1>
                <form><label for="email">E-post</label><input id="email"></form>
                <a href="/faq">Ofte stilte spørsmål</a></body></html>
                """);
        pages.put("https://example.com/faq", page("FAQ", "Ofte stilte spørsmål og svar."));
        pages.put("https://example.com/vilkar", page("Vilkår", "Våre betingelser og returregler."));
        pages.put("https://example.com/om-oss", homepageHtml); // soft redirect/duplikat av forsiden

        Map<String, String> resources = Map.of(
                "https://example.com/robots.txt", "User-agent: *\nDisallow: /private",
                "https://example.com/sitemap.xml", "<urlset><url><loc>https://example.com/vilkar</loc></url></urlset>",
                "https://example.com/sitemap_index.xml", ""
        );
        List<String> requested = new ArrayList<>();

        var result = WebsiteContentSnapshotFetcher.extendedCrawl(
                homepage,
                baseUrl,
                url -> {
                    requested.add(url);
                    return pages.getOrDefault(url, "");
                },
                url -> resources.getOrDefault(url, "")
        );

        assertThat(requested)
                .startsWith("https://example.com/personvern", "https://example.com/kontakt")
                .doesNotContain("https://example.com/private/data");
        assertThat(result.pageCount()).isEqualTo(4);
        assertThat(result.privacyPageFound()).isTrue();
        assertThat(result.contactPageFound()).isTrue();
        assertThat(result.termsPageFound()).isTrue();
        assertThat(result.faqPageFound()).isTrue();
        assertThat(result.formPageCount()).isEqualTo(1);
    }

    private static String page(String title, String body) {
        return "<html><head><title>" + title + "</title></head><body><h1>" + title + "</h1><p>" + body + "</p></body></html>";
    }
}
