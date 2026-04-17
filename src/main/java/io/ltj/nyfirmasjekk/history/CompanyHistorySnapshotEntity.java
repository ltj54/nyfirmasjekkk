package io.ltj.nyfirmasjekk.history;

import io.ltj.nyfirmasjekk.companycheck.TrafficLight;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "company_history_snapshot")
public class CompanyHistorySnapshotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 9)
    private String orgNumber;

    @Column(nullable = false)
    private String name;

    private String organizationForm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private TrafficLight scoreColor;

    @Column(length = 2000)
    private String summary;

    private String municipality;

    private String county;

    private String naceCode;

    private String latestAnnualAccountsYear;

    private Boolean vatRegistered;

    private Boolean registeredInBusinessRegistry;

    private Boolean hasContactData;

    private Boolean hasRoles;

    private Boolean hasSeriousSignals;

    private LocalDate registrationDate;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOrganizationForm() {
        return organizationForm;
    }

    public void setOrganizationForm(String organizationForm) {
        this.organizationForm = organizationForm;
    }

    public TrafficLight getScoreColor() {
        return scoreColor;
    }

    public void setScoreColor(TrafficLight scoreColor) {
        this.scoreColor = scoreColor;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getMunicipality() {
        return municipality;
    }

    public void setMunicipality(String municipality) {
        this.municipality = municipality;
    }

    public String getCounty() {
        return county;
    }

    public void setCounty(String county) {
        this.county = county;
    }

    public String getNaceCode() {
        return naceCode;
    }

    public void setNaceCode(String naceCode) {
        this.naceCode = naceCode;
    }

    public String getLatestAnnualAccountsYear() {
        return latestAnnualAccountsYear;
    }

    public void setLatestAnnualAccountsYear(String latestAnnualAccountsYear) {
        this.latestAnnualAccountsYear = latestAnnualAccountsYear;
    }

    public Boolean getVatRegistered() {
        return vatRegistered;
    }

    public void setVatRegistered(Boolean vatRegistered) {
        this.vatRegistered = vatRegistered;
    }

    public Boolean getRegisteredInBusinessRegistry() {
        return registeredInBusinessRegistry;
    }

    public void setRegisteredInBusinessRegistry(Boolean registeredInBusinessRegistry) {
        this.registeredInBusinessRegistry = registeredInBusinessRegistry;
    }

    public Boolean getHasContactData() {
        return hasContactData;
    }

    public void setHasContactData(Boolean hasContactData) {
        this.hasContactData = hasContactData;
    }

    public Boolean getHasRoles() {
        return hasRoles;
    }

    public void setHasRoles(Boolean hasRoles) {
        this.hasRoles = hasRoles;
    }

    public Boolean getHasSeriousSignals() {
        return hasSeriousSignals;
    }

    public void setHasSeriousSignals(Boolean hasSeriousSignals) {
        this.hasSeriousSignals = hasSeriousSignals;
    }

    public LocalDate getRegistrationDate() {
        return registrationDate;
    }

    public void setRegistrationDate(LocalDate registrationDate) {
        this.registrationDate = registrationDate;
    }

    public LocalDateTime getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(LocalDateTime capturedAt) {
        this.capturedAt = capturedAt;
    }
}
