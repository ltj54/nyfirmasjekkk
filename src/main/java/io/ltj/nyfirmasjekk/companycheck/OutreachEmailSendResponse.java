package io.ltj.nyfirmasjekk.companycheck;

public record OutreachEmailSendResponse(
        boolean sent,
        String to,
        String subject,
        OutreachStatusResponse outreachStatus
) {
}
