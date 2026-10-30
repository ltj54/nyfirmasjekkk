import assert from "node:assert/strict";
import test from "node:test";

import { readSwedishPreparationStream } from "../src/lib/sweden-preparation-stream.ts";

function streamParts(parts) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      parts.forEach((part) => controller.enqueue(encoder.encode(part)));
      controller.close();
    },
  });
}

test("reads progress across split chunks and returns the finished selection", async () => {
  const updates = [];
  const result = { companies: [], soleProprietorships: [], prepared: { checkedAbCount: 1 } };
  const events = [
    { kind: "source" },
    { kind: "progress", progress: { phase: "checking_ab", completed: 1, total: 1 } },
    { kind: "result", result },
  ].map((event) => `${JSON.stringify(event)}\n`).join("");
  const selected = await readSwedishPreparationStream(streamParts([events.slice(0, 18), events.slice(18, 63), events.slice(63)]),
    (update) => updates.push(update));
  assert.deepEqual(selected, result);
  assert.deepEqual(updates, [
    { phase: "source", completed: 0, total: 0 },
    { phase: "checking_ab", completed: 1, total: 1 },
  ]);
});

test("reports an interrupted preparation instead of presenting an incomplete list", async () => {
  const body = streamParts(['{"kind":"progress","progress":{"phase":"checking_ab","completed":1,"total":3}}\n']);
  await assert.rejects(readSwedishPreparationStream(body, () => undefined), /avbrutt før listen var ferdig/);
});
