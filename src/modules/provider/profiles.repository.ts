import { pool } from "../../db/client.js";

export type ProviderProfile = {
  id: number;
  name: string;
  provider: "groq" | "openrouter";
  model: string;
  api_base: string;
  api_key: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
};

export async function listProfiles(): Promise<ProviderProfile[]> {
  const { rows } = await pool.query("select * from provider_profiles order by id asc");
  return rows;
}

export async function createProfile(input: Omit<ProviderProfile, "id" | "is_active">): Promise<ProviderProfile> {
  const { rows } = await pool.query(
    `insert into provider_profiles (name, provider, model, api_base, api_key, temperature, max_tokens)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [input.name, input.provider, input.model, input.api_base, input.api_key, input.temperature, input.max_tokens]
  );
  return rows[0];
}

export async function getProfileById(id: number): Promise<ProviderProfile | null> {
  const { rows } = await pool.query("select * from provider_profiles where id=$1 limit 1", [id]);
  return rows[0] ?? null;
}

export async function updateProfile(
  id: number,
  input: Omit<ProviderProfile, "id" | "is_active">
): Promise<ProviderProfile | null> {
  const { rows } = await pool.query(
    `update provider_profiles
     set name=$2, provider=$3, model=$4, api_base=$5, api_key=$6, temperature=$7, max_tokens=$8, updated_at=now()
     where id=$1
     returning *`,
    [id, input.name, input.provider, input.model, input.api_base, input.api_key, input.temperature, input.max_tokens]
  );
  return rows[0] ?? null;
}

export async function deleteProfile(id: number): Promise<ProviderProfile | null> {
  const { rows } = await pool.query("delete from provider_profiles where id=$1 returning *", [id]);
  return rows[0] ?? null;
}

export async function setActiveProfile(id: number): Promise<void> {
  await pool.query("update provider_profiles set is_active=false");
  await pool.query("update provider_profiles set is_active=true where id=$1", [id]);
}

export async function getActiveProfile(): Promise<ProviderProfile | null> {
  const { rows } = await pool.query("select * from provider_profiles where is_active=true limit 1");
  return rows[0] ?? null;
}
