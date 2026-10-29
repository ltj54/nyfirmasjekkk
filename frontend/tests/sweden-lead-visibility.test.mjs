import assert from "node:assert/strict";
import test from "node:test";

import { pilotCompaniesWithEmail, recentCompaniesWithEmail } from "../src/lib/sweden-lead-visibility.ts";

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
