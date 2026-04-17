package io.ltj.nyfirmasjekk.history;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompanyHistorySnapshotRepository extends JpaRepository<CompanyHistorySnapshotEntity, Long> {
    List<CompanyHistorySnapshotEntity> findTop50ByOrgNumberOrderByCapturedAtDesc(String orgNumber);
}
