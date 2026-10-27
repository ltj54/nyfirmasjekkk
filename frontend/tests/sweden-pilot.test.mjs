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
    regDat: "2026-04-21T00:00:00Z", ftgStat: "1", epostSparrTyp: 3,
    naringsgrenar: [{ naringsgren: "62010", rangordning: 1 }],
    ...overrides,
  };
}

function mockScb(rows, overrides = {}) {
  const calls = [];
  const fetcher = async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://apiafr.scb.se");
    assert.equal(options.headers["X-API-Key"], key);
    assert.equal(options.redirect, "error");
    calls.push(url);
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
  assert.equal(calls.length, 11);
  assert.equal(peak, 1);
  assert.equal(result.withEmail, 10);
  assert.equal(result.companies[0].id, "SE:5560000000");
  assert.doesNotMatch(JSON.stringify(result), /test-key-never-returned|peOrgNr|website/);
});

test("missing contact data and unknown reservation codes remain unknown", async () => {
  const rows = [company(0, { epost: "", epostSparrTyp: null, regDat: null })];
  const { fetcher } = mockScb(rows);
  const result = await fetchSwedishPilot(key, { fetcher, pause });
  assert.equal(result.withEmail, 0);
  assert.equal(result.withRegistrationDate, 0);
  assert.equal(result.companies[0].emailReservationCode, null);
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
  await assert.rejects(fetchSwedishPilot(key, { fetcher, pause }), /mangler virksomhetslisten/);
});
