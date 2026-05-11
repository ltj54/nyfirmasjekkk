package io.ltj.nyfirmasjekk.companycheck;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

@Service
public class OutreachEmailService {
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String from;
    private final String fromName;
    private final String replyTo;
    private final String testRecipient;

    public OutreachEmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${company-check.mail.from}") String from,
            @Value("${company-check.mail.from-name}") String fromName,
            @Value("${company-check.mail.reply-to}") String replyTo,
            @Value("${company-check.mail.test-recipient:}") String testRecipient
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.from = from;
        this.fromName = fromName;
        this.replyTo = replyTo;
        this.testRecipient = testRecipient;
    }

    public String send(OutreachEmailSendRequest request) {
        validate(request);
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP er ikke konfigurert.");
        }

        String recipient = effectiveRecipient(request);
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(from, fromName, StandardCharsets.UTF_8.name()));
            helper.setReplyTo(replyTo);
            helper.setTo(recipient);
            helper.setSubject(request.subject().trim());
            helper.setText(request.body().trim(), htmlOrPlain(request));
            mailSender.send(message);
            return recipient;
        } catch (MessagingException | UnsupportedEncodingException | MailException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Klarte ikke sende e-post via SMTP.", exception);
        }
    }

    private String effectiveRecipient(OutreachEmailSendRequest request) {
        if (testRecipient != null && !testRecipient.isBlank()) {
            return testRecipient.trim();
        }
        return request.to().trim();
    }

    private String htmlOrPlain(OutreachEmailSendRequest request) {
        if (request.htmlBody() == null || request.htmlBody().isBlank()) {
            return request.body().trim().replace("\n", "<br>");
        }
        return request.htmlBody().trim();
    }

    private void validate(OutreachEmailSendRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mangler e-postdata.");
        }
        if (request.to() == null || !request.to().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mottakeradresse mangler eller er ugyldig.");
        }
        if (request.subject() == null || request.subject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Emne mangler.");
        }
        if (request.body() == null || request.body().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mailtekst mangler.");
        }
    }
}
