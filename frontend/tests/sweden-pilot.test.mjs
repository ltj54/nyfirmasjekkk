import assert from "node:assert/strict";
import test from "node:test";

import { fetchSwedishPilot } from "../src/lib/sweden-pilot.ts";

const key = "test-key-never-returned";
const pause = async () => {};

function company(index = 0, overrides = {}) {
  const orgNr = String(5560000000 + index);
  return {
    peOrgNr: `16${orgNr}`, orgNr, jurform: "49", namn: `Fiktivt Testbolag ${index} AB`,
    postAdress: { postOrt: "Testort" }, epost: "info@example.invalid",
    regDat: "2026-04-21T00:00:00Z", startDat: "2026-04-20T00:00:00Z",
    ftgStat: "1", epostSparrTyp: 1, reklamSparrTyp: 1, fSkattStat: "1", momsStat: "1",
    anstKl: "0", omsKl: "1", aeAnt: 1,
    naringsgrenar: [{ naringsgren: "62010", rangordning: 1 }],
    ...overrides,
  };
}

const codeTables = new Map([
  ["ftgstatkoder", [{ kod: "1", klartext: "Verksamt företag" }, { kod: "9", klartext: "Ej verksamt företag" }]],
  ["epostsparrtypkoder", [{ kod: 1, klartext: "Tar emot e-postreklam" }, { kod: 2, klartext: "Har frånsagt sig e-postreklam" }]],
  ["reklamsparrtypkoder", [{ kod: 1, klartext: "Tar emot reklam" }, { kod: 2, klartext: "Har frånsagt sig reklam" }]],
  ["fskattstatkoder", [{ kod: 1, klartext: "Registrerad för F-skatt" }]],
  ["momsstatkoder", [{ kod: 1, klartext: "Momsregistrerad" }]],
  ["anstklkoder", [{ kod: 0, klartext: "0 anställda" }]],
  ["omsklkoder", [{ kod: 1, klartext: "0–499 tkr" }]],
]);

function mockScb(rows, overrides = {}) {
  const calls = [];
  const fetcher = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://apiafr.scb.se");
    assert.equal(options.headers["X-API-Key"], key);
    assert.equal(options.redirect, "error");
    calls.push(url);
    const codeTable = codeTables.get(url.pathname.split("/").at(-1));
    if (codeTable) return Response.json(codeTable);
    if (url.pathname.endsWith("/juridiskform/49")) return Response.json({ jes: rows });
    const id = url.pathname.split("/").at(-2);
    const row = rows.find((entry) => entry.peOrgNr === id);
    assert.ok(row, "details must belong to the bounded AB sample");
    return Response.json({ ...row, ...overrides });
  };
  return { calls, fetcher };
}

test("sample stays bounded, reads sequentially and never follows pagination", async () => {
  const rows = Array.from({ length: 30 }, (_, index) => company(index));
  const { calls, fetcher } = mockScb(rows);
  let active = 0;
  let peak = 0;
  const serialFetcher = async (...args) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setImmediate(resolve));
    const response = await fetcher(...args);
    active -= 1;
    return response;
  };
  const result = await fetchSwedishPilot(key, { fetcher: serialFetcher, pause });
  assert.equal(result.companies.length, 10);
  assert.equal(calls.length, 18);
  assert.equal(peak, 1);
  assert.equal(result.withEmail, 10);
  assert.equal(result.companies[0].id, "SE:5560000000");
  assert.equal(result.companies[0].statusLabel, "Verksamt företag");
  assert.equal(result.companies[0].emailReservationLabel, "Tar emot e-postreklam");
  assert.equal(result.companies[0].employeeClassLabel, "0 anställda");
  assert.equal(result.companies[0].contactAssessment, "eligible");
  assert.doesNotMatch(JSON.stringify(result), /test-key-never-returned|peOrgNr|website/);
});

test("missing contact data and unknown reservation codes remain unknown", async () => {
  const rows = [company(0, { epost: "", epostSparrTyp: null, regDat: null })];
  const { fetcher } = mockScb(rows);
  const result = await fetchSwedishPilot(key, { fetcher, pause });
  assert.equal(result.withEmail, 0);
  assert.equal(result.withRegistrationDate, 0);
  assert.equal(result.companies[0].emailReservationCode, null);
  assert.equal(result.companies[0].emailReservationLabel, "Ikke oppgitt");
  assert.equal(result.companies[0].contactAssessment, "unknown");
});

test("inactive companies and marketing reservations are blocked conservatively", async () => {
  const rows = [
    company(0, { ftgStat: "9" }),
    company(1, { epostSparrTyp: 2 }),
    company(2, { reklamSparrTyp: 2 }),
  ];
  const { fetcher } = mockScb(rows);
  const result = await fetchSwedishPilot(key, { fetcher, pause });
  assert.deepEqual(result.companies.map((entry) => entry.contactAssessment), ["inactive", "blocked", "blocked"]);
});

test("identity mismatches and non-AB records abort instead of becoming leads", async () => {
  for (const overrides of [{ jurform: "10" }, { peOrgNr: "165560000099" }]) {
    const { fetcher } = mockScb([company()], overrides);
    await assert.rejects(fetchSwedishPilot(key, { fetcher, pause }), /uventet virksomhetstype eller identitet/);
  }
});

test("authentication failure stops after one call and does not leak upstream response", async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return new Response(`sensitive upstream body: ${key}`, { status: 401 });
  };
  await assert.rejects(fetchSwedishPilot(key, { fetcher, pause }), (error) => {
    assert.match(error.message, /avviste API-nøkkelen/);
    assert.doesNotMatch(error.message, /test-key-never-returned|sensitive/);
    return true;
  });
  assert.equal(calls, 1);
});

test("missing API key makes no network requests", async () => {
  const fetcher = async () => assert.fail("no network call without a key");
  await assert.rejects(fetchSwedishPilot(" ", { fetcher, pause }), /API-nøkkel/);
});

test("changed response contract fails visibly rather than returning a false empty list", async () => {
  const fetcher = async () => Response.json({ companies: [] });
  await assert.rejects(fetchSwedishPilot(key, { fetcher, pause }), /ugyldig kodetabell/);
});
