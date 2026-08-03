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
            RiskEvaluation evaluation
    ) {
        int score = calculateScore(enhet, evaluation);
        if (evaluation.bankruptcy() || evaluation.forcedDissolution() || evaluation.actorRisk().riskLevel() == TrafficLight.RED) {
            return TrafficLight.RED;
        }
        if (evaluation.voluntaryDissolution() && !evaluation.hasFissionOrMerger() && !evaluation.veryNew()) {
            return TrafficLight.RED;
        }
        if (isCentralOrganizationForm(enhet) && !evaluation.hasRoles() && !evaluation.veryNew()) {
            return TrafficLight.RED;
        }
        if (evaluation.veryNew() && hasThinData(enhet, evaluation.hasRoles())) {
            return TrafficLight.YELLOW;
        }
        if (!hasMinimumPositiveStructure(enhet, evaluation.hasRoles())) {
            return TrafficLight.YELLOW;
        }
        if (score < 80 || evaluation.actorRisk().riskLevel() == TrafficLight.YELLOW) {
            return TrafficLight.YELLOW;
        }
        return TrafficLight.GREEN;
    }

    int calculateScore(
            EnhetResponse enhet,
            RiskEvaluation evaluation
    ) {
        int score = 100;
        score += OrganizationFormCatalog.scoreAdjustment(evaluation.organizationFormCode());
        score += riskScoreAdjustment(enhet, evaluation);
        score += maturityScoreAdjustment(enhet);
        score += lifecycleScoreAdjustment(evaluation);
        if (shouldApplyNewCompanyFloor(enhet, evaluation, score)) {
            score = 55;
        }
        return Math.clamp(score, 0, 100);
    }

    private int riskScoreAdjustment(EnhetResponse enhet, RiskEvaluation evaluation) {
        int adjustment = 0;
        if (evaluation.bankruptcy()) {
            adjustment -= 70;
        }
        if (evaluation.forcedDissolution()) {
            adjustment -= 60;
        }
        if (isCentralOrganizationForm(enhet) && !evaluation.hasRoles()) {
            adjustment -= 50;
        }
        if (evaluation.actorRisk().riskLevel() == TrafficLight.RED) {
            adjustment -= 40;
        }
        if (evaluation.actorRisk().riskLevel() == TrafficLight.YELLOW) {
            adjustment -= 15;
        }
        return adjustment;
    }

    private int maturityScoreAdjustment(EnhetResponse enhet) {
        long maturityAge = maturityAgeDays(enhet);
        if (maturityAge < NEW_COMPANY_DAYS) {
            return -15;
        }
        if (!hasText(enhet.sisteInnsendteAarsregnskap())) {
            return -10;
        }
        return 0;
    }

    private int lifecycleScoreAdjustment(RiskEvaluation evaluation) {
        int adjustment = 0;
        if (evaluation.hasFissionOrMerger()) {
            adjustment -= 5;
        }
        if (evaluation.voluntaryDissolution() && !evaluation.bankruptcy() && !evaluation.forcedDissolution()) {
            adjustment -= 10;
        }
        return adjustment;
    }

    private boolean shouldApplyNewCompanyFloor(
            EnhetResponse enhet,
            RiskEvaluation evaluation,
            int score
    ) {
        return evaluation.veryNew()
                && !evaluation.bankruptcy()
                && !evaluation.forcedDissolution()
                && !(isCentralOrganizationForm(enhet) && !evaluation.hasRoles())
                && score < 55;
    }

    record RiskEvaluation(
            String organizationFormCode,
            boolean hasRoles,
            boolean bankruptcy,
            boolean forcedDissolution,
            boolean voluntaryDissolution,
            boolean hasFissionOrMerger,
            boolean veryNew,
            ActorRiskSummary actorRisk
    ) {
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
