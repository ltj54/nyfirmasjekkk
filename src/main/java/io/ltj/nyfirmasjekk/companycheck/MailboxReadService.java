package io.ltj.nyfirmasjekk.companycheck;

import jakarta.mail.Folder;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.Store;
import jakarta.mail.UIDFolder;
import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.jsoup.Jsoup;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;

@Service
public class MailboxReadService {
    private static final int MAX_MESSAGES = 25;
    private static final int MAX_BODY_LENGTH = 20_000;

    private final String host;
    private final int port;
    private final String username;
    private final String password;

    public MailboxReadService(
            @Value("${APP_MAIL_IMAP_HOST:mail.ltj-production.no}") String host,
            @Value("${APP_MAIL_IMAP_PORT:993}") int port,
            @Value("${APP_MAIL_USERNAME:kontakt@ltj-production.no}") String username,
            @Value("${APP_MAIL_PASSWORD:}") String password
    ) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
    }

    public List<MailSummary> recent(int requestedLimit) throws MessagingException {
        int limit = Math.clamp(requestedLimit, 1, MAX_MESSAGES);
        try (Store store = openStore()) {
            Folder folder = store.getFolder("INBOX");
            folder.open(Folder.READ_ONLY);
            try {
                int total = folder.getMessageCount();
                List<MailSummary> result = new ArrayList<>();
                for (int number = total; number > Math.max(0, total - limit); number--) {
                    Message message = folder.getMessage(number);
                    result.add(new MailSummary(
                            ((UIDFolder) folder).getUID(message),
                            message.getSubject(),
                            sender(message),
                            receivedAt(message)
                    ));
                }
                return result;
            } finally {
                folder.close(false);
            }
        }
    }

    public MailDetail read(long uid) throws MessagingException, IOException {
        if (uid <= 0) {
            throw new IllegalArgumentException("Ugyldig meldings-ID.");
        }
        try (Store store = openStore()) {
            Folder folder = store.getFolder("INBOX");
            folder.open(Folder.READ_ONLY);
            try {
                Message message = ((UIDFolder) folder).getMessageByUID(uid);
                if (message == null) {
                    return null;
                }
                return new MailDetail(uid, message.getSubject(), sender(message),
                        receivedAt(message), bodyText(message));
            } finally {
                folder.close(false);
            }
        }
    }

    private Store openStore() throws MessagingException {
        if (password == null || password.isBlank()) {
            throw new IllegalStateException("IMAP-passord er ikke konfigurert.");
        }
        Properties properties = new Properties();
        properties.setProperty("mail.store.protocol", "imaps");
        properties.setProperty("mail.imaps.ssl.enable", "true");
        properties.setProperty("mail.imaps.peek", "true");
        properties.setProperty("mail.imaps.connectiontimeout", "5000");
        properties.setProperty("mail.imaps.timeout", "10000");
        Store store = Session.getInstance(properties).getStore("imaps");
        store.connect(host, port, username, password);
        return store;
    }

    private String sender(Message message) throws MessagingException {
        if (message.getFrom() == null || message.getFrom().length == 0) {
            return "Ukjent avsender";
        }
        if (message.getFrom()[0] instanceof InternetAddress address) {
            return address.toUnicodeString();
        }
        return message.getFrom()[0].toString();
    }

    private Instant receivedAt(Message message) throws MessagingException {
        var receivedDate = message.getReceivedDate();
        if (receivedDate != null) {
            return receivedDate.toInstant();
        }
        var sentDate = message.getSentDate();
        return sentDate == null ? null : sentDate.toInstant();
    }

    private String bodyText(Part part) throws MessagingException, IOException {
        if (part.isMimeType("text/plain")) {
            return clipped((String) part.getContent());
        }
        if (part.isMimeType("text/html")) {
            return clipped(Jsoup.parse((String) part.getContent()).text());
        }
        if (part.isMimeType("multipart/*")) {
            Multipart multipart = (Multipart) part.getContent();
            for (int index = 0; index < multipart.getCount(); index++) {
                Part child = multipart.getBodyPart(index);
                if (Part.ATTACHMENT.equalsIgnoreCase(child.getDisposition())) {
                    continue;
                }
                String text = bodyText(child);
                if (!text.isBlank()) {
                    return text;
                }
            }
        }
        return "";
    }

    private String clipped(String text) {
        return text.length() > MAX_BODY_LENGTH ? text.substring(0, MAX_BODY_LENGTH) : text;
    }

    public record MailSummary(long uid, String subject, String from, Instant receivedAt) { }

    public record MailDetail(long uid, String subject, String from, Instant receivedAt, String body) { }
}
