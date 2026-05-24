import { pool } from "../../db/client.js";

export type UniverseSnapshot = {
  id: number;
  source: string;
  symbol_set_hash: string;
  payload: { symbols: string[] };
  created_at: string;
};

function normalizeSymbols(symbols: string[]): string[] {
  return Array.from(new Set(symbols.map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z]{2,6}$/.test(s)))).sort();
}

export async function createUniverseSnapshot(source: string, symbols: string[]) {
  const normalized = normalizeSymbols(symbols);
  if (normalized.length === 0) throw new Error("universe_empty");

  const payload = { symbols: normalized };
  const symbolSetHash = normalized.join("|");

  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into lq45_universe_snapshots (source, symbol_set_hash, payload) values ($1,$2,$3) returning *`,
      [source, symbolSetHash, payload]
    );
    const snapshot = inserted.rows[0] as UniverseSnapshot;
    for (const symbol of normalized) {
      await client.query(`insert into lq45_universe_symbols (snapshot_id, symbol) values ($1,$2)`, [snapshot.id, symbol]);
    }
    await client.query("commit");
    return snapshot;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getLatestUniverseSnapshot(): Promise<UniverseSnapshot | null> {
  const { rows } = await pool.query(`select * from lq45_universe_snapshots order by id desc limit 1`);
  return (rows[0] as UniverseSnapshot | undefined) ?? null;
}

export async function getLatestNonStaticUniverseSnapshot(): Promise<UniverseSnapshot | null> {
  const { rows } = await pool.query(
    `select * from lq45_universe_snapshots where source not like 'static_lq45%' order by id desc limit 1`
  );
  return (rows[0] as UniverseSnapshot | undefined) ?? null;
}

export async function deleteStaticUniverseSnapshots(): Promise<number> {
  const { rowCount } = await pool.query(`delete from lq45_universe_snapshots where source like 'static_lq45%'`);
  return rowCount ?? 0;
}

export function extractSymbols(snapshot: UniverseSnapshot): string[] {
  const symbols = snapshot.payload?.symbols;
  return Array.isArray(symbols) ? symbols : [];
}
