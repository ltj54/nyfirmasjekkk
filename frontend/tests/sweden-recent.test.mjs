import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { ensureSwedishBulkFile } from "../src/lib/sweden-recent.ts";

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
