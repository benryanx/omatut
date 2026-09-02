import test from "node:test";
import assert from "node:assert/strict";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { transcribeRecording } from "../src/voice.ts";
import { normalizeTranscript, VOCABULARY_PROMPT } from "../src/vocabulary.ts";

test("transcription returns trimmed speech and removes the temporary recording", async () => {
  const path = join(tmpdir(), `omatut-voice-test-${randomUUID()}.wav`);
  await writeFile(path, "audio");
  const text = await transcribeRecording(path, async (file, args = []) => {
    assert.equal(file, "voxtype"); assert.deepEqual(args, ["--initial-prompt", VOCABULARY_PROMPT, "transcribe", path]);
    return { stdout: "  Teach me something cool about oh mar key.\n", stderr: "" };
  });
  assert.equal(text, "Teach me something cool about Omarchy.");
  await assert.rejects(access(path));
});

test("domain vocabulary normalizes common Omarchy ecosystem spellings", () => {
  assert.equal(
    normalizeTranscript("Show me quick shell and hyper land settings in archlinux using hyper control"),
    "Show me Quickshell and Hyprland settings in Arch Linux using hyprctl",
  );
  assert.match(VOCABULARY_PROMPT, /Omarchy, OmaTut, Hyprland, hyprctl, Quickshell/);
});
