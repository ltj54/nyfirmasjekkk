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

    public MetadataService(CompanyHistorySnapshotRepository repository) {
        this.repository = repository;
    }

    public MetadataFiltersResponse filters() {
        Set<String> orgForms = new LinkedHashSet<>(OrganizationFormCatalog.displayLabels());
        repository.findDistinctOrganizationForms().stream()
                .map(OrganizationFormCatalog::displayLabelForValue)
                .filter(Objects::nonNull)
                .forEach(orgForms::add);
        List<String> sortedOrgForms = new ArrayList<>(orgForms);
        Collections.sort(sortedOrgForms);

        return new MetadataFiltersResponse(sortedOrgForms);
    }
}
