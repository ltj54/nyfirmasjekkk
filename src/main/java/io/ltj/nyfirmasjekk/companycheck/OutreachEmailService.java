package io.ltj.nyfirmasjekk.companycheck;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.AddressException;
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
import java.util.Set;

@Service
public class OutreachEmailService {
    private static final String SENDER_ORGANIZATION_NUMBER = "Org.nr. 838 632 122";
    private static final String SENDER_WEBSITE = "https://www.ltj-production.no/";
    private static final String SENDER_SIGNATURE = "Med vennlig hilsen\n"
            + "  Lars Johannessen\n"
            + "  " + SENDER_WEBSITE + "\n"
            + "  977 24 209\n"
            + "  kontakt@ltj-production.no\n"
            + "  " + SENDER_ORGANIZATION_NUMBER;
    private static final String SENDER_SIGNATURE_HTML = "<p>Med vennlig hilsen<br>"
            + "&nbsp;&nbsp;Lars Johannessen<br>"
            + "&nbsp;&nbsp;<a href=\"" + SENDER_WEBSITE + "\">" + SENDER_WEBSITE + "</a><br>"
            + "&nbsp;&nbsp;977 24 209<br>"
            + "&nbsp;&nbsp;kontakt@ltj-production.no<br>"
            + "&nbsp;&nbsp;" + SENDER_ORGANIZATION_NUMBER + "</p>";
    private static final Set<String> APPROVED_WEBSITE_EMAIL_EVIDENCE = Set.of(
            "WEAK_CONTACT_POINT",
            "CONTACT_DETAILS_NOT_VISIBLE",
            "MISSING_PRIVACY_NOTICE",
            "CRAWL_FORM_PRIVACY_REVIEW",
            "MISSING_ORG_NUMBER",
            "MISSING_OPENING_HOURS",
            "MISSING_ABOUT_SECTION",
            "MISSING_HTTPS"
    );
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String from;
    private final String fromName;
    private final String replyTo;
    private final String testRecipient;

    public OutreachEmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${APP_MAIL_FROM:kontakt@ltj-production.no}") String from,
            @Value("${APP_MAIL_FROM_NAME:Lars Johannessen}") String fromName,
            @Value("${APP_MAIL_REPLY_TO:kontakt@ltj-production.no}") String replyTo,
            @Value("${APP_MAIL_TEST_RECIPIENT:}") String testRecipient
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
            String plainBody = withSenderSignature(request.body());
            helper.setText(plainBody, htmlOrPlain(request, plainBody));
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

    String htmlOrPlain(OutreachEmailSendRequest request, String plainBody) {
        if (request.htmlBody() == null || request.htmlBody().isBlank()) {
            return plainBody.replace("  ", "&nbsp;&nbsp;").replace("\n", "<br>");
        }
        String htmlBody = request.htmlBody().trim();
        if (htmlBody.contains(SENDER_WEBSITE) && htmlBody.contains(SENDER_ORGANIZATION_NUMBER)) {
            return htmlBody;
        }
        int signoffIndex = htmlBody.lastIndexOf("Med vennlig hilsen");
        int paragraphStart = htmlBody.lastIndexOf("<p", signoffIndex);
        int paragraphEnd = htmlBody.indexOf("</p>", signoffIndex);
        if (signoffIndex >= 0 && paragraphStart >= 0 && paragraphEnd >= 0) {
            return htmlBody.substring(0, paragraphStart) + SENDER_SIGNATURE_HTML + htmlBody.substring(paragraphEnd + 4);
        }
        return htmlBody + SENDER_SIGNATURE_HTML;
    }

    static String withSenderSignature(String body) {
        String trimmed = body.replace("\r\n", "\n").stripTrailing();
        int signoffIndex = trimmed.lastIndexOf("\nMed vennlig hilsen");
        String content = signoffIndex >= 0 ? trimmed.substring(0, signoffIndex).stripTrailing() : trimmed;
        return content + "\n\n" + SENDER_SIGNATURE;
    }

    void validate(OutreachEmailSendRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mangler e-postdata.");
        }
        if (!isValidEmailAddress(request.to())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mottakeradresse mangler eller er ugyldig.");
        }
        if (request.subject() == null || request.subject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Emne mangler.");
        }
        if (request.body() == null || request.body().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mailtekst mangler.");
        }
        if ("website-registered-review".equals(request.offerType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registrert nettside må vurderes manuelt før utsending.");
        }
        if ("website-improvement-offer".equals(request.offerType())
                && (request.evidenceCode() == null || !APPROVED_WEBSITE_EMAIL_EVIDENCE.contains(request.evidenceCode()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nettsidemail krever et konkret, godkjent funn.");
        }
    }

    private boolean isValidEmailAddress(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        try {
            InternetAddress address = new InternetAddress(value, true);
            address.validate();
            return value.equals(address.getAddress());
        } catch (AddressException exception) {
            return false;
        }
    }
}
