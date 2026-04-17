package io.ltj.nyfirmasjekk.history;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CompanyHistorySnapshotRepository extends JpaRepository<CompanyHistorySnapshotEntity, Long> {
    List<CompanyHistorySnapshotEntity> findTop50ByOrgNumberOrderByCapturedAtDesc(String orgNumber);

    @Query("SELECT DISTINCT c.county FROM CompanyHistorySnapshotEntity c WHERE c.county IS NOT NULL ORDER BY c.county")
    List<String> findDistinctCounties();

    @Query("SELECT DISTINCT c.organizationForm FROM CompanyHistorySnapshotEntity c WHERE c.organizationForm IS NOT NULL ORDER BY c.organizationForm")
    List<String> findDistinctOrganizationForms();
}
