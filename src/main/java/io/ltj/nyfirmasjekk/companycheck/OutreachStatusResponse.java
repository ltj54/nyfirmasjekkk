package io.ltj.nyfirmasjekk.companycheck;

public record OutreachStatusResponse(
        String orgNumber,
        boolean sent,
        String status,
        String companyName,
        Integer price,
        String channel,
        String offerType,
        String sentAt,
        String note
) {
}
