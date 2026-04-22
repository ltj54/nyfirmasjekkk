package io.ltj.nyfirmasjekk.network;

import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TrafficLight companyScoreColor;

    @Column(nullable = false)
    private Boolean companyBankruptcySignal;

    @Column(nullable = false)
    private Boolean companyDissolvedSignal;

    @Column(nullable = false)
    private Boolean active;

    @Column(nullable = false)
    private LocalDateTime capturedAt;

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

    public TrafficLight getCompanyScoreColor() {
        return companyScoreColor;
    }

    public void setCompanyScoreColor(TrafficLight companyScoreColor) {
        this.companyScoreColor = companyScoreColor;
    }

    public Boolean getCompanyBankruptcySignal() {
        return companyBankruptcySignal;
    }

    public void setCompanyBankruptcySignal(Boolean companyBankruptcySignal) {
        this.companyBankruptcySignal = companyBankruptcySignal;
    }

    public Boolean getCompanyDissolvedSignal() {
        return companyDissolvedSignal;
    }

    public void setCompanyDissolvedSignal(Boolean companyDissolvedSignal) {
        this.companyDissolvedSignal = companyDissolvedSignal;
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
