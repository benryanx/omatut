import test from "node:test";
import assert from "node:assert/strict";
import { guideDuration, showOverlayGuide } from "../src/overlay.ts";

test("overlay guide maps normalized model coordinates into desktop geometry", async () => {
  let args: readonly string[] = [];
  await showOverlayGuide({
    answer: "Click it.", steps: ["Click the control"], shortcut: null,
    targetLabel: "Control", targetX: 250, targetY: 750, confidence: "high", needsMoreContext: false,
  }, {
    id: "one", bytes: Buffer.from("image"), mime: "image/png", createdAt: Date.now(),
    geometry: { x: 100, y: 200, width: 800, height: 400 },
  }, "adaptive", async (_file, nextArgs = []) => { args = nextArgs; return { stdout: "ok\n", stderr: "" }; });
  const payload = JSON.parse(String(args[2]));
  assert.equal(payload.targetX, 300);
  assert.equal(payload.targetY, 500);
  assert.equal(payload.duration, 18_000);
});

test("guide timing supports adaptive reading time and user presets", () => {
  const short = { answer: "A short answer.", steps: [], shortcut: null };
  const long = { answer: Array(200).fill("word").join(" "), steps: [], shortcut: null };
  assert.equal(guideDuration(short, "adaptive"), 18_000);
  assert.equal(guideDuration(long, "adaptive"), 75_000);
  assert.equal(guideDuration(short, "brief"), 15_000);
  assert.equal(guideDuration(short, "relaxed"), 45_000);
  assert.equal(guideDuration(short, "persistent"), 0);
});
