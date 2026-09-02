import test from "node:test";
import assert from "node:assert/strict";
import { OpenAITutor } from "../src/tutor.ts";

test("vision request includes the ephemeral image and installed bindings", async () => {
  let request: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (_input, init) => {
    request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ output_text: JSON.stringify({ answer: "Open the binding list.", steps: ["Press the shortcut."], shortcut: "SUPER + K", targetLabel: "Keybindings", targetX: 500, targetY: 400, confidence: "high", needsMoreContext: false }) }), { status: 200 });
  };
  const tutor = new OpenAITutor("sk-test-key-abcdefghijkl", "gpt-test", fetchImpl);
  const answer = await tutor.ask("How do I see shortcuts?", { id: "c", bytes: Buffer.from("image"), mime: "image/png", createdAt: Date.now(), geometry: { x: 0, y: 0, width: 200, height: 100 } }, {
    omarchy: { version: "4", channel: "stable" }, activeWindow: { title: "Desktop", class: "desktop", workspace: 1 }, pointer: { x: 1, y: 2 },
    bindings: [{ keys: "SUPER + K", description: "Keybindings" }],
  });
  assert.equal(answer.shortcut, "SUPER + K"); assert.equal(request.store, false);
  const serialized = JSON.stringify(request); assert.match(serialized, /data:image\/png;base64/); assert.match(serialized, /SUPER \+ K/);
});
