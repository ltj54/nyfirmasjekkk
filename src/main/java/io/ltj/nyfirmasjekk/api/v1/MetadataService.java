package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.history.CompanyHistorySnapshotRepository;
import io.ltj.nyfirmasjekk.companycheck.OrganizationFormCatalog;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class MetadataService {

    private final CompanyHistorySnapshotRepository repository;

    private static final List<String> BASE_COUNTIES = List.of(
            "Agder", "Akershus", "Buskerud", "Finnmark", "Innlandet",
            "Møre og Romsdal", "Nordland", "Oslo", "Rogaland",
            "Telemark", "Troms", "Trøndelag", "Vestfold", "Vestland", "Østfold"
    );

    private static final List<String> SCORES = List.of("GREEN", "YELLOW", "RED");
    private static final List<String> STRUCTURE_SIGNALS = List.of(
            "NEW_COMPANY_WINDOW",
            "LIMITED_DATA_PATTERN",
            "BO_SIGNAL",
            "BANKRUPTCY_SIGNAL",
            "DISSOLUTION_SIGNAL",
            "ACTOR_RISK_PATTERN",
            "POSSIBLE_REORGANIZATION"
    );

    public MetadataService(CompanyHistorySnapshotRepository repository) {
        this.repository = repository;
    }

    public MetadataFiltersResponse filters() {
        Set<String> counties = new LinkedHashSet<>(BASE_COUNTIES);
        counties.addAll(repository.findDistinctCounties());
        List<String> sortedCounties = new ArrayList<>(counties);
        Collections.sort(sortedCounties);

        Set<String> orgForms = new LinkedHashSet<>(OrganizationFormCatalog.displayLabels());
        repository.findDistinctOrganizationForms().stream()
                .map(OrganizationFormCatalog::displayLabelForValue)
                .filter(Objects::nonNull)
                .forEach(orgForms::add);
        List<String> sortedOrgForms = new ArrayList<>(orgForms);
        Collections.sort(sortedOrgForms);

        return new MetadataFiltersResponse(sortedOrgForms, sortedCounties, SCORES, STRUCTURE_SIGNALS);
    }
}
