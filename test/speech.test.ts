import test from "node:test";
import assert from "node:assert/strict";
import { OpenAISpeech } from "../src/speech.ts";

test("speech generation uses ephemeral WAV output and selected preferences", async () => {
  let request: RequestInit | undefined;
  const speech = new OpenAISpeech("dummy-provider-token", async (_url, init) => {
    request = init; return new Response(Buffer.from("wave"), { status: 200, headers: { "Content-Type": "audio/wav" } });
  });
  const audio = await speech.create("  Try Super plus K. ", "marin", 1.1);
  assert.equal(audio.toString(), "wave");
  const body = JSON.parse(String(request?.body));
  assert.deepEqual({ model: body.model, voice: body.voice, input: body.input, response_format: body.response_format, speed: body.speed }, {
    model: "gpt-4o-mini-tts", voice: "marin", input: "Try Super plus K.", response_format: "wav", speed: 1.1,
  });
  assert.match(body.instructions, /AI|tutor|Omarchy/i);
});
