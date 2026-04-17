package io.ltj.nyfirmasjekk.network;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "company_role_snapshot")
public class CompanyRoleSnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 9)
    private String orgNumber;

    @Column(nullable = false)
    private String companyName;

    @Column(nullable = false)
    private String actorKey;

    @Column(nullable = false)
    private String actorName;

    @Column(nullable = false)
    private String roleType;

    @Column(nullable = false)
    private Boolean active;

    @Column(nullable = false)
    private LocalDateTime capturedAt;

    public Long getId() {
        return id;
    }

    public String getOrgNumber() {
        return orgNumber;
    }

    public void setOrgNumber(String orgNumber) {
        this.orgNumber = orgNumber;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getActorKey() {
        return actorKey;
    }

    public void setActorKey(String actorKey) {
        this.actorKey = actorKey;
    }

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public String getRoleType() {
        return roleType;
    }

    public void setRoleType(String roleType) {
        this.roleType = roleType;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public LocalDateTime getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(LocalDateTime capturedAt) {
        this.capturedAt = capturedAt;
    }
}
