package io.ltj.nyfirmasjekk.companycheck;

public record OutreachStatusResponse(
        String orgNumber,
        boolean sent,
        String status,
        String companyName,
        String organizationForm,
        Integer price,
        String channel,
        String offerType,
        String sentAt,
        String note
) {
}
