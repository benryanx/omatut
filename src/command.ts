import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFileNative = promisify(execFileCallback);

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (file: string, args?: readonly string[]) => Promise<CommandResult>;

export async function runCommand(file: string, args: readonly string[] = []): Promise<CommandResult> {
  const result = await execFileNative(file, [...args], {
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || "/tmp/omatut-cache" },
  });
  return { stdout: result.stdout, stderr: result.stderr };
}

