import assert from "node:assert/strict";
import test from "node:test";

import { validateWebsiteReview } from "../src/lib/sweden-websites.ts";

const orgNumber = "5596090075";

test("a candidate website remains explicitly unverified", () => {
  assert.deepEqual(validateWebsiteReview({ orgNumber, status: "candidate", url: "https://example.se", note: "Navnet ligner" }), {
    orgNumber,
    status: "candidate",
    url: "https://example.se/",
    note: "Navnet ligner",
  });
});

test("a confirmed website requires a manual basis", () => {
  assert.throws(() => validateWebsiteReview({ orgNumber, status: "confirmed", url: "https://example.se", note: "" }), /bekreftet/);
  assert.equal(validateWebsiteReview({ orgNumber, status: "confirmed", url: "https://example.se", note: "Org.nr. står på kontaktsiden" }).status, "confirmed");
});

test("not found is not treated as no website and cannot include a URL", () => {
  assert.throws(() => validateWebsiteReview({ orgNumber, status: "not_found", url: "https://example.se", note: "" }), /ikke ha en nettsideadresse/);
  assert.equal(validateWebsiteReview({ orgNumber, status: "not_found", url: "", note: "Søkte på navn og org.nr." }).status, "not_found");
});

test("unsafe or malformed addresses are rejected", () => {
  for (const url of ["javascript:alert(1)", "ftp://example.se", "https://user:pass@example.se", "http://localhost:3000", "example.se"]) {
    assert.throws(() => validateWebsiteReview({ orgNumber, status: "candidate", url, note: "" }));
  }
});
