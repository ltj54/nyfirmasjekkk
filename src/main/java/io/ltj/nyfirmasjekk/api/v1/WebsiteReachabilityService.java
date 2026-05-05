package io.ltj.nyfirmasjekk.api.v1;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
public class WebsiteReachabilityService {
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(4);
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(8);
    private static final String USER_AGENT = "Mozilla/5.0 (compatible; Nyfirmasjekk/1.0; +https://ltj54.github.io/ltj-production/)";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(CONNECT_TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Cacheable(value = "websiteReachability", key = "#url")
    public boolean isReachable(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }

        try {
            var headResponse = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url))
                            .timeout(REQUEST_TIMEOUT)
                            .header("User-Agent", USER_AGENT)
                            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                            .method("HEAD", HttpRequest.BodyPublishers.noBody())
                            .build(),
                    HttpResponse.BodyHandlers.discarding()
            );

            if (isReachableStatus(headResponse.statusCode())) {
                return true;
            }
        } catch (IOException | InterruptedException | IllegalArgumentException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        try {
            var getResponse = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url))
                            .timeout(REQUEST_TIMEOUT)
                            .header("User-Agent", USER_AGENT)
                            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.discarding()
            );
            return isReachableStatus(getResponse.statusCode());
        } catch (IOException | InterruptedException | IllegalArgumentException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return false;
        }
    }

    private boolean isReachableStatus(int statusCode) {
        return (statusCode >= 200 && statusCode < 400) || statusCode == 401 || statusCode == 403 || statusCode == 429;
    }
}
