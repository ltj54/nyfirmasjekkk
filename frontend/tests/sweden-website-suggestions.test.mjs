import assert from "node:assert/strict";
import test from "node:test";

import {
  discoverSwedishWebsiteSuggestions,
  isPublicIpv4,
  suggestSwedishDomains,
} from "../src/lib/sweden-website-suggestions.ts";

test("uses a business email domain and bounded Swedish name alternatives", () => {
  assert.deepEqual(suggestSwedishDomains("Aleslöv Holding AB", "info@aleslov.se"), [
    { hostname: "aleslov.se", basis: "E-postdomene" },
    { hostname: "aleslovholding.se", basis: "Navneforslag" },
    { hostname: "aleslovholding.com", basis: "Navneforslag" },
  ]);
  assert.equal(suggestSwedishDomains("Aleslöv Holding AB", "info@gmail.com")[0].basis, "Navneforslag");
});

test("shows responding alternatives but does not present failed name guesses as websites", async () => {
  const checked = [];
  const suggestions = await discoverSwedishWebsiteSuggestions("Nord Älv AB", "info@nordalv.se", async (hostname) => {
    checked.push(hostname);
    if (hostname === "nordalv.se") return { status: "Svarer", httpStatus: 200 };
    if (hostname === "nordalv.com") return { status: "Videresender", httpStatus: 301 };
    return { status: "Ikke bekreftet", httpStatus: null };
  });
  assert.deepEqual(checked, ["nordalv.se", "nordalv.com"]);
  assert.deepEqual(suggestions.map((item) => item.url), ["https://nordalv.se/", "https://nordalv.com/"]);
  assert.equal(suggestions[0].basis, "E-postdomene");
  assert.equal(suggestions[1].status, "Videresender");
});

test("does not probe when SCB gives no email", async () => {
  const result = await discoverSwedishWebsiteSuggestions("Nytt Bolag AB", "", async () => {
    throw new Error("probe must not run");
  });
  assert.deepEqual(result, []);
});

test("private and reserved IPv4 addresses are never eligible for a website probe", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "203.0.113.1", "224.0.0.1"]) {
    assert.equal(isPublicIpv4(address), false, address);
  }
  assert.equal(isPublicIpv4("8.8.8.8"), true);
});
