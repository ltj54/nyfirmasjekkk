package io.ltj.nyfirmasjekk.network;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompanyRoleSnapshotRepository extends JpaRepository<CompanyRoleSnapshotEntity, Long> {
    List<CompanyRoleSnapshotEntity> findByOrgNumberOrderByCapturedAtDescIdDesc(String orgNumber);
    List<CompanyRoleSnapshotEntity> findByActorKeyOrderByCapturedAtDescIdDesc(String actorKey);
}
