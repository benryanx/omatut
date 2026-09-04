import test from "node:test";
import assert from "node:assert/strict";
import { OpenAICompanion } from "../src/companion.ts";

test("companion summarizes local structured lessons without provider storage", async () => {
  let body: Record<string, unknown> = {};
  const companion = new OpenAICompanion("dummy-provider-token", async (_url, init) => {
    body = JSON.parse(String(init?.body)); return new Response(JSON.stringify({ output_text: "You learned themes. Try workspaces next." }));
  });
  const summary = await companion.summarize([{ id: "1", createdAt: new Date().toISOString(), question: "Themes?", answer: "Open themes.", steps: [], shortcut: "SUPER + K", topic: "Themes", app: "omarchy", workspace: 1 }]);
  assert.equal(summary, "You learned themes. Try workspaces next.");
  assert.equal(body.store, false); assert.equal(JSON.parse(String(body.input))[0].topic, "Themes");
});
