import assert from "node:assert/strict";
import test from "node:test";

import { casesForProject, casesWithoutProject, normalizeOrganizationNumber } from "../src/lib/crm-manual-cases.ts";

const cases = [
  { id: "lbn", orgNumber: "938659699", originalEmail: "Lars sitt svar" },
  { id: "another", orgNumber: "937000111", originalEmail: "Et annet svar" },
  { id: "archived", orgNumber: "938529426", originalEmail: "Bevart som arkiv", hiddenFromCrm: true },
];

test("an earlier manual case follows the active project rather than appearing twice", () => {
  const projectNumber = "938 659 699";
  const projectNumbers = new Set([normalizeOrganizationNumber(projectNumber)]);

  assert.deepEqual(casesForProject(cases, projectNumber).map((entry) => entry.id), ["lbn"]);
  assert.deepEqual(casesWithoutProject(cases, projectNumbers).map((entry) => entry.id), ["another"]);
  assert.equal(casesForProject(cases, projectNumber)[0].originalEmail, "Lars sitt svar");
});

test("a project without organisation number does not claim a manual case", () => {
  assert.deepEqual(casesForProject(cases, undefined), []);
});

test("a closed case hidden from CRM does not reappear as an unassigned manual case", () => {
  assert.deepEqual(casesWithoutProject(cases, new Set()).map((entry) => entry.id), ["lbn", "another"]);
});
