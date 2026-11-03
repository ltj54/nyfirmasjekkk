import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readSwedishOutreachLog, recordSwedishOutreach, validateSwedishOutreachInput } from "../src/lib/sweden-outreach-log.ts";

const request = {
  requestId: "8d2f6a93-fae7-496c-a2b4-097b62db93f1",
  confirmedSent: true,
  companyName: "Junwear",
  companyType: "E",
  recipient: "kent@example.se",
  subject: "En webbplats för Junwear?",
  body: "Hej,\n\nHär är mitt förslag.\n\nLars",
  sentAt: "2020-11-03T10:30:00.000Z",
};

test("contact can only be recorded after explicit sent confirmation", () => {
  assert.throws(() => validateSwedishOutreachInput({ ...request, confirmedSent: false }), /Bekreft/);
  assert.throws(() => validateSwedishOutreachInput({ ...request, recipient: "not-an-email" }), /e-postadresse/);
  assert.throws(() => validateSwedishOutreachInput({ ...request, sentAt: "not-a-date" }), /sendetidspunkt/);
  assert.throws(() => validateSwedishOutreachInput({ ...request, requestId: "E:1" }), /forespørsels-ID/);
});

test("Swedish sent-mail log persists full text separately and retries are idempotent", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "swedish-outreach-test-"));
  try {
    const swedishLog = path.join(directory, "scb", "swedish-outreach-log.jsonl");
    const norwegianLog = path.join(directory, "outreach-log.jsonl");
    await writeFile(norwegianLog, "norsk logg\n", "utf8");
    assert.deepEqual(await readSwedishOutreachLog(swedishLog), []);
    const first = await recordSwedishOutreach(request, swedishLog);
    const retry = await recordSwedishOutreach(request, swedishLog);
    assert.deepEqual(retry, first);
    assert.equal((await readSwedishOutreachLog(swedishLog)).length, 1);
    assert.equal(first.body, request.body);
    assert.equal(first.sentAt, request.sentAt);
    assert.equal((await readFile(norwegianLog, "utf8")), "norsk logg\n");
    await assert.rejects(recordSwedishOutreach({ ...request, subject: "Changed" }, swedishLog), /allerede brukt/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
