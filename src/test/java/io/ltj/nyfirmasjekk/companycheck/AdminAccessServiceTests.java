package io.ltj.nyfirmasjekk.companycheck;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AdminAccessServiceTests {
    @Test
    void allowsLocalModeOnlyOnLoopback() {
        AdminAccessService access = new AdminAccessService("", "127.0.0.1");
        assertDoesNotThrow(() -> access.requireAdmin(null));
        assertThrows(IllegalStateException.class, () -> new AdminAccessService("", "0.0.0.0"));
        assertThrows(IllegalStateException.class, () -> new AdminAccessService("", ""));
    }

    @Test
    void requiresConfiguredTokenWhenBoundBeyondLoopback() {
        AdminAccessService access = new AdminAccessService("private-test-token", "0.0.0.0");
        assertThrows(ResponseStatusException.class, () -> access.requireAdmin(null));
        assertThrows(ResponseStatusException.class, () -> access.requireAdmin("wrong"));
        assertDoesNotThrow(() -> access.requireAdmin("private-test-token"));
    }
}
