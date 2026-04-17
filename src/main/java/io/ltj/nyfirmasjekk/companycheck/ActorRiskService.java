package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.RollerResponse;

@FunctionalInterface
public interface ActorRiskService {
    ActorRiskSummary summarize(String orgNumber, RollerResponse rollerResponse);

    static ActorRiskService noOp() {
        return (orgNumber, rollerResponse) -> ActorRiskSummary.none();
    }
}
