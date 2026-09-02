import test from "node:test";
import assert from "node:assert/strict";
import { parseBindings, readDesktopContext } from "../src/omarchy.ts";

test("parseBindings reads the current Omarchy keybinding format", () => {
  assert.deepEqual(parseBindings("SUPER + K    → Keybindings\nSHIFT ALT + D → Download Video\nnoise"), [
    { keys: "SUPER + K", description: "Keybindings" },
    { keys: "SHIFT ALT + D", description: "Download Video" },
  ]);
});

test("desktop context tolerates unavailable compositor state", async () => {
  const outputs = new Map([
    ["omarchy version", "4.0.2-1\n"], ["omarchy version channel", "stable\n"],
    ["hyprctl activewindow -j", JSON.stringify({ title: "Terminal", class: "com.mitchellh.ghostty", workspace: { id: 2 } })],
    ["hyprctl cursorpos -j", JSON.stringify({ x: 40, y: 90 })], ["omarchy menu keybindings --print", "SUPER + K → Keybindings\n"],
  ]);
  const context = await readDesktopContext(async (file, args = []) => ({ stdout: outputs.get(`${file} ${args.join(" ")}`) || "", stderr: "" }));
  assert.equal(context.activeWindow.title, "Terminal"); assert.equal(context.activeWindow.workspace, 2);
  assert.deepEqual(context.pointer, { x: 40, y: 90 }); assert.equal(context.bindings[0].keys, "SUPER + K");
});

