package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.history.CompanyHistorySnapshotRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class MetadataService {

    private final CompanyHistorySnapshotRepository repository;

    private static final List<String> BASE_ORGANIZATION_FORMS = List.of(
            "AS - Aksjeselskap",
            "ASA - Allmennaksjeselskap",
            "ENK - Enkeltpersonforetak",
            "ANS - Ansvarlig selskap",
            "DA - Selskap med delt ansvar",
            "NUF - Norskregistrert utenlandsk foretak",
            "SA - Samvirkeforetak",
            "STIFT - Stiftelse"
    );

    private static final List<String> BASE_COUNTIES = List.of(
            "Agder", "Akershus", "Buskerud", "Finnmark", "Innlandet",
            "Møre og Romsdal", "Nordland", "Oslo", "Rogaland",
            "Telemark", "Troms", "Trøndelag", "Vestfold", "Vestland", "Østfold"
    );

    private static final List<String> SCORES = List.of("GREEN", "YELLOW", "RED");

    public MetadataService(CompanyHistorySnapshotRepository repository) {
        this.repository = repository;
    }

    public MetadataFiltersResponse filters() {
        Set<String> counties = new LinkedHashSet<>(BASE_COUNTIES);
        counties.addAll(repository.findDistinctCounties());
        List<String> sortedCounties = new ArrayList<>(counties);
        Collections.sort(sortedCounties);

        Set<String> orgForms = new LinkedHashSet<>(BASE_ORGANIZATION_FORMS);
        orgForms.addAll(repository.findDistinctOrganizationForms());
        List<String> sortedOrgForms = new ArrayList<>(orgForms);
        Collections.sort(sortedOrgForms);

        return new MetadataFiltersResponse(sortedOrgForms, sortedCounties, SCORES);
    }
}
