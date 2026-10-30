import assert from "node:assert/strict";
import test from "node:test";

import { pilotCompaniesWithEmail, recentCompaniesWithEmail, soleProprietorshipsWithEmail } from "../src/lib/sweden-lead-visibility.ts";

test("only SCB-enriched recent companies with a nonblank email appear", () => {
  const candidates = ["1111111111", "2222222222", "3333333333"].map((orgNumber) => ({ orgNumber }));
  const enriched = {
    "1111111111": { email: "info@example.invalid" },
    "2222222222": { email: "   " },
  };
  assert.deepEqual(recentCompaniesWithEmail(candidates, enriched), [candidates[0]]);
});

test("the technical sample also hides companies without SCB email", () => {
  const companies = [{ email: "" }, { email: "kontakt@example.invalid" }, { email: "  " }];
  assert.deepEqual(pilotCompaniesWithEmail(companies), [companies[1]]);
});

test("E registrations are equally visible only after SCB provides an email", () => {
  const candidates = [{ id: "E:1" }, { id: "E:2" }, { id: "E:3" }];
  const enriched = { "E:1": { email: "firma@example.invalid" }, "E:2": { email: " " } };
  assert.deepEqual(soleProprietorshipsWithEmail(candidates, enriched), [candidates[0]]);
});
