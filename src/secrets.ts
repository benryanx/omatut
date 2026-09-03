import { spawn, spawnSync } from "node:child_process";

const openAIAttrs = ["service", "omatut", "provider", "openai"];

export function getOpenAIKey(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.OPENAI_API_KEY) return env.OPENAI_API_KEY;
  const result = spawnSync("secret-tool", ["lookup", ...openAIAttrs], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

export async function setOpenAIKey(key: string): Promise<void> {
  if (!/^sk-[A-Za-z0-9_-]{12,}$/.test(key.trim())) throw new Error("That does not look like an OpenAI API key.");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("secret-tool", ["store", "--label=OmaTut OpenAI key", ...openAIAttrs], { stdio: ["pipe", "ignore", "pipe"] });
    let error = "";
    child.stderr.on("data", chunk => { error += chunk; });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(error.trim() || "Could not store the key in Secret Service.")));
    child.stdin.end(key.trim());
  });
}

export function getProviderKey(provider: "openai" | "compatible", env: NodeJS.ProcessEnv = process.env): string | null {
  if (provider === "openai") return getOpenAIKey(env);
  const result = spawnSync("secret-tool", ["lookup", "service", "omatut", "provider", provider], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

export async function setProviderKey(provider: "openai" | "compatible", key: string): Promise<void> {
  if (provider === "openai") return setOpenAIKey(key);
  if (!key.trim()) throw new Error("Enter an API key for this provider.");
  await new Promise<void>((resolve, reject) => {
    const child = spawn("secret-tool", ["store", "--label=OmaTut compatible API key", "service", "omatut", "provider", provider], { stdio: ["pipe", "ignore", "pipe"] });
    let error = "";
    child.stderr.on("data", chunk => { error += chunk; });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(error.trim() || "Could not store the key in Secret Service.")));
    child.stdin.end(key.trim());
  });
}
