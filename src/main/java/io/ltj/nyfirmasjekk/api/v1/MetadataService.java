package io.ltj.nyfirmasjekk.api.v1;

import io.ltj.nyfirmasjekk.companycheck.OrganizationFormCatalog;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class MetadataService {

    public MetadataFiltersResponse filters() {
        List<String> sortedOrgForms = new ArrayList<>(OrganizationFormCatalog.displayLabels());
        Collections.sort(sortedOrgForms);

        return new MetadataFiltersResponse(sortedOrgForms);
    }
}
