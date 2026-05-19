package io.ltj.nyfirmasjekk.companycheck;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Service
public class AdminAccessService {
    private final String adminToken;

    public AdminAccessService(@Value("${company-check.admin-token:}") String adminToken) {
        this.adminToken = adminToken == null ? "" : adminToken.trim();
    }

    public void requireAdmin(String providedToken) {
        if (adminToken.isBlank()) {
            return;
        }
        if (providedToken == null || !constantTimeEquals(adminToken, providedToken.trim())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Admin-token mangler eller er ugyldig.");
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] expectedHash = digest.digest(expected.getBytes(StandardCharsets.UTF_8));
            byte[] actualHash = digest.digest(actual.getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(expectedHash, actualHash);
        } catch (NoSuchAlgorithmException exception) {
            return expected.equals(actual);
        }
    }
}
