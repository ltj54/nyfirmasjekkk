import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
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
  assert.match(body, /egen nettside eller app/);
  assert.doesNotMatch(body, /11\. oktober 2026|sertifikatfeil|svarte med 404/);
  assert.equal(hasUnresolvedPersonalObservation(body), false);
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
  assert.match(body, /annen nettside eller bestillingsløsning/);
  assert.doesNotMatch(body, /SumUp/);
  assert.equal(hasUnresolvedPersonalObservation(body), false);
});

test("batch falls back to the approved Audiograf message if the template section is missing", () => {
  const company = {
    orgNumber: "837491312",
    name: "AUDIOGRAF JULIE JOHNSEN",
    organizationForm: "ENK",
    website: "www.merennlyd.no",
    websiteDiscovery: unavailableWebsite,
  };

  assert.match(buildWebsiteLeadBatchEmailBody("", company), /bestillingssiden hos SumUp/);
});
