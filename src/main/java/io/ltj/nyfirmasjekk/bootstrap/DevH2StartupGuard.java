package io.ltj.nyfirmasjekk.bootstrap;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.channels.OverlappingFileLockException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.Locale;

import org.springframework.boot.context.event.ApplicationPreparedEvent;
import org.springframework.context.ApplicationListener;

public final class DevH2StartupGuard implements ApplicationListener<ApplicationPreparedEvent> {

    private static final String H2_FILE_PREFIX = "jdbc:h2:file:";
    private static final Path DEFAULT_LOCK_FILE = Paths.get("data", "nyfirmasjekk-dev.lock");

    private final Path lockFile;

    private FileChannel lockChannel;
    private FileLock lock;

    public DevH2StartupGuard() {
        this(DEFAULT_LOCK_FILE);
    }

    public DevH2StartupGuard(Path lockFile) {
        this.lockFile = lockFile;
    }

    @Override
    public void onApplicationEvent(ApplicationPreparedEvent event) {
        String datasourceUrl = event.getApplicationContext().getEnvironment().getProperty("spring.datasource.url");
        if (!shouldGuard(datasourceUrl)) {
            return;
        }
        acquire(datasourceUrl);
    }

    static boolean shouldGuard(String datasourceUrl) {
        return datasourceUrl != null
                && datasourceUrl.trim().toLowerCase(Locale.ROOT).startsWith(H2_FILE_PREFIX);
    }

    void acquire(String datasourceUrl) {
        synchronized (this) {
            if (lock != null && lock.isValid()) {
                return;
            }

            try {
                Path parent = lockFile.getParent();
                if (parent != null) {
                    Files.createDirectories(parent);
                }

                lockChannel = FileChannel.open(lockFile, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                try {
                    lock = lockChannel.tryLock();
                } catch (OverlappingFileLockException ex) {
                    lock = null;
                }

                if (lock == null) {
                    release();
                    throw new IllegalStateException(buildLockMessage(datasourceUrl));
                }

                writeLockMetadata(datasourceUrl);
            } catch (IOException ex) {
                release();
                throw new IllegalStateException("Failed to acquire the dev startup lock at " + lockFile.toAbsolutePath(), ex);
            }
        }
    }

    void release() {
        synchronized (this) {
            if (lock != null) {
                try {
                    lock.release();
                } catch (IOException ignored) {
                    // Best effort cleanup.
                } finally {
                    lock = null;
                }
            }

            if (lockChannel != null) {
                try {
                    lockChannel.close();
                } catch (IOException ignored) {
                    // Best effort cleanup.
                } finally {
                    lockChannel = null;
                }
            }
        }
    }

    private void writeLockMetadata(String datasourceUrl) throws IOException {
        String metadata = "pid=" + ProcessHandle.current().pid()
                + System.lineSeparator()
                + "startedAt=" + Instant.now()
                + System.lineSeparator()
                + "datasourceUrl=" + datasourceUrl
                + System.lineSeparator();

        ByteBuffer buffer = StandardCharsets.UTF_8.encode(metadata);
        lockChannel.position(0);
        lockChannel.truncate(0);
        while (buffer.hasRemaining()) {
            lockChannel.write(buffer);
        }
        lockChannel.force(true);
    }

    private String buildLockMessage(String datasourceUrl) {
        return "nyfirmasjekk is already running against the local H2 file database."
                + System.lineSeparator()
                + "Stop the existing backend process before starting a new dev instance."
                + System.lineSeparator()
                + "Datasource: " + datasourceUrl
                + System.lineSeparator()
                + "Lock file: " + lockFile.toAbsolutePath();
    }
}
