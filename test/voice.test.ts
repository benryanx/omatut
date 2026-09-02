import test from "node:test";
import assert from "node:assert/strict";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { transcribeRecording } from "../src/voice.ts";

test("transcription returns trimmed speech and removes the temporary recording", async () => {
  const path = join(tmpdir(), `omatut-voice-test-${randomUUID()}.wav`);
  await writeFile(path, "audio");
  const text = await transcribeRecording(path, async (file, args = []) => {
    assert.equal(file, "voxtype"); assert.deepEqual(args, ["transcribe", path]);
    return { stdout: "  How do I open this?\n", stderr: "" };
  });
  assert.equal(text, "How do I open this?");
  await assert.rejects(access(path));
});
