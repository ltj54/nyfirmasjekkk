package io.ltj.nyfirmasjekk.api.v1;

public record Announcement(
        String type,
        String title,
        String date,
        String source
) {
}
