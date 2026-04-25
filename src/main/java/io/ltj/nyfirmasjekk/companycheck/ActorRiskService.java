package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import org.springframework.stereotype.Service;

@FunctionalInterface
public interface ActorRiskService {
    ActorRiskSummary summarize(String orgNumber, RollerResponse rollerResponse);

    static ActorRiskService noOp() {
        return (orgNumber, rollerResponse) -> ActorRiskSummary.none();
    }

    @Service
    class NoOpActorRiskService implements ActorRiskService {
        @Override
        public ActorRiskSummary summarize(String orgNumber, RollerResponse rollerResponse) {
            return ActorRiskSummary.none();
        }
    }
}
