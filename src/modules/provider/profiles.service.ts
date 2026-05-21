import { z } from "zod";
import { createProfile, getActiveProfile, listProfiles, setActiveProfile } from "./profiles.repository.js";

const profileSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(["groq", "openrouter"]),
  model: z.string().min(1),
  api_base: z.string().url(),
  api_key: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.2),
  max_tokens: z.number().int().min(1).default(1024)
});

function pingProvider(apiBase: string): boolean {
  return apiBase.startsWith("http");
}

export async function getProfiles() {
  return listProfiles();
}

export async function addProfile(body: unknown) {
  const parsed = profileSchema.parse(body);
  return createProfile(parsed);
}

export async function activateProfile(id: number) {
  const active = await listProfiles();
  const target = active.find((x) => x.id === id);
  if (!target) throw new Error("profile_not_found");
  if (!pingProvider(target.api_base)) throw new Error("provider_ping_failed");
  await setActiveProfile(id);
}

export async function getEffectiveConfig() {
  const active = await getActiveProfile();
  if (!active) return null;
  return {
    profile_id: active.id,
    provider: active.provider,
    model: active.model,
    api_base: active.api_base,
    temperature: active.temperature,
    max_tokens: active.max_tokens
  };
}
