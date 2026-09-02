import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { TtsVoice } from "./learning.ts";

export class OpenAISpeech {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey: string, fetchImpl: typeof fetch = fetch) {
    if (!apiKey) throw new Error("Add an OpenAI API key in Settings first.");
    this.apiKey = apiKey; this.fetchImpl = fetchImpl;
  }

  async create(input: string, voice: TtsVoice, speed: number, signal?: AbortSignal): Promise<Buffer> {
    const text = input.trim().slice(0, 4_096);
    if (!text) throw new Error("There is nothing to speak.");
    const response = await this.fetchImpl("https://api.openai.com/v1/audio/speech", {
      method: "POST", signal,
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts", voice, input: text, response_format: "wav", speed,
        instructions: "Speak like a warm, concise technical tutor. Be clear and encouraging. Pronounce Omarchy as oh-mar-key and OmaTut as oh-ma-tut.",
      }),
    });
    if (!response.ok) throw new Error(`OpenAI speech request failed (${response.status}).`);
    return Buffer.from(await response.arrayBuffer());
  }
}

export class SpeechPlayer {
  private current: { process: ChildProcess; path: string } | null = null;

  async play(audio: Buffer): Promise<void> {
    await this.stop();
    const path = join(tmpdir(), `omatut-speech-${randomUUID()}.wav`); await writeFile(path, audio, { mode: 0o600 });
    const process = spawn("pw-play", [path], { stdio: "ignore" }); const playback = { process, path }; this.current = playback;
    process.once("error", () => this.finish(playback)); process.once("close", () => this.finish(playback));
  }

  async stop(): Promise<void> {
    const playback = this.current; this.current = null;
    if (!playback) return;
    if (playback.process.exitCode === null) playback.process.kill("SIGTERM");
    await unlink(playback.path).catch(() => undefined);
  }

  private finish(playback: { process: ChildProcess; path: string }): void {
    if (this.current === playback) this.current = null;
    void unlink(playback.path).catch(() => undefined);
  }
}
