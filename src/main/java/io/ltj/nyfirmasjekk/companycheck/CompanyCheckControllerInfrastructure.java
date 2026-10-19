package io.ltj.nyfirmasjekk.companycheck;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

@Component
public record CompanyCheckControllerInfrastructure(
        AdminAccessService adminAccessService,
        InMemoryRateLimitService rateLimitService,
        MeterRegistry meterRegistry,
        WebsiteAvailabilityService websiteAvailabilityService,
        WebsiteLeadBatchLogService websiteLeadBatchLogService
) {
}
