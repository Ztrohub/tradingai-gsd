import { apiGet, apiPost } from "../lib/api-client.js";

type ProviderProfile = {
  id: number;
  name: string;
  provider: "groq" | "openrouter";
  model: string;
  is_active: boolean;
};

export async function loadProviderProfiles() {
  return apiGet<ProviderProfile[]>("/api/config/provider-profiles");
}

export async function activateProviderProfile(id: number) {
  return apiPost<{ ok: boolean }>(`/api/config/provider-profiles/${id}/activate`);
}
