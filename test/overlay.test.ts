import test from "node:test";
import assert from "node:assert/strict";
import { showOverlayGuide } from "../src/overlay.ts";

test("overlay guide maps normalized model coordinates into desktop geometry", async () => {
  let args: readonly string[] = [];
  await showOverlayGuide({
    answer: "Click it.", steps: ["Click the control"], shortcut: null,
    targetLabel: "Control", targetX: 250, targetY: 750, confidence: "high", needsMoreContext: false,
  }, {
    id: "one", bytes: Buffer.from("image"), mime: "image/png", createdAt: Date.now(),
    geometry: { x: 100, y: 200, width: 800, height: 400 },
  }, async (_file, nextArgs = []) => { args = nextArgs; return { stdout: "ok\n", stderr: "" }; });
  const payload = JSON.parse(String(args[2]));
  assert.equal(payload.targetX, 300);
  assert.equal(payload.targetY, 500);
});
