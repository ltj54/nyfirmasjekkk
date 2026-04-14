package io.ltj.nyfirmasjekk.api.v1;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MetadataService {

    private static final List<String> ORGANIZATION_FORMS = List.of(
            "AS - Aksjeselskap",
            "ASA - Allmennaksjeselskap",
            "ENK - Enkeltpersonforetak",
            "ANS - Ansvarlig selskap",
            "DA - Selskap med delt ansvar",
            "NUF - Norskregistrert utenlandsk foretak",
            "SA - Samvirkeforetak",
            "STIFT - Stiftelse",
            "IKS - Interkommunalt selskap",
            "KF - Kommunalt foretak",
            "FKF - Fylkeskommunalt foretak",
            "FORE - Forening/lag/innretning",
            "SE - Europeisk selskap",
            "BA - Selskap med begrenset ansvar",
            "ORGL - Organisasjonsledd",
            "ESEK - Eierseksjonssameie",
            "BO - Dødsbo"
    );
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
