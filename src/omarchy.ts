import type { CommandRunner } from "./command.ts";
import { runCommand } from "./command.ts";

export interface Binding {
  keys: string;
  description: string;
}

export interface DesktopContext {
  omarchy: { version: string | null; channel: string | null };
  activeWindow: { title: string | null; class: string | null; workspace: string | number | null };
  pointer: { x: number | null; y: number | null };
  bindings: Binding[];
}

export function parseBindings(output: string): Binding[] {
  return output.split(/\r?\n/).map(line => {
    const match = line.match(/^\s*(.+?)\s+(?:→|->)\s+(.+?)\s*$/);
    return match ? { keys: match[1].replace(/\s+/g, " ").trim(), description: match[2].trim() } : null;
  }).filter((binding): binding is Binding => Boolean(binding));
}

export async function readDesktopContext(run: CommandRunner = runCommand): Promise<DesktopContext> {
  const [version, channel, active, pointer, bindings] = await Promise.all([
    safe(run, "omarchy", ["version"]),
    safe(run, "omarchy", ["version", "channel"]),
    safe(run, "hyprctl", ["activewindow", "-j"]),
    safe(run, "hyprctl", ["cursorpos", "-j"]),
    safe(run, "omarchy", ["menu", "keybindings", "--print"]),
  ]);
  const window = parseJson(active);
  const cursor = parseJson(pointer);
  const workspace = isRecord(window.workspace) ? window.workspace.id ?? window.workspace.name ?? null : null;
  return {
    omarchy: { version: clean(version), channel: clean(channel) },
    activeWindow: {
      title: textValue(window.title),
      class: textValue(window.class),
      workspace: typeof workspace === "string" || typeof workspace === "number" ? workspace : null,
    },
    pointer: { x: numberValue(cursor.x), y: numberValue(cursor.y) },
    bindings: parseBindings(bindings).slice(0, 500),
  };
}

async function safe(run: CommandRunner, file: string, args: readonly string[]): Promise<string> {
  try { return (await run(file, args)).stdout; } catch { return ""; }
}

function parseJson(value: string): Record<string, unknown> {
  try { const parsed = JSON.parse(value); return isRecord(parsed) ? parsed : {}; } catch { return {}; }
}

function clean(value: string): string | null { return value.trim() || null; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function textValue(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }
function numberValue(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }

