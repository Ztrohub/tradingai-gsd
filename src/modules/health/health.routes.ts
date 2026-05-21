import type { Request, Response } from "express";
import { dbHealth } from "../../db/client.js";

export async function healthHandler(_req: Request, res: Response): Promise<void> {
  const db = await dbHealth();
  res.json({ ok: true, db, ts: new Date().toISOString() });
}
