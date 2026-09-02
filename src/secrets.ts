import { spawn, spawnSync } from "node:child_process";

const ATTRS = ["service", "omatut", "provider", "openai"];

export function getOpenAIKey(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.OPENAI_API_KEY) return env.OPENAI_API_KEY;
  const result = spawnSync("secret-tool", ["lookup", ...ATTRS], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

export async function setOpenAIKey(key: string): Promise<void> {
  if (!/^sk-[A-Za-z0-9_-]{12,}$/.test(key.trim())) throw new Error("That does not look like an OpenAI API key.");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("secret-tool", ["store", "--label=OmaTut OpenAI key", ...ATTRS], { stdio: ["pipe", "ignore", "pipe"] });
    let error = "";
    child.stderr.on("data", chunk => { error += chunk; });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(error.trim() || "Could not store the key in Secret Service.")));
    child.stdin.end(key.trim());
  });
}

