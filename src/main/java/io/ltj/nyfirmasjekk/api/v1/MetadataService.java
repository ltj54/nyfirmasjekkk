package io.ltj.nyfirmasjekk.api.v1;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MetadataService {

    private static final List<String> ORGANIZATION_FORMS = List.of("AS", "ENK", "ASA", "SA", "ANS", "DA", "NUF");
    private static final List<String> COUNTIES = List.of(
            "Agder",
            "Akershus",
            "Buskerud",
            "Finnmark",
            "Innlandet",
            "Møre og Romsdal",
            "Nordland",
            "Oslo",
            "Rogaland",
            "Telemark",
            "Troms",
            "Trøndelag",
            "Vestfold",
            "Vestland",
            "Østfold"
    );
    private static final List<String> SCORES = List.of("GREEN", "YELLOW", "RED");

    public MetadataFiltersResponse filters() {
        return new MetadataFiltersResponse(ORGANIZATION_FORMS, COUNTIES, SCORES);
    }
}
