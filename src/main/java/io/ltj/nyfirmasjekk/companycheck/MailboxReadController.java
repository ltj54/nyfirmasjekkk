package io.ltj.nyfirmasjekk.companycheck;

import jakarta.mail.MessagingException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@RestController
@RequestMapping("/api/mailbox")
public class MailboxReadController {
    private final MailboxReadService mailbox;
    private final String accessToken;

    public MailboxReadController(MailboxReadService mailbox,
                                 @Value("${APP_MAIL_READ_TOKEN:}") String accessToken) {
        this.mailbox = mailbox;
        this.accessToken = accessToken;
    }

    @PostMapping("/recent")
    public ResponseEntity<List<MailboxReadService.MailSummary>> recent(
            @RequestParam(defaultValue = "10") int limit,
            @RequestHeader(value = "X-Mailbox-Token", required = false) String suppliedToken,
            HttpServletRequest request) {
        requireAccess(suppliedToken, request);
        try {
            return ResponseEntity.ok().header("Cache-Control", "no-store").body(mailbox.recent(limit));
        } catch (MessagingException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Kunne ikke lese postkassen.", exception);
        }
    }

    @PostMapping("/message/{uid}")
    public ResponseEntity<MailboxReadService.MailDetail> message(
            @PathVariable long uid,
            @RequestHeader(value = "X-Mailbox-Token", required = false) String suppliedToken,
            HttpServletRequest request) {
        requireAccess(suppliedToken, request);
        try {
            MailboxReadService.MailDetail detail = mailbox.read(uid);
            if (detail == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok().header("Cache-Control", "no-store").body(detail);
        } catch (MessagingException | IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Kunne ikke lese meldingen.", exception);
        }
    }

    private void requireAccess(String suppliedToken, HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (!"127.0.0.1".equals(remote) && !"0:0:0:0:0:0:0:1".equals(remote) && !"::1".equals(remote)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Postkassen er kun tilgjengelig lokalt.");
        }
        if (accessToken == null || accessToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Lesetilgang er ikke konfigurert.");
        }
        if (suppliedToken == null || !MessageDigest.isEqual(
                accessToken.getBytes(StandardCharsets.UTF_8),
                suppliedToken.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ugyldig tilgangsnøkkel.");
        }
    }
}
