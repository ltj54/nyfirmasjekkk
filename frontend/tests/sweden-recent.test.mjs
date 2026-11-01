import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ensureSwedishBulkFile, filterRecentByCutoff, latestAvailableWeekCutoff, loadRecentSwedishCompanies, swedishRegistrationStatus } from "../src/lib/sweden-recent.ts";

test("anchors the available week to the newest registration in the source, not today", () => {
  assert.equal(latestAvailableWeekCutoff("2026-10-23"), "2026-10-16");
});

test("reuses an older weekly-file selection for a newer seven-day cutoff", () => {
  const records = {
    companies: [
      { registrationDate: "2026-10-21", name: "Older AB" },
      { registrationDate: "2026-10-23", name: "Recent AB" },
    ],
    soleProprietorships: [{ registrationDate: "2026-10-22", name: "Recent sole proprietor" }],
  };
  assert.deepEqual(filterRecentByCutoff(records, "2026-10-22"), {
    companies: [{ registrationDate: "2026-10-23", name: "Recent AB" }],
    soleProprietorships: [{ registrationDate: "2026-10-22", name: "Recent sole proprietor" }],
  });
});

test("reads deregistration and ongoing proceedings from Bolagsverket's bulk fields", () => {
  assert.deepEqual(swedishRegistrationStatus({
    avregistreringsdatum: "2026-10-28",
    avregistreringsorsak: "KKAV-AVORG",
    pagandeAvvecklingsEllerOmstruktureringsforfarande: "KK-AVOMFO$2026-10-27|FR-AVOMFO$2026-10-26",
  }), {
    deregistrationDate: "2026-10-28",
    deregistrationReason: "Konkurs",
    ongoingProceedings: [
      { code: "KK-AVOMFO", label: "Konkurs", since: "2026-10-27" },
      { code: "FR-AVOMFO", label: "Foretaksrekonstruksjon", since: "2026-10-26" },
    ],
  });
  assert.deepEqual(swedishRegistrationStatus({}), {
    deregistrationDate: null, deregistrationReason: "", ongoingProceedings: [],
  });
});

async function inTemporaryDirectory(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "sweden-bulk-test-"));
  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("checks the source daily without redownloading an unchanged bulk file", async () => {
  await inTemporaryDirectory(async (directory) => {
    const archive = path.join(directory, "bolagsverket_bulkfil.zip");
    await writeFile(archive, "old-file");
    await utimes(archive, new Date("2026-10-27T10:00:00Z"), new Date("2026-10-27T10:00:00Z"));
    const calls = [];
    const fetcher = async (_url, options) => {
      calls.push(options.method ?? "GET");
      return new Response(null, { headers: {
        "content-length": "8", "last-modified": "Mon, 26 Oct 2026 02:23:12 GMT",
      } });
    };
    const first = await ensureSwedishBulkFile({ directory, now: new Date("2026-10-29T08:00:00Z"), fetcher });
    const second = await ensureSwedishBulkFile({ directory, now: new Date("2026-10-29T09:00:00Z"), fetcher });
    assert.deepEqual(calls, ["HEAD"]);
    assert.equal(first.checkedAt, "2026-10-29T08:00:00.000Z");
    assert.equal(second.checkedAt, first.checkedAt);
    assert.equal(first.warning, undefined);
    assert.equal(await readFile(archive, "utf8"), "old-file");
  });
});

test("an explicit refresh checks the source and retains its latest available registration week", async () => {
  await inTemporaryDirectory(async (directory) => {
    const archive = path.join(directory, "bolagsverket_bulkfil.zip");
    await writeFile(archive, "old-file");
    await utimes(archive, new Date("2026-10-27T10:00:00Z"), new Date("2026-10-27T10:00:00Z"));
    const modifiedAt = (await stat(archive)).mtime.toISOString();
    await writeFile(path.join(directory, "bulk-source-check.json"), JSON.stringify({
      checkedAt: "2026-11-01T20:00:00.000Z", archiveSize: 8,
    }));
    await writeFile(path.join(directory, "recent-companies.json"), JSON.stringify({
      companies: [{ id: "SE:5560000043", orgNumber: "5560000043", registrationDate: "2026-10-23" }],
      soleProprietorships: [{ id: "E:1", name: "Ett E", registrationDate: "2026-10-22" }],
      cutoffDate: "2026-10-16", sourceFileModifiedAt: modifiedAt,
      archiveSize: 8, schemaVersion: 2, fetchedAt: "2026-10-29T10:00:00.000Z",
    }));
    let checks = 0;
    const result = await loadRecentSwedishCompanies({
      directory,
      now: new Date("2026-11-01T22:00:00Z"),
      forceSourceCheck: true,
      fetcher: async () => {
        checks += 1;
        return new Response(null, { headers: {
          "content-length": "8", "last-modified": "Mon, 26 Oct 2026 02:23:12 GMT",
        } });
      },
    });
    assert.equal(checks, 1);
    assert.equal(result.cutoffDate, "2026-10-16");
    assert.equal(result.sourceLatestRegistrationDate, "2026-10-23");
    assert.equal(result.companies.length, 1);
    assert.equal(result.soleProprietorships.length, 1);
  });
});

test("downloads a changed bulk file and keeps its check timestamp", async () => {
  await inTemporaryDirectory(async (directory) => {
    const archive = path.join(directory, "bolagsverket_bulkfil.zip");
    await writeFile(archive, "old-file");
    await utimes(archive, new Date("2026-10-26T00:00:00Z"), new Date("2026-10-26T00:00:00Z"));
    const calls = [];
    const fetcher = async (_url, options) => {
      calls.push(options.method ?? "GET");
      if (options.method === "HEAD") return new Response(null, { headers: {
        "content-length": "8", "last-modified": "Wed, 28 Oct 2026 02:23:12 GMT",
      } });
      return new Response("new-file", { headers: { "content-length": "8" } });
    };
    const result = await ensureSwedishBulkFile({ directory, now: new Date("2026-10-29T08:00:00Z"), fetcher });
    assert.deepEqual(calls, ["HEAD", "GET"]);
    assert.equal(await readFile(archive, "utf8"), "new-file");
    assert.equal(result.checkedAt, "2026-10-29T08:00:00.000Z");
  });
});

test("marks an existing file as unverified when the source check fails", async () => {
  await inTemporaryDirectory(async (directory) => {
    const archive = path.join(directory, "bolagsverket_bulkfil.zip");
    await writeFile(archive, "old-file");
    const result = await ensureSwedishBulkFile({
      directory,
      now: new Date("2026-10-29T08:00:00Z"),
      fetcher: async () => { throw new Error("network down"); },
    });
    assert.match(result.warning, /Kunne ikke bekrefte/);
    assert.equal(await readFile(archive, "utf8"), "old-file");
  });
});

test("an HTTP error on the source check also keeps the stored file with a warning", async () => {
  await inTemporaryDirectory(async (directory) => {
    const archive = path.join(directory, "bolagsverket_bulkfil.zip");
    await writeFile(archive, "old-file");
    const result = await ensureSwedishBulkFile({
      directory,
      now: new Date("2026-10-29T08:00:00Z"),
      fetcher: async () => new Response(null, { status: 503 }),
    });
    assert.match(result.warning, /Kunne ikke bekrefte/);
    assert.equal(await readFile(archive, "utf8"), "old-file");
  });
});
