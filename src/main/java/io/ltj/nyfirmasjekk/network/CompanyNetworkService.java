package io.ltj.nyfirmasjekk.network;

import io.ltj.nyfirmasjekk.api.v1.NetworkActor;
import io.ltj.nyfirmasjekk.api.v1.NetworkCompanyLink;
import io.ltj.nyfirmasjekk.brreg.RollerResponse;
import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class CompanyNetworkService {

    private final CompanyRoleSnapshotRepository repository;
    private final Clock clock;

    @Autowired
    public CompanyNetworkService(CompanyRoleSnapshotRepository repository) {
        this(repository, Clock.systemDefaultZone());
    }

    CompanyNetworkService(CompanyRoleSnapshotRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public void captureRoles(String orgNumber, String companyName, TrafficLight companyScoreColor, RollerResponse rollerResponse) {
        if (rollerResponse == null || rollerResponse.rollegrupper() == null) {
            return;
        }

        LocalDateTime now = LocalDateTime.now(clock);

        rollerResponse.rollegrupper().stream()
                .filter(Objects::nonNull)
                .flatMap(group -> group.roller() == null ? Stream.empty() : group.roller().stream())
                .filter(Objects::nonNull)
                .filter(this::isActiveRole)
                .map(role -> toEntity(orgNumber, companyName, companyScoreColor, role, now))
                .filter(Objects::nonNull)
                .forEach(repository::save);
    }

    public List<NetworkActor> networkFor(String orgNumber) {
        Map<String, List<CompanyRoleSnapshotEntity>> byActor = repository.findByOrgNumberOrderByCapturedAtDescIdDesc(orgNumber).stream()
                .collect(Collectors.groupingBy(
                        CompanyRoleSnapshotEntity::getActorKey,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        return byActor.entrySet().stream()
                .map(entry -> {
                    String actorKey = entry.getKey();
                    List<CompanyRoleSnapshotEntity> actorEntries = entry.getValue();
                    CompanyRoleSnapshotEntity latest = actorEntries.getFirst();

                    List<String> roleTypesInSelectedCompany = actorEntries.stream()
                            .map(CompanyRoleSnapshotEntity::getRoleType)
                            .distinct()
                            .sorted()
                            .toList();

                    List<NetworkCompanyLink> relatedCompanies = repository.findByActorKeyOrderByCapturedAtDescIdDesc(actorKey).stream()
                            .collect(Collectors.groupingBy(
                                    CompanyRoleSnapshotEntity::getOrgNumber,
                                    LinkedHashMap::new,
                                    Collectors.toList()
                            ))
                            .values().stream()
                            .map(companyEntries -> {
                                CompanyRoleSnapshotEntity latestCompanyEntry = companyEntries.getFirst();
                                return new NetworkCompanyLink(
                                        latestCompanyEntry.getOrgNumber(),
                                        latestCompanyEntry.getCompanyName(),
                                        companyEntries.stream()
                                                .map(CompanyRoleSnapshotEntity::getRoleType)
                                                .distinct()
                                                .sorted()
                                                .toList(),
                                        latestCompanyEntry.getCompanyScoreColor(),
                                        latestCompanyEntry.getCapturedAt()
                                );
                            })
                            .sorted(Comparator.comparing(NetworkCompanyLink::lastSeenAt).reversed())
                            .toList();

                    int redCompanyCount = (int) relatedCompanies.stream().filter(link -> link.scoreColor() == TrafficLight.RED).count();
                    int yellowCompanyCount = (int) relatedCompanies.stream().filter(link -> link.scoreColor() == TrafficLight.YELLOW).count();
                    int greenCompanyCount = (int) relatedCompanies.stream().filter(link -> link.scoreColor() == TrafficLight.GREEN).count();

                    return new NetworkActor(
                            actorKey,
                            latest.getActorName(),
                            roleTypesInSelectedCompany,
                            actorRiskLevel(redCompanyCount, yellowCompanyCount, greenCompanyCount),
                            relatedCompanies.size(),
                            redCompanyCount,
                            yellowCompanyCount,
                            greenCompanyCount,
                            relatedCompanies
                    );
                })
                .sorted(Comparator.comparing(NetworkActor::actorName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private CompanyRoleSnapshotEntity toEntity(
            String orgNumber,
            String companyName,
            TrafficLight companyScoreColor,
            RollerResponse.Rolle role,
            LocalDateTime capturedAt
    ) {
        String actorName = actorName(role);
        String actorKey = actorKey(role, actorName);
        String roleType = roleType(role);

        if (actorName == null || actorKey == null || roleType == null) {
            return null;
        }

        CompanyRoleSnapshotEntity entity = new CompanyRoleSnapshotEntity();
        entity.setOrgNumber(orgNumber);
        entity.setCompanyName(companyName);
        entity.setActorKey(actorKey);
        entity.setActorName(actorName);
        entity.setRoleType(roleType);
        entity.setCompanyScoreColor(companyScoreColor);
        entity.setActive(true);
        entity.setCapturedAt(capturedAt);
        return entity;
    }

    private boolean isActiveRole(RollerResponse.Rolle role) {
        return !Boolean.TRUE.equals(role.fratraadt()) && !Boolean.TRUE.equals(role.avregistrert());
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

    private String actorKey(RollerResponse.Rolle role, String actorName) {
        if (role.enhet() != null && role.enhet().organisasjonsnummer() != null && !role.enhet().organisasjonsnummer().isBlank()) {
            return "ORG:" + role.enhet().organisasjonsnummer().trim();
        }
        if (actorName == null || actorName.isBlank()) {
            return null;
        }
        return "PERSON:" + actorName.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String roleType(RollerResponse.Rolle role) {
        if (role.type() == null || role.type().beskrivelse() == null || role.type().beskrivelse().isBlank()) {
            return null;
        }
        String normalized = role.type().beskrivelse().toUpperCase(Locale.ROOT);
        if (normalized.contains("DAGLIG")) {
            return "DAGLIG_LEDER";
        }
        if (normalized.contains("STYRELEDER")) {
            return "STYRELEDER";
        }
        if (normalized.contains("STYRE")) {
            return "STYREMEDLEM";
        }
        if (normalized.contains("SIGNATUR")) {
            return "SIGNATUR";
        }
        if (normalized.contains("PROKURA")) {
            return "PROKURA";
        }
        return normalized.replaceAll("[^A-Z0-9]+", "_");
    }

    private TrafficLight actorRiskLevel(int redCompanyCount, int yellowCompanyCount, int greenCompanyCount) {
        if (redCompanyCount > 0) {
            return TrafficLight.RED;
        }
        if (yellowCompanyCount > 0) {
            return TrafficLight.YELLOW;
        }
        if (greenCompanyCount > 0) {
            return TrafficLight.GREEN;
        }
        return TrafficLight.YELLOW;
    }
}
