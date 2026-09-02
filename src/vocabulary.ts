export interface VocabularyEntry {
  term: string;
  aliases: readonly string[];
}

export const OMATUT_VOCABULARY: readonly VocabularyEntry[] = [
  { term: "Omarchy", aliases: ["omarchy", "oh mar key", "oh mar kee", "oh marchy", "o mar key", "omarkey", "omarchey"] },
  { term: "OmaTut", aliases: ["omatut", "oma tut", "oma toot", "oma taught"] },
  { term: "Hyprland", aliases: ["hyprland", "hypr land", "hyperland", "hyper land"] },
  { term: "hyprctl", aliases: ["hyprctl", "hypr control", "hyper control"] },
  { term: "Quickshell", aliases: ["quickshell", "quick shell"] },
  { term: "Hyprpaper", aliases: ["hyprpaper", "hypr paper", "hyper paper"] },
  { term: "Hyprlock", aliases: ["hyprlock", "hypr lock", "hyper lock"] },
  { term: "Hypridle", aliases: ["hypridle", "hypr idle", "hyper idle"] },
  { term: "Hyprsunset", aliases: ["hyprsunset", "hypr sunset", "hyper sunset"] },
  { term: "Wayland", aliases: ["wayland", "way land"] },
  { term: "Arch Linux", aliases: ["arch linux", "archlinux"] },
  { term: "AUR", aliases: ["a u r"] },
  { term: "systemd", aliases: ["system d", "system dee"] },
];

export const VOCABULARY_PROMPT = `The user is asking about ${OMATUT_VOCABULARY.map(entry => entry.term).join(", ")}. Preserve these spellings.`;

export function normalizeTranscript(transcript: string): string {
  let normalized = transcript.trim();
  for (const entry of OMATUT_VOCABULARY) {
    const aliases = [...entry.aliases].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
    normalized = normalized.replace(new RegExp(`\\b(?:${aliases})\\b`, "gi"), entry.term);
  }
  return normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
