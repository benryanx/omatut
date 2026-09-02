import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CommandRunner } from "./command.ts";
import { runCommand } from "./command.ts";
import { extractTranscriptText, normalizeTranscript, VOCABULARY_PROMPT } from "./vocabulary.ts";

interface Recording {
  path: string;
  process: ChildProcess;
}

export class VoiceRecorder {
  private current: Recording | null = null;

  get recording(): boolean { return this.current !== null; }

  async start(run: CommandRunner = runCommand): Promise<void> {
    if (this.current) throw new Error("OmaTut is already listening.");
    await Promise.all([run("pw-record", ["--version"]), run("voxtype", ["--version"])]);
    const path = join(tmpdir(), `omatut-voice-${randomUUID()}.wav`);
    const process = spawn("pw-record", ["--rate", "16000", "--channels", "1", "--format", "s16", path], {
      stdio: "ignore",
    });
    await new Promise<void>((resolve, reject) => {
      process.once("spawn", resolve);
      process.once("error", reject);
    });
    this.current = { path, process };
  }

  async stop(): Promise<string> {
    const recording = this.current;
    if (!recording) throw new Error("OmaTut is not listening.");
    this.current = null;
    if (recording.process.exitCode === null) {
      recording.process.kill("SIGINT");
      await waitForExit(recording.process);
    }
    const info = await stat(recording.path).catch(() => null);
    if (!info || info.size <= 44) {
      await unlink(recording.path).catch(() => undefined);
      throw new Error("No microphone audio was captured.");
    }
    return recording.path;
  }

  async cancel(): Promise<void> {
    if (!this.current) return;
    const recording = this.current; this.current = null;
    if (recording.process.exitCode === null) recording.process.kill("SIGINT");
    await waitForExit(recording.process).catch(() => undefined);
    await unlink(recording.path).catch(() => undefined);
  }
}

export async function transcribeRecording(path: string, run: CommandRunner = runCommand): Promise<string> {
  try {
    const transcript = normalizeTranscript(extractTranscriptText((await run("voxtype", ["--initial-prompt", VOCABULARY_PROMPT, "transcribe", path])).stdout));
    if (!transcript) throw new Error("I couldn't hear a question. Try speaking closer to the microphone.");
    return transcript;
  } finally {
    await unlink(path).catch(() => undefined);
  }
}

async function waitForExit(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { process.kill("SIGTERM"); reject(new Error("Microphone recording did not stop cleanly.")); }, 3_000);
    process.once("close", () => { clearTimeout(timer); resolve(); });
    process.once("error", error => { clearTimeout(timer); reject(error); });
  });
}
