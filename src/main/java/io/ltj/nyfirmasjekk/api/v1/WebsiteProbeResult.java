package io.ltj.nyfirmasjekk.api.v1;

public record WebsiteProbeResult(boolean reachable, String reasonCode, Integer httpStatus) {
}
