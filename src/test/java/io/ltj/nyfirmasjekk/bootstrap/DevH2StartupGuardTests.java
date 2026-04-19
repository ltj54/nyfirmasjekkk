package io.ltj.nyfirmasjekk.bootstrap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DevH2StartupGuardTests {

    @Test
    void shouldGuardOnlyFileBasedH2Urls() {
        assertThat(DevH2StartupGuard.shouldGuard("jdbc:h2:file:./data/nyfirmasjekk-dev;DB_CLOSE_DELAY=-1")).isTrue();
        assertThat(DevH2StartupGuard.shouldGuard("jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1")).isFalse();
        assertThat(DevH2StartupGuard.shouldGuard("jdbc:postgresql://localhost:5432/nyfirmasjekk")).isFalse();
    }

    @Test
    void secondLockAttemptFailsFast(@TempDir Path tempDir) {
        Path lockFile = tempDir.resolve("nyfirmasjekk.lock");
        DevH2StartupGuard firstGuard = new DevH2StartupGuard(lockFile);
        firstGuard.acquire("jdbc:h2:file:./data/nyfirmasjekk-dev;DB_CLOSE_DELAY=-1");

        try {
            DevH2StartupGuard secondGuard = new DevH2StartupGuard(lockFile);
            assertThatThrownBy(() -> secondGuard.acquire("jdbc:h2:file:./data/nyfirmasjekk-dev;DB_CLOSE_DELAY=-1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already running against the local H2 file database");
        } finally {
            firstGuard.release();
        }
    }
}
