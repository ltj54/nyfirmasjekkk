import assert from "node:assert/strict";
import test from "node:test";

import { isLocalApiRequest } from "../src/lib/local-api-access.ts";

test("local reads and same-origin writes are allowed", () => {
  assert.equal(isLocalApiRequest("127.0.0.1:3000", "GET", null), true);
  assert.equal(isLocalApiRequest("localhost:3000", "POST", "http://localhost:3000"), true);
  assert.equal(isLocalApiRequest("[::1]:3000", "POST", "http://[::1]:3000"), true);
});

test("external hosts and cross-origin writes are rejected", () => {
  assert.equal(isLocalApiRequest("example.com", "GET", null), false);
  assert.equal(isLocalApiRequest("127.0.0.1:3000", "POST", "https://example.com"), false);
  assert.equal(isLocalApiRequest("127.0.0.1:3000", "POST", null), false);
  assert.equal(isLocalApiRequest("127.0.0.1:3000/path", "GET", null), false);
  assert.equal(isLocalApiRequest("127.0.0.1:3000@example.com", "GET", null), false);
});
