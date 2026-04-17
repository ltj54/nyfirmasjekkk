package io.ltj.nyfirmasjekk.history;

import io.ltj.nyfirmasjekk.api.v1.CompanyHistoryEntry;
import io.ltj.nyfirmasjekk.companycheck.CompanyCheck;
import io.ltj.nyfirmasjekk.companycheck.CompanyFacts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class CompanyHistoryService {

    private final CompanyHistorySnapshotRepository repository;
    private final Clock clock;

    @Autowired
    public CompanyHistoryService(CompanyHistorySnapshotRepository repository) {
        this(repository, Clock.systemDefaultZone());
    }

    CompanyHistoryService(CompanyHistorySnapshotRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public void captureSnapshot(CompanyCheck companyCheck) {
        CompanyFacts facts = companyCheck.fakta();

        CompanyHistorySnapshotEntity entity = new CompanyHistorySnapshotEntity();
        entity.setOrgNumber(companyCheck.organisasjonsnummer());
        entity.setName(companyCheck.navn());
        entity.setOrganizationForm(companyCheck.organisasjonsform());
        entity.setScoreColor(companyCheck.status());
        entity.setSummary(companyCheck.sammendrag());
        entity.setMunicipality(extractMunicipality(facts));
        entity.setCounty(null);
        entity.setNaceCode(facts == null ? null : facts.naeringskode());
        entity.setLatestAnnualAccountsYear(facts == null ? null : facts.sisteInnsendteAarsregnskap());
        entity.setVatRegistered(facts == null ? null : facts.registrertIMvaregisteret());
        entity.setRegisteredInBusinessRegistry(facts == null ? null : facts.registrertIForetaksregisteret());
        entity.setHasContactData(facts != null && facts.harKontaktdata());
        entity.setHasRoles(facts != null && facts.harRoller());
        entity.setHasSeriousSignals(facts != null && facts.harAlvorligeSignal());
        entity.setRegistrationDate(facts == null ? null : facts.registreringsdato());
        entity.setCapturedAt(LocalDateTime.now(clock));

        repository.save(entity);
    }

    public List<CompanyHistoryEntry> historyFor(String orgNumber) {
        return repository.findTop50ByOrgNumberOrderByCapturedAtDesc(orgNumber).stream()
                .map(entity -> new CompanyHistoryEntry(
                        entity.getCapturedAt(),
                        entity.getOrgNumber(),
                        entity.getName(),
                        entity.getOrganizationForm(),
                        entity.getScoreColor().name(),
                        entity.getSummary(),
                        entity.getMunicipality(),
                        entity.getCounty(),
                        entity.getNaceCode(),
                        entity.getLatestAnnualAccountsYear(),
                        entity.getVatRegistered(),
                        entity.getRegisteredInBusinessRegistry(),
                        entity.getHasContactData(),
                        entity.getHasRoles(),
                        entity.getHasSeriousSignals(),
                        entity.getRegistrationDate()
                ))
                .toList();
    }

    private String extractMunicipality(CompanyFacts facts) {
        if (facts == null || facts.lokasjon() == null || facts.lokasjon().isBlank()) {
            return null;
        }
        int start = facts.lokasjon().indexOf('(');
        int end = facts.lokasjon().indexOf(')');
        if (start >= 0 && end > start) {
            return facts.lokasjon().substring(start + 1, end);
        }
        return null;
    }
}
