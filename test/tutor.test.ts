import test from "node:test";
import assert from "node:assert/strict";
import { CompatibleTutor, OllamaTutor, OpenAITutor } from "../src/tutor.ts";

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

test("Ollama sends the selected screen image to its local chat endpoint", async () => {
  let url = ""; let request: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (input, init) => {
    url = String(input); request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ answer: "Open it.", steps: ["Click the menu."], shortcut: null, targetLabel: null, targetX: null, targetY: null, confidence: "medium", needsMoreContext: false }) } }), { status: 200 });
  };
  const answer = await new OllamaTutor("qwen3-vl:8b", "http://127.0.0.1:11434", fetchImpl).ask("What is this?", capture(), context());
  assert.equal(url, "http://127.0.0.1:11434/api/chat"); assert.equal(answer.answer, "Open it."); assert.match(JSON.stringify(request), /aW1hZ2U=/);
});

test("compatible providers receive a vision chat completion request", async () => {
  let url = ""; let request: Record<string, unknown> = {};
  const fetchImpl: typeof fetch = async (input, init) => {
    url = String(input); request = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ answer: "Use it.", steps: [], shortcut: null, targetLabel: null, targetX: null, targetY: null, confidence: "high", needsMoreContext: false }) } }] }), { status: 200 });
  };
  await new CompatibleTutor("key", "vision-model", "https://example.test/v1", fetchImpl).ask("What is this?", capture(), context());
  assert.equal(url, "https://example.test/v1/chat/completions"); assert.equal(request.response_format.type, "json_object");
});

function capture() { return { id: "c", bytes: Buffer.from("image"), mime: "image/png", createdAt: Date.now(), geometry: { x: 0, y: 0, width: 200, height: 100 } }; }
function context() { return { omarchy: { version: "4", channel: "stable" }, activeWindow: { title: "Desktop", class: "desktop", workspace: 1 }, pointer: { x: 1, y: 2 }, bindings: [] }; }
