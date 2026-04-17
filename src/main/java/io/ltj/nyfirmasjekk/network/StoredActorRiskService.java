package io.ltj.nyfirmasjekk.network;

import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import io.ltj.nyfirmasjekk.companycheck.ActorRiskService;
import io.ltj.nyfirmasjekk.companycheck.ActorRiskSummary;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class StoredActorRiskService implements ActorRiskService {

    private final CompanyRoleSnapshotRepository repository;

    public StoredActorRiskService(CompanyRoleSnapshotRepository repository) {
        this.repository = repository;
    }

    @Override
    public ActorRiskSummary summarize(String orgNumber, RollerResponse rollerResponse) {
        if (rollerResponse == null || rollerResponse.rollegrupper() == null) {
            return ActorRiskSummary.none();
        }

        List<String> actorKeys = rollerResponse.rollegrupper().stream()
                .filter(Objects::nonNull)
                .flatMap(group -> group.roller() == null ? Stream.empty() : group.roller().stream())
                .filter(Objects::nonNull)
                .filter(this::isActiveRole)
                .map(this::actorKey)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (actorKeys.isEmpty()) {
            return ActorRiskSummary.none();
        }

        Map<String, CompanyRoleSnapshotEntity> relatedCompanies = actorKeys.stream()
                .flatMap(actorKey -> repository.findByActorKeyOrderByCapturedAtDescIdDesc(actorKey).stream())
                .filter(snapshot -> !snapshot.getOrgNumber().equals(orgNumber))
                .collect(Collectors.toMap(
                        CompanyRoleSnapshotEntity::getOrgNumber,
                        snapshot -> snapshot,
                        (left, right) -> left.getCapturedAt().isAfter(right.getCapturedAt()) ? left : right,
                        LinkedHashMap::new
                ));

        int redCompanyCount = (int) relatedCompanies.values().stream()
                .filter(snapshot -> snapshot.getCompanyScoreColor() == TrafficLight.RED)
                .count();
        int yellowCompanyCount = (int) relatedCompanies.values().stream()
                .filter(snapshot -> snapshot.getCompanyScoreColor() == TrafficLight.YELLOW)
                .count();
        int greenCompanyCount = (int) relatedCompanies.values().stream()
                .filter(snapshot -> snapshot.getCompanyScoreColor() == TrafficLight.GREEN)
                .count();

        return new ActorRiskSummary(
                summarizeRisk(redCompanyCount, yellowCompanyCount),
                relatedCompanies.size(),
                redCompanyCount,
                yellowCompanyCount,
                greenCompanyCount
        );
    }

    private TrafficLight summarizeRisk(int redCompanyCount, int yellowCompanyCount) {
        if (redCompanyCount >= 2) {
            return TrafficLight.RED;
        }
        if (redCompanyCount >= 1 || yellowCompanyCount >= 2) {
            return TrafficLight.YELLOW;
        }
        return TrafficLight.GREEN;
    }

    private boolean isActiveRole(RollerResponse.Rolle role) {
        return !Boolean.TRUE.equals(role.fratraadt()) && !Boolean.TRUE.equals(role.avregistrert());
    }

    private String actorKey(RollerResponse.Rolle role) {
        if (role.enhet() != null && role.enhet().organisasjonsnummer() != null && !role.enhet().organisasjonsnummer().isBlank()) {
            return "ORG:" + role.enhet().organisasjonsnummer().trim();
        }
        String actorName = actorName(role);
        if (actorName == null || actorName.isBlank()) {
            return null;
        }
        return "PERSON:" + actorName.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String actorName(RollerResponse.Rolle role) {
        if (role.person() != null && role.person().navn() != null) {
            return Stream.of(
                            role.person().navn().fornavn(),
                            role.person().navn().mellomnavn(),
                            role.person().navn().etternavn()
                    )
                    .filter(Objects::nonNull)
                    .filter(value -> !value.isBlank())
                    .collect(Collectors.joining(" "));
        }
        if (role.enhet() != null && role.enhet().navn() != null && !role.enhet().navn().isEmpty()) {
            return role.enhet().navn().getFirst();
        }
        return null;
    }
}
