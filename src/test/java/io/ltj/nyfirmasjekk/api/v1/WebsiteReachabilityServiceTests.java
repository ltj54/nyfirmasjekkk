package io.ltj.nyfirmasjekk.api.v1;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class WebsiteReachabilityServiceTests {
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void proverGetNarHeadIkkeErVellykket() throws IOException {
        startServer(exchange -> {
            if ("HEAD".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(404, -1);
                return;
            }
            send(exchange, 200, "ok");
        });

        assertThat(new WebsiteReachabilityService().isReachable(serverUrl())).isTrue();
    }

    @Test
    void regnerBlokkertMenSvarendeNettsideSomReachable() throws IOException {
        startServer(exchange -> send(exchange, 403, "blocked"));

        assertThat(new WebsiteReachabilityService().isReachable(serverUrl())).isTrue();
    }

    @Test
    void returnererFalseNarBadeHeadOgGetFeiler() throws IOException {
        startServer(exchange -> send(exchange, 404, "not found"));

        assertThat(new WebsiteReachabilityService().isReachable(serverUrl())).isFalse();
    }

    private void startServer(ExchangeHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/", handler::handle);
        server.start();
    }

    private String serverUrl() {
        return "http://localhost:" + server.getAddress().getPort() + "/";
    }

    private static void send(HttpExchange exchange, int statusCode, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    @FunctionalInterface
    private interface ExchangeHandler {
        void handle(HttpExchange exchange) throws IOException;
    }
}
