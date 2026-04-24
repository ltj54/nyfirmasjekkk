package io.ltj.nyfirmasjekk.companycheck;

public record OutreachStatusResponse(
        String orgNumber,
        boolean sent,
        String companyName,
        Integer price,
        String channel,
        String offerType,
        String sentAt
) {
}
