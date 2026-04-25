package io.ltj.nyfirmasjekk.companycheck;

public record OutreachStatusRequest(
        String orgNumber,
        String companyName,
        boolean sent,
        String status,
        Integer price,
        String channel,
        String offerType,
        String note
) {
}
