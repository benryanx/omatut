import test from "node:test";
import assert from "node:assert/strict";
import { CaptureStore, parseFocusedMonitor, parseGeometry } from "../src/capture.ts";

test("parseGeometry reads slurp's normalized geometry output", () => {
  assert.deepEqual(parseGeometry("-1920,40 800x600\n"), { x: -1920, y: 40, width: 800, height: 600 });
  assert.equal(parseGeometry("0,0 0x600"), null);
});

test("capture store replaces and clears ephemeral captures", () => {
  const store = new CaptureStore();
  const capture = { id: "one", bytes: Buffer.from("png"), mime: "image/png", createdAt: Date.now(), geometry: { x: 0, y: 0, width: 100, height: 100 } };
  store.set(capture); assert.equal(store.get("one")?.id, "one"); assert.equal(store.get("other"), null);
});

test("focused monitor geometry is normalized to logical desktop coordinates", () => {
  const monitor = parseFocusedMonitor(JSON.stringify([
    { name: "DP-1", x: 0, y: 0, width: 1920, height: 1080, scale: 1, focused: false },
    { name: "eDP-1", x: 1920, y: 0, width: 2560, height: 1600, scale: 2, transform: 0, focused: true },
  ]));
  assert.deepEqual(monitor, { name: "eDP-1", geometry: { x: 1920, y: 0, width: 1280, height: 800 } });
  assert.equal(parseFocusedMonitor("not json"), null);
});
