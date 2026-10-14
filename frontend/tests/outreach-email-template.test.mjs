import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFollowUpEmailBody,
  buildOutreachEmailBody,
  buildOutreachEmailSubject,
  buildWebsiteLeadBatchEmailBody,
  hasUnresolvedPersonalObservation,
} from "../src/lib/outreach-email-template.ts";

const template = readFileSync(new URL("../../data/outreach-email-template.md", import.meta.url), "utf8");

const unavailableWebsite = {
  status: "REGISTERED",
  verifiedReachable: false,
};

test("batch uses the approved Audiograf message, without stale technical claims", () => {
  const company = {
    orgNumber: "837491312",
    name: "AUDIOGRAF JULIE JOHNSEN",
    organizationForm: "ENK",
    contactPersonName: "Julie Johnsen",
    website: "www.merennlyd.no",
    websiteDiscovery: unavailableWebsite,
  };

  const body = buildWebsiteLeadBatchEmailBody(template, company);
  assert.equal(buildOutreachEmailSubject(template, company), "Et spørsmål om merennlyd.no");
  assert.match(body, /^Hei Julie,/);
  assert.match(body, /bestillingssiden hos SumUp/);
  assert.match(body, /egen nettside/);
  assert.doesNotMatch(body, /11\. oktober 2026|sertifikatfeil|svarte med 404/);
  assert.doesNotMatch(body, /mistet kunder|må gjøre/);
  assert.equal(hasUnresolvedPersonalObservation(body), false);
  assert.match(body, /Org\.nr\. 838 632 122$/);
});

test("batch keeps the cautious generic message for other unavailable websites", () => {
  const company = {
    orgNumber: "937510764",
    name: "ARAA",
    organizationForm: "FLI",
    contactPersonName: "Marcus Parra Nygård",
    website: "araa.no",
    websiteDiscovery: unavailableWebsite,
  };

  const body = buildWebsiteLeadBatchEmailBody(template, company);
  assert.equal(buildOutreachEmailSubject(template, company), "Et spørsmål om araa.no");
  assert.match(body, /^Hei Marcus,/);
  assert.match(body, /jeg vet ikke om dere bruker en annen adresse/);
  assert.doesNotMatch(body, /Fyll inn/);
  assert.doesNotMatch(body, /SumUp/);
  assert.match(body, /eventuelt arbeid avtaler vi på forhånd/);
  assert.equal(hasUnresolvedPersonalObservation(body), false);
  assert.match(body, /Org\.nr\. 838 632 122$/);
});

test("batch falls back to the approved Audiograf message if the template section is missing", () => {
  const company = {
    orgNumber: "837491312",
    name: "AUDIOGRAF JULIE JOHNSEN",
    organizationForm: "ENK",
    website: "www.merennlyd.no",
    websiteDiscovery: unavailableWebsite,
  };

  const body = buildWebsiteLeadBatchEmailBody("", company);
  assert.match(body, /bestillingssiden hos SumUp/);
  assert.match(body, /Org\.nr\. 838 632 122$/);
});

test("first contact is short and separates the free sketch from paid work", () => {
  const company = {
    orgNumber: "123456789",
    name: "EKSEMPEL BEDRIFT AS",
    organizationForm: "AS",
    contactPersonName: "Anne Eksempel",
  };

  const body = buildOutreachEmailBody(template, company);
  assert.match(body, /^Hei Anne,/);
  assert.match(body, /kort, gratis skisse/);
  assert.match(body, /1 990 kr, inkludert utvikling og publisering/);
  assert.match(body, /før noe arbeid starter/);
  assert.doesNotMatch(body, /webhotell|AI|kunder går tapt/);
  assert.ok(body.split(/\s+/).length < 110);
  assert.match(body, /Org\.nr\. 838 632 122$/);
  assert.equal(body.match(/Org\.nr\. 838 632 122/g)?.length, 1);
});

test("quality outreach labels the finding as unverified", () => {
  const company = {
    orgNumber: "123456789",
    name: "EKSEMPEL BEDRIFT AS",
    organizationForm: "AS",
    website: "eksempel.no",
    websiteDiscovery: { status: "REGISTERED", verifiedReachable: true },
    websiteQuality: { signals: [{ code: "WEAK_CONTACT_POINT", severity: "MEDIUM" }] },
  };

  const body = buildOutreachEmailBody(template, company);
  assert.match(body, /automatisk førstesjekk/);
  assert.match(body, /ikke kontrollert det manuelt/);
  assert.doesNotMatch(body, /kunder går tapt|svekke tilliten/);
});

test("the single follow-up promises no further contact", () => {
  const company = {
    orgNumber: "123456789",
    name: "EKSEMPEL BEDRIFT AS",
    organizationForm: "AS",
  };

  const body = buildFollowUpEmailBody(template, company, "website-offer");
  assert.match(body, /én gang/);
  assert.match(body, /Jeg kontakter dere ikke igjen om dette/);
  assert.match(body, /Org\.nr\. 838 632 122$/);
});
