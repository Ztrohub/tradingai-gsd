import { Router } from "express";
import { addProfile, activateProfile, editProfile, getEffectiveConfig, getProfiles, removeProfile } from "./profiles.service.js";

export const providerRouter = Router();

function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function redactProfileSecrets<T extends { api_key?: string }>(profile: T): Omit<T, "api_key"> {
  const { api_key: _apiKey, ...safe } = profile;
  return safe;
}

providerRouter.get("/", async (_req, res) => {
  const rows = await getProfiles();
  res.json(rows.map(redactProfileSecrets));
});

providerRouter.post("/", async (req, res) => {
  try {
    const row = await addProfile(req.body);
    res.status(201).json(redactProfileSecrets(row));
  } catch (err) {
    res.status(400).json({ code: "invalid_profile", message: String(err) });
  }
});

providerRouter.post("/:id/activate", async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    res.status(400).json({ code: "invalid_id", message: "id must be a positive integer" });
    return;
  }

  try {
    await activateProfile(id);
    const config = await getEffectiveConfig();
    res.json({ ok: true, config });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("provider_ping_failed")) {
      res.status(400).json({ code: "provider_ping_failed", message: "provider ping failed" });
      return;
    }
    if (msg.includes("profile_not_found")) {
      res.status(404).json({ code: "profile_not_found", message: "profile not found" });
      return;
    }
    res.status(500).json({ code: "activate_failed", message: msg });
  }
});

providerRouter.put("/:id", async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    res.status(400).json({ code: "invalid_id", message: "id must be a positive integer" });
    return;
  }

  try {
    const row = await editProfile(id, req.body);
    res.json(redactProfileSecrets(row));
  } catch (err) {
    const msg = String(err);
    if (msg.includes("profile_not_found")) {
      res.status(404).json({ code: "profile_not_found", message: "profile not found" });
      return;
    }
    res.status(400).json({ code: "invalid_profile", message: msg });
  }
});

providerRouter.delete("/:id", async (req, res) => {
  const id = parsePositiveInt(req.params.id);
  if (!id) {
    res.status(400).json({ code: "invalid_id", message: "id must be a positive integer" });
    return;
  }

  try {
    await removeProfile(id);
    res.json({ ok: true });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("profile_not_found")) {
      res.status(404).json({ code: "profile_not_found", message: "profile not found" });
      return;
    }
    if (msg.includes("cannot_delete_active_profile")) {
      res.status(409).json({ code: "cannot_delete_active_profile", message: "cannot delete active profile" });
      return;
    }
    res.status(500).json({ code: "delete_profile_failed", message: msg });
  }
});
