import { Router } from "express";
import { addProfile, activateProfile, getEffectiveConfig, getProfiles } from "./profiles.service.js";

export const providerRouter = Router();

providerRouter.get("/", async (_req, res) => {
  const rows = await getProfiles();
  res.json(rows);
});

providerRouter.post("/", async (req, res) => {
  try {
    const row = await addProfile(req.body);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ code: "invalid_profile", message: String(err) });
  }
});

providerRouter.post("/:id/activate", async (req, res) => {
  try {
    await activateProfile(Number(req.params.id));
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
