import assert from "node:assert/strict";
import test from "node:test";

import { validIsoDate, validIssueInvoiceInput } from "../src/lib/invoice-register.ts";

const validInput = {
  customerName: "Eksempel Kunde AS",
  customerAddress: "Testveien 1\n5000 Bergen",
  customerOrgNumber: "999 999 999",
  customerEmail: "kunde@example.no",
  description: "Utvikling og publisering av nettside",
  deliveryDate: "2026-11-05",
  deliveryPlace: "Digital levering",
  amount: 1990,
};

test("invoice input requires complete immutable source data", () => {
  assert.equal(validIssueInvoiceInput(validInput), true);
  assert.equal(validIssueInvoiceInput({ ...validInput, customerAddress: "" }), false);
  assert.equal(validIssueInvoiceInput({ ...validInput, amount: 0 }), false);
});

test("invoice dates must be real ISO calendar dates", () => {
  assert.equal(validIsoDate("2026-11-05"), true);
  assert.equal(validIsoDate("2026-02-30"), false);
  assert.equal(validIsoDate("05.11.2026"), false);
});

