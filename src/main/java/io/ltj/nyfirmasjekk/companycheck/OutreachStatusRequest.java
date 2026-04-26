package io.ltj.nyfirmasjekk.companycheck;

public record OutreachStatusRequest(
        String orgNumber,
        String companyName,
        String organizationForm,
        boolean sent,
        String status,
        Integer price,
        String channel,
        String offerType,
        String note
) {
}
