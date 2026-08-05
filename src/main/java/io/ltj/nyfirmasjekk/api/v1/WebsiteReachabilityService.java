package io.ltj.nyfirmasjekk.api.v1;

import org.springframework.beans.factory.annotation.Autowired;
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
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();
    private final boolean allowPrivateTargets;

    @Autowired
    public WebsiteReachabilityService() {
        this(false);
    }

    WebsiteReachabilityService(boolean allowPrivateTargets) {
        this.allowPrivateTargets = allowPrivateTargets;
    }

    @Cacheable(value = "websiteReachability", key = "#url")
    public boolean isReachable(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }

        try {
            var headResponse = sendFollowingSafeRedirects(url, "HEAD");

            if (isReachableStatus(headResponse.statusCode())) {
                return true;
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException | IllegalArgumentException exception) {
            // HEAD is not consistently supported; retry with GET below.
        }

        try {
            var getResponse = sendFollowingSafeRedirects(url, "GET");
            return isReachableStatus(getResponse.statusCode());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return false;
        } catch (IOException | IllegalArgumentException exception) {
            return false;
        }
    }

    private HttpResponse<Void> sendFollowingSafeRedirects(String value, String method) throws IOException, InterruptedException {
        URI current = SafeWebTargetPolicy.requireHttpUri(value, allowPrivateTargets);
        for (int redirect = 0; redirect <= 5; redirect++) {
            HttpRequest.Builder builder = HttpRequest.newBuilder(current)
                    .timeout(REQUEST_TIMEOUT)
                    .header("User-Agent", USER_AGENT)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            HttpRequest request = "HEAD".equals(method)
                    ? builder.method("HEAD", HttpRequest.BodyPublishers.noBody()).build()
                    : builder.GET().build();
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() < 300 || response.statusCode() >= 400) {
                return response;
            }
            String location = response.headers().firstValue("location")
                    .orElseThrow(() -> new IOException("Redirect mangler Location-header."));
            current = SafeWebTargetPolicy.requireHttpUri(current.resolve(location).toString(), allowPrivateTargets);
        }
        throw new IOException("For mange redirects.");
    }

    private boolean isReachableStatus(int statusCode) {
        return (statusCode >= 200 && statusCode < 400) || statusCode == 401 || statusCode == 403 || statusCode == 429;
    }
}
