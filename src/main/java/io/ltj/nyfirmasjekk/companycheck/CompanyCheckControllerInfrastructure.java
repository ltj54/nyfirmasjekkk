package io.ltj.nyfirmasjekk.companycheck;

import io.micrometer.core.instrument.MeterRegistry;
import io.ltj.nyfirmasjekk.api.v1.WebsiteContentInspectionService;
import org.springframework.stereotype.Component;

@Component
public record CompanyCheckControllerInfrastructure(
        AdminAccessService adminAccessService,
        InMemoryRateLimitService rateLimitService,
        MeterRegistry meterRegistry,
        WebsiteContentInspectionService websiteContentInspectionService
) {
}
