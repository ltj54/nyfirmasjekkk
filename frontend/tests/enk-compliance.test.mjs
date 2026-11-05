import assert from "node:assert/strict";
import test from "node:test";

import {
  crmInvoiceTurnover,
  defaultEnkComplianceState,
  invoiceNumbersAreSequential,
  missingInvoiceDates,
  validIsoDate,
} from "../src/lib/enk-compliance.ts";

const invoices = [
  { number: "2026-001", amount: 1990, paymentDate: "20.07.2026" },
  { number: "2026-002", amount: 1990, paymentDate: "18.09.2026" },
  { number: "2026-003", amount: 1990, invoiceDate: "16.09.2026" },
  { number: "2026-004", amount: 1990, invoiceDate: "14.10.2026" },
  { number: "2026-005", amount: 3000, invoiceDate: "23.10.2026" },
];

test("CRM invoice basis totals all issued invoice records", () => {
  assert.equal(crmInvoiceTurnover(invoices), 10_960);
  assert.equal(missingInvoiceDates(invoices), 2);
  assert.equal(invoiceNumbersAreSequential(invoices), true);
});

test("invoice sequence gaps are detected", () => {
  assert.equal(invoiceNumbersAreSequential([
    { number: "2026-001", amount: 100 },
    { number: "2026-003", amount: 100 },
  ]), false);
});

test("default compliance state starts without assumptions", () => {
  const state = defaultEnkComplianceState();
  assert.equal(state.vatRegistered, false);
  assert.equal(state.hasAnnualAccountsObligation, false);
  assert.equal(state.expectedAnnualProfit, null);
  assert.equal(state.tasks.invoice_system.status, "open");
});

test("ISO dates are calendar-valid", () => {
  assert.equal(validIsoDate("2026-11-05"), true);
  assert.equal(validIsoDate("2026-02-31"), false);
  assert.equal(validIsoDate("05.11.2026"), false);
});
