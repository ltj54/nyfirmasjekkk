import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { prepareRecentSwedishCompanies } from "../src/lib/sweden-prepared.ts";

test("prepares and caches only SCB-confirmed email records without E personal identifiers", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sweden-prepared-test-"));
  const numbers = Array.from({ length: 26 }, (_, index) => String(5560000000 + index));
  const recent = {
    companies: numbers.map((orgNumber, index) => ({ id: `SE:${orgNumber}`, orgNumber,
      registrationDate: index === 0 || index === 2 ? "2026-10-23" : "2026-10-29" })),
    soleProprietorships: [{ id: "E:1", name: "Ett E", registrationDate: "2026-10-29", postalCity: "MALMÖ" }],
    fetchedAt: "2026-10-30T10:00:00.000Z",
    cutoffDate: "2026-10-23",
    sourceFileModifiedAt: "2026-10-29T09:00:00.000Z",
  };
  const calls = [];
  const progress = [];
  const dependencies = {
    directory,
    now: new Date("2026-10-30T10:00:00.000Z"),
    onProgress: (value) => progress.push(value),
    enrichCompanies: async (_key, batch, options) => {
      calls.push(batch);
      batch.forEach(() => options.onChecked());
      return {
        companies: batch.filter((orgNumber) => orgNumber !== numbers[2]).map((orgNumber) => ({
          id: `SE:${orgNumber}`, email: [numbers[0], numbers[1]].includes(orgNumber) ? "hello@example.se" : "",
        })),
        unavailableOrgNumbers: batch.includes(numbers[2]) ? [numbers[2]] : [],
      };
    },
    resolveSole: async (_cutoff, _candidates, _archive, onScanProgress) => {
      onScanProgress(30);
      onScanProgress(100);
      return [{ candidate: recent.soleProprietorships[0], scbId: "196901010000" }];
    },
    enrichSole: async (_key, _batch, options) => {
      options.onChecked();
      return { companies: [{ id: "E:1", email: "sole@example.se" }] };
    },
  };
  try {
    const prepared = await prepareRecentSwedishCompanies(recent, "test-key", dependencies);
    assert.deepEqual(calls.map((batch) => batch.length), [25, 1]);
    assert.deepEqual(prepared.companies.map((company) => company.orgNumber), [numbers[0], numbers[1]]);
    assert.deepEqual(prepared.soleProprietorships.map((company) => company.id), ["E:1"]);
    assert.equal(prepared.prepared.checkedAbCount, 26);
    assert.equal(prepared.prepared.checkedSoleCount, 1);
    assert.equal(prepared.prepared.unavailableAbCount, 1);
    assert.equal(prepared.prepared.reusedCache, false);
    assert.deepEqual(progress.at(-1), { phase: "complete", completed: 27, total: 27 });
    assert.ok(progress.some((value) => value.phase === "checking_ab" && value.completed === 1));
    assert.ok(progress.some((value) => value.phase === "resolving_sole" && value.scanPercent === 30));
    assert.ok(progress.some((value) => value.phase === "checking_sole" && value.completed === 27));
    const saved = await readFile(path.join(directory, "prepared-recent.json"), "utf8");
    assert.equal(saved.includes("196901010000"), false);
    assert.equal(saved.includes("test-key"), false);
    assert.equal(saved.includes(numbers[3]), false);

    const cached = await prepareRecentSwedishCompanies(recent, "test-key", {
      ...dependencies,
      now: new Date("2026-10-30T11:00:00.000Z"),
      enrichCompanies: async () => { throw new Error("SCB must not be called for a fresh cache"); },
    });
    assert.deepEqual(cached.companies, prepared.companies);
    assert.equal(cached.prepared.reusedCache, true);
    assert.deepEqual(calls.map((batch) => batch.length), [25, 1]);

    const nextCutoff = {
      ...recent,
      cutoffDate: "2026-10-24",
      companies: recent.companies.filter((company) => company.registrationDate >= "2026-10-24"),
    };
    const nextDay = await prepareRecentSwedishCompanies(nextCutoff, "test-key", {
      ...dependencies,
      now: new Date("2026-10-31T10:00:00.000Z"),
      enrichCompanies: async () => { throw new Error("An unchanged bulk file must not trigger SCB calls"); },
    });
    assert.deepEqual(nextDay.companies.map((company) => company.orgNumber), [numbers[1]]);
    assert.equal(nextDay.prepared.checkedAbCount, 24);
    assert.equal(nextDay.prepared.unavailableAbCount, 0);
    assert.equal(nextDay.prepared.reusedCache, true);
    assert.deepEqual(calls.map((batch) => batch.length), [25, 1]);

    const legacy = JSON.parse(saved);
    legacy.schemaVersion = 2;
    delete legacy.unavailableByDate;
    await writeFile(path.join(directory, "prepared-recent.json"), JSON.stringify(legacy));
    const reusedLegacy = await prepareRecentSwedishCompanies(nextCutoff, "test-key", {
      ...dependencies,
      now: new Date("2026-10-31T10:00:00.000Z"),
      enrichCompanies: async () => { throw new Error("The earlier cache must still be reused"); },
    });
    assert.deepEqual(reusedLegacy.companies.map((company) => company.orgNumber), [numbers[1]]);
    assert.equal(reusedLegacy.prepared.summaryIncomplete, true);

    await prepareRecentSwedishCompanies({ ...nextCutoff, sourceFileModifiedAt: "2026-10-31T09:00:00.000Z" }, "test-key", {
      ...dependencies,
      now: new Date("2026-10-31T11:00:00.000Z"),
    });
    assert.deepEqual(calls.map((batch) => batch.length), [25, 1, 24]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
