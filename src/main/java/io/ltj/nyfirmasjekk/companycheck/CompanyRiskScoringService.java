package io.ltj.nyfirmasjekk.companycheck;

import io.ltj.nyfirmasjekk.brreg.EnhetResponse;

import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

public class CompanyRiskScoringService {
    static final int NEW_COMPANY_DAYS = 180;
    private static final List<String> CENTRAL_ORG_FORMS = List.of("AS", "ASA", "NUF", "ANS", "DA", "SA", "STIFT");
    private static final List<String> BUSINESS_REGISTRY_EXPECTED_FORMS = List.of("AS", "ASA", "NUF", "ANS", "DA", "SA");

    private final Clock clock;

    CompanyRiskScoringService(Clock clock) {
        this.clock = clock;
    }

    TrafficLight determineStatus(
            EnhetResponse enhet,
            String organizationFormCode,
            boolean hasRoles,
            boolean bankruptcy,
            boolean forcedDissolution,
            boolean voluntaryDissolution,
            boolean hasFissionOrMerger,
            boolean veryNew,
            ActorRiskSummary actorRisk
    ) {
        int score = calculateScore(enhet, organizationFormCode, hasRoles, bankruptcy, forcedDissolution, voluntaryDissolution, hasFissionOrMerger, actorRisk, veryNew);
        if (bankruptcy || forcedDissolution || actorRisk.riskLevel() == TrafficLight.RED) {
            return TrafficLight.RED;
        }
        if (voluntaryDissolution && !hasFissionOrMerger && !veryNew) {
            return TrafficLight.RED;
        }
        if (isCentralOrganizationForm(enhet) && !hasRoles && !veryNew) {
            return TrafficLight.RED;
        }
        if (veryNew && hasThinData(enhet, hasRoles)) {
            return TrafficLight.YELLOW;
        }
        if (!hasMinimumPositiveStructure(enhet, hasRoles)) {
            return TrafficLight.YELLOW;
        }
        if (score < 80 || actorRisk.riskLevel() == TrafficLight.YELLOW) {
            return TrafficLight.YELLOW;
        }
        return TrafficLight.GREEN;
    }

    int calculateScore(
            EnhetResponse enhet,
            String organizationFormCode,
            boolean hasRoles,
            boolean bankruptcy,
            boolean forcedDissolution,
            boolean voluntaryDissolution,
            boolean hasFissionOrMerger,
            ActorRiskSummary actorRisk,
            boolean veryNew
    ) {
        int score = 100;
        score += OrganizationFormCatalog.scoreAdjustment(organizationFormCode);
        if (bankruptcy) {
            score -= 70;
        }
        if (forcedDissolution) {
            score -= 60;
        }
        if (isCentralOrganizationForm(enhet) && !hasRoles) {
            score -= 50;
        }
        if (actorRisk.riskLevel() == TrafficLight.RED) {
            score -= 40;
        }
        if (actorRisk.riskLevel() == TrafficLight.YELLOW) {
            score -= 15;
        }
        long maturityAge = maturityAgeDays(enhet);
        if (maturityAge < NEW_COMPANY_DAYS) {
            score -= 15;
        }
        if (maturityAge >= NEW_COMPANY_DAYS && !hasText(enhet.sisteInnsendteAarsregnskap())) {
            score -= 10;
        }
        if (hasFissionOrMerger) {
            score -= 5;
        }
        if (voluntaryDissolution && !bankruptcy && !forcedDissolution) {
            score -= 10;
        }
        if (veryNew && !bankruptcy && !forcedDissolution && !(isCentralOrganizationForm(enhet) && !hasRoles) && score < 55) {
            score = 55;
        }
        return Math.clamp(score, 0, 100);
    }

    boolean isCentralOrganizationForm(EnhetResponse enhet) {
        String code = normalizedOrganizationFormCode(enhet);
        return code != null && CENTRAL_ORG_FORMS.contains(code);
    }

    boolean hasThinData(EnhetResponse enhet, boolean hasRoles) {
        int missing = 0;
        if (!hasContactData(enhet)) {
            missing += 1;
        }
        if (enhet.naeringskode1() == null) {
            missing += 1;
        }
        if (!hasText(primaryActivity(enhet))) {
            missing += 1;
        }
        if (isCentralOrganizationForm(enhet) && !hasRoles) {
            missing += 1;
        }
        return missing >= 2;
    }

    boolean hasMinimumPositiveStructure(EnhetResponse enhet, boolean hasRoles) {
        if (shouldExpectBusinessRegistry(enhet) && Boolean.TRUE.equals(enhet.registrertIForetaksregisteret())) {
            return true;
        }
        if (isCentralOrganizationForm(enhet) && hasRoles) {
            return true;
        }
        return hasText(primaryActivity(enhet)) && enhet.naeringskode1() != null && hasContactData(enhet);
    }

    boolean shouldExpectBusinessRegistry(EnhetResponse enhet) {
        String code = normalizedOrganizationFormCode(enhet);
        return code != null && BUSINESS_REGISTRY_EXPECTED_FORMS.contains(code);
    }

    long maturityAgeDays(EnhetResponse enhet) {
        LocalDate registrationDate = enhet.registreringsdatoEnhetsregisteret();
        LocalDate foundationDate = enhet.stiftelsesdato();

        if (registrationDate == null && foundationDate == null) {
            return 9999;
        }
        if (registrationDate == null) {
            return ChronoUnit.DAYS.between(foundationDate, LocalDate.now(clock));
        }
        if (foundationDate == null) {
            return ChronoUnit.DAYS.between(registrationDate, LocalDate.now(clock));
        }

        LocalDate maturityDate = foundationDate.isBefore(registrationDate) ? foundationDate : registrationDate;
        return ChronoUnit.DAYS.between(maturityDate, LocalDate.now(clock));
    }

    String normalizedOrganizationFormCode(EnhetResponse enhet) {
        if (enhet.organisasjonsform() == null) {
            return null;
        }
        String code = OrganizationFormCatalog.normalizeCode(enhet.organisasjonsform().kode());
        if (code != null) {
            return code;
        }
        return OrganizationFormCatalog.normalizeCode(enhet.organisasjonsform().beskrivelse());
    }

    private String primaryActivity(EnhetResponse enhet) {
        return (enhet.aktivitet() != null && !enhet.aktivitet().isEmpty()) ? enhet.aktivitet().getFirst() : null;
    }

    private boolean hasContactData(EnhetResponse enhet) {
        return hasText(enhet.hjemmeside()) || hasText(enhet.epostadresse());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
