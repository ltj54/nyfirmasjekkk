package io.ltj.nyfirmasjekk.companycheck;

public record OutreachEmailSendRequest(
        String to,
        String subject,
        String body,
        String htmlBody,
        String companyName,
        String organizationForm,
        Integer price,
        String channel,
        String offerType,
        String note
) {
}
