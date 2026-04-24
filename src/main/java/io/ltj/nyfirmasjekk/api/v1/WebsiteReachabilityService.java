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

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
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
                            .timeout(Duration.ofSeconds(4))
                            .header("User-Agent", "Nyfirmasjekk-App")
                            .method("HEAD", HttpRequest.BodyPublishers.noBody())
                            .build(),
                    HttpResponse.BodyHandlers.discarding()
            );

            if (isSuccessful(headResponse.statusCode())) {
                return true;
            }

            if (headResponse.statusCode() != 405 && headResponse.statusCode() != 403) {
                return false;
            }
        } catch (IOException | InterruptedException | IllegalArgumentException ignored) {
            if (ignored instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return false;
        }

        try {
            var getResponse = httpClient.send(
                    HttpRequest.newBuilder(URI.create(url))
                            .timeout(Duration.ofSeconds(4))
                            .header("User-Agent", "Nyfirmasjekk-App")
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.discarding()
            );
            return isSuccessful(getResponse.statusCode());
        } catch (IOException | InterruptedException | IllegalArgumentException ignored) {
            if (ignored instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return false;
        }
    }

    private boolean isSuccessful(int statusCode) {
        return statusCode >= 200 && statusCode < 400;
    }
}
