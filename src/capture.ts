import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { CommandRunner } from "./command.ts";
import { runCommand } from "./command.ts";

export interface CaptureGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Capture {
  id: string;
  bytes: Buffer;
  mime: string;
  createdAt: number;
  geometry: CaptureGeometry;
}

export function parseGeometry(output: string): CaptureGeometry | null {
  const match = output.trim().match(/^(-?\d+),(-?\d+)\s+(\d+)x(\d+)$/);
  if (!match) return null;
  const geometry = { x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]) };
  return geometry.width > 0 && geometry.height > 0 ? geometry : null;
}

export async function captureRegion(run: CommandRunner = runCommand): Promise<Capture> {
  let selection;
  try { selection = await run("slurp", ["-f", "%x,%y %wx%h"]); }
  catch { throw new Error("Screen selection cancelled."); }
  const geometry = parseGeometry(selection.stdout);
  if (!geometry) throw new Error("Could not read the selected screen region.");
  const path = join(tmpdir(), `omatut-capture-${randomUUID()}.png`);
  try {
    await run("grim", ["-g", `${geometry.x},${geometry.y} ${geometry.width}x${geometry.height}`, path]);
    const bytes = await readFile(path);
    if (bytes.length > 20 * 1024 * 1024) throw new Error("The selected screen region is larger than 20 MB.");
    return { id: randomUUID(), bytes, mime: "image/png", createdAt: Date.now(), geometry };
  } finally {
    await unlink(path).catch(() => undefined);
  }
}

export class CaptureStore {
  private current: Capture | null = null;
  private readonly ttlMs: number;
  constructor(ttlMs = 10 * 60 * 1000) { this.ttlMs = ttlMs; }
  set(capture: Capture): Capture { this.current = capture; return capture; }
  get(id?: string): Capture | null {
    if (!this.current || Date.now() - this.current.createdAt > this.ttlMs || (id && id !== this.current.id)) {
      this.current = null; return null;
    }
    return this.current;
  }
  clear(): void { this.current = null; }
}
