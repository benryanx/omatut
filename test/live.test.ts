import test from "node:test";
import assert from "node:assert/strict";
import { LiveUpdates } from "../src/live.ts";

test("live updates notify every connected companion and stop after disconnect", () => {
  const updates = new LiveUpdates();
  const first: string[] = []; const second: string[] = [];
  const firstClient = { write: (chunk: string) => first.push(chunk) };
  const secondClient = { write: (chunk: string) => second.push(chunk) };
  updates.connect(firstClient); updates.connect(secondClient); updates.publish(); updates.disconnect(firstClient); updates.publish();
  assert.deepEqual(first, ["data: connected\n\n", "data: updated\n\n"]);
  assert.deepEqual(second, ["data: connected\n\n", "data: updated\n\n", "data: updated\n\n"]);
});
