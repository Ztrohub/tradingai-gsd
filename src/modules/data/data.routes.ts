import { Router } from "express";
import { z } from "zod";
import {
  addWatchlistSymbol,
  deleteWatchlistSymbol,
  getDailyDataStatus,
  listCurrentWatchlist,
  listWatchlistHistory,
  readWatchlistConfig,
  updateWatchlistSymbol,
  writeWatchlistConfig
} from "./watchlist.repository.js";
import {
  addUniverseSymbol,
  deleteUniverseSymbol,
  getUniverseState,
  getUniverseSymbols,
  refreshUniverseSnapshot,
  updateUniverseSymbol
} from "./universe.service.js";
import { triggerRun } from "../runs/runs.service.js";

const watchlistConfigSchema = z.object({
  targetSize: z.number().int().min(5).max(10)
});
const universeSymbolSchema = z.object({ symbol: z.string().min(2).max(6) });
const updateUniverseSymbolSchema = z.object({ newSymbol: z.string().min(2).max(6) });
const watchlistSymbolSchema = z.object({ symbol: z.string().min(2).max(6) });
const updateWatchlistSymbolSchema = z.object({ newSymbol: z.string().min(2).max(6) });
const watchlistOverrideSchema = z.object({ enabled: z.boolean() });

export const dataRouter = Router();

dataRouter.get("/watchlist/current", async (_req, res) => {
  const rows = await listCurrentWatchlist();
  const config = await readWatchlistConfig();
  res.json({ targetSize: config.targetSize, manualOverrideEnabled: config.manualOverrideEnabled, symbols: rows });
});

dataRouter.get("/watchlist/history", async (_req, res) => {
  const rows = await listWatchlistHistory(20);
  res.json(rows);
});

dataRouter.get("/data/daily/:date", async (req, res) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ code: "invalid_date", message: "date must be YYYY-MM-DD" });
    return;
  }
  const rows = await getDailyDataStatus(date);
  res.json(rows);
});

dataRouter.get("/config/watchlist", async (_req, res) => {
  const config = await readWatchlistConfig();
  res.json({ targetSize: config.targetSize, manualOverrideEnabled: config.manualOverrideEnabled, min: 5, max: 10 });
});

dataRouter.put("/config/watchlist", async (req, res) => {
  const parsed = watchlistConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "validation_error", message: parsed.error.flatten() });
    return;
  }
  const config = await writeWatchlistConfig({ targetSize: parsed.data.targetSize });
  res.json({ targetSize: config.targetSize, manualOverrideEnabled: config.manualOverrideEnabled, min: 5, max: 10 });
});

dataRouter.put("/watchlist/override-mode", async (req, res) => {
  const parsed = watchlistOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "validation_error", message: parsed.error.flatten() });
    return;
  }
  const current = await readWatchlistConfig();
  const config = await writeWatchlistConfig({ targetSize: current.targetSize, manualOverrideEnabled: parsed.data.enabled });
  res.json({ manualOverrideEnabled: config.manualOverrideEnabled });
});

dataRouter.get("/universe", async (_req, res) => {
  const symbols = await getUniverseSymbols();
  const state = await getUniverseState();
  res.json({
    symbols,
    count: symbols.length,
    source: state?.source ?? null,
    createdAt: state?.createdAt ?? null
  });
});

dataRouter.post("/universe/sync", async (_req, res) => {
  try {
    const snapshot = await refreshUniverseSnapshot({ fallbackToLatest: false });
    const symbols = await getUniverseSymbols();
    res.json({ ok: true, source: snapshot.source, createdAt: snapshot.created_at, count: symbols.length });
  } catch (error) {
    res.status(500).json({ code: "universe_sync_failed", message: String(error) });
  }
});

dataRouter.post("/universe", async (req, res) => {
  const parsed = universeSymbolSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "validation_error", message: parsed.error.flatten() });
    return;
  }
  try {
    await addUniverseSymbol(parsed.data.symbol);
    res.status(201).json({ ok: true });
  } catch (error) {
    const code = String(error);
    if (code.includes("symbol_exists") || code.includes("invalid_symbol")) {
      res.status(400).json({ code: code.replace("Error: ", ""), message: code });
      return;
    }
    res.status(500).json({ code: "universe_add_failed", message: code });
  }
});

dataRouter.put("/universe/:symbol", async (req, res) => {
  const parsed = updateUniverseSymbolSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "validation_error", message: parsed.error.flatten() });
    return;
  }
  try {
    await updateUniverseSymbol(req.params.symbol, parsed.data.newSymbol);
    res.json({ ok: true });
  } catch (error) {
    const code = String(error);
    if (code.includes("symbol_exists") || code.includes("invalid_symbol") || code.includes("symbol_not_found")) {
      res.status(400).json({ code: code.replace("Error: ", ""), message: code });
      return;
    }
    res.status(500).json({ code: "universe_update_failed", message: code });
  }
});

dataRouter.delete("/universe/:symbol", async (req, res) => {
  try {
    await deleteUniverseSymbol(req.params.symbol);
    res.json({ ok: true });
  } catch (error) {
    const code = String(error);
    if (code.includes("symbol_not_found") || code.includes("invalid_symbol")) {
      res.status(400).json({ code: code.replace("Error: ", ""), message: code });
      return;
    }
    res.status(500).json({ code: "universe_delete_failed", message: code });
  }
});

dataRouter.post("/watchlist/current/symbols", async (req, res) => {
  const parsed = watchlistSymbolSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "validation_error", message: parsed.error.flatten() });
    return;
  }
  const config = await readWatchlistConfig();
  if (!config.manualOverrideEnabled) {
    res.status(409).json({ code: "manual_override_disabled", message: "enable manual override first" });
    return;
  }
  try {
    await addWatchlistSymbol(parsed.data.symbol);
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(400).json({ code: "watchlist_add_failed", message: String(error) });
  }
});

dataRouter.put("/watchlist/current/symbols/:symbol", async (req, res) => {
  const parsed = updateWatchlistSymbolSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "validation_error", message: parsed.error.flatten() });
    return;
  }
  const config = await readWatchlistConfig();
  if (!config.manualOverrideEnabled) {
    res.status(409).json({ code: "manual_override_disabled", message: "enable manual override first" });
    return;
  }
  try {
    await updateWatchlistSymbol(req.params.symbol, parsed.data.newSymbol);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ code: "watchlist_update_failed", message: String(error) });
  }
});

dataRouter.delete("/watchlist/current/symbols/:symbol", async (req, res) => {
  const config = await readWatchlistConfig();
  if (!config.manualOverrideEnabled) {
    res.status(409).json({ code: "manual_override_disabled", message: "enable manual override first" });
    return;
  }
  try {
    await deleteWatchlistSymbol(req.params.symbol);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ code: "watchlist_delete_failed", message: String(error) });
  }
});

dataRouter.post("/actions/run-weekly-selection", async (_req, res) => {
  try {
    const run = await triggerRun("weekly", "manual");
    res.status(202).json({ ok: true, runId: run.id });
  } catch (error) {
    if (String(error).includes("run_in_progress")) {
      res.status(409).json({ code: "run_in_progress", message: "run in progress" });
      return;
    }
    res.status(500).json({ code: "weekly_action_failed", message: String(error) });
  }
});
