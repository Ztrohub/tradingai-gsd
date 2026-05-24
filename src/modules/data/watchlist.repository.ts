import { pool } from "../../db/client.js";

export type RankedSymbol = {
  symbol: string;
  rank: number;
  score: number;
  scoreDetail: Record<string, unknown>;
};

export async function createWatchlist(runId: number, targetSize: number, rankedSymbols: RankedSymbol[]) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const created = await client.query(
      `insert into watchlists (run_id, target_size, status) values ($1,$2,'active') returning *`,
      [runId, targetSize]
    );
    const watchlist = created.rows[0] as { id: number };
    for (const row of rankedSymbols) {
      await client.query(
        `insert into watchlist_symbols (watchlist_id, symbol, rank, score, score_detail) values ($1,$2,$3,$4,$5)`,
        [watchlist.id, row.symbol, row.rank, row.score, row.scoreDetail]
      );
    }
    await client.query("commit");
    return watchlist;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getLatestWatchlistSymbols(): Promise<string[]> {
  const { rows } = await pool.query(
    `select ws.symbol
     from watchlists w
     join watchlist_symbols ws on ws.watchlist_id = w.id
     where w.id = (select id from watchlists order by id desc limit 1)
     order by ws.rank asc`
  );
  return rows.map((r) => String(r.symbol));
}

export async function upsertMarketData(
  tradeDate: string,
  symbol: string,
  provider: string,
  ohlcv: { open: number; high: number; low: number; close: number; volume: number }
) {
  await pool.query(
    `insert into market_data_daily (trade_date, symbol, provider, open, high, low, close, volume)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (trade_date, symbol)
     do update set provider=excluded.provider, open=excluded.open, high=excluded.high, low=excluded.low, close=excluded.close, volume=excluded.volume`,
    [tradeDate, symbol, provider, ohlcv.open, ohlcv.high, ohlcv.low, ohlcv.close, ohlcv.volume]
  );
}

export async function upsertIndicators(tradeDate: string, symbol: string, indicators: Record<string, number>) {
  for (const [name, value] of Object.entries(indicators)) {
    await pool.query(
      `insert into indicator_daily (trade_date, symbol, name, value)
       values ($1,$2,$3,$4)
       on conflict (trade_date, symbol, name) do update set value=excluded.value`,
      [tradeDate, symbol, name, value]
    );
  }
}

export async function upsertSentiment(
  tradeDate: string,
  symbol: string,
  provider: string,
  headlineCount: number,
  sentimentScore: number
) {
  await pool.query(
    `insert into sentiment_daily (trade_date, symbol, provider, headline_count, sentiment_score)
     values ($1,$2,$3,$4,$5)
     on conflict (trade_date, symbol)
     do update set provider=excluded.provider, headline_count=excluded.headline_count, sentiment_score=excluded.sentiment_score`,
    [tradeDate, symbol, provider, headlineCount, sentimentScore]
  );
}

export async function appendDataFetchError(input: {
  runId: number;
  tradeDate: string;
  symbol: string;
  dataType: string;
  provider: string;
  errorCode: string;
  message: string;
  retryable: boolean;
}) {
  await pool.query(
    `insert into data_fetch_errors (run_id, trade_date, symbol, data_type, provider, error_code, message, retryable)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [input.runId, input.tradeDate, input.symbol, input.dataType, input.provider, input.errorCode, input.message, input.retryable]
  );
}

export async function upsertWatchlistDebateDecision(input: {
  runId: number;
  symbol: string;
  decision: "INCLUDE" | "EXCLUDE";
  confidence: number;
  rankHint: number;
  rationale: string;
  riskFlags: string[];
  debateTrace: Record<string, string>;
  provider: string;
  model: string;
  rawResponse: Record<string, unknown>;
}) {
  await pool.query(
    `insert into ai_watchlist_decisions (
      run_id, symbol, decision, confidence, rank_hint, rationale, risk_flags, debate_trace, provider, model, raw_response
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (run_id, symbol)
     do update set
       decision=excluded.decision,
       confidence=excluded.confidence,
       rank_hint=excluded.rank_hint,
       rationale=excluded.rationale,
       risk_flags=excluded.risk_flags,
       debate_trace=excluded.debate_trace,
       provider=excluded.provider,
       model=excluded.model,
       raw_response=excluded.raw_response`,
    [
      input.runId,
      input.symbol,
      input.decision,
      input.confidence,
      input.rankHint,
      input.rationale,
      JSON.stringify(input.riskFlags),
      JSON.stringify(input.debateTrace),
      input.provider,
      input.model,
      JSON.stringify(input.rawResponse)
    ]
  );
}

export async function listCurrentWatchlist() {
  const { rows } = await pool.query(
    `select w.id as watchlist_id, w.created_at, w.target_size, ws.symbol, ws.rank, ws.score, ws.score_detail
     from watchlists w
     join watchlist_symbols ws on ws.watchlist_id = w.id
     where w.id = (select id from watchlists order by id desc limit 1)
     order by ws.rank asc`
  );
  return rows;
}

export async function listWatchlistHistory(limit = 10) {
  const { rows } = await pool.query(`select id, run_id, target_size, status, created_at from watchlists order by id desc limit $1`, [limit]);
  return rows;
}

export async function getDailyDataStatus(tradeDate: string) {
  const { rows } = await pool.query(
    `select m.symbol, m.provider as market_provider, m.close, s.provider as sentiment_provider, s.sentiment_score
     from market_data_daily m
     left join sentiment_daily s on s.trade_date = m.trade_date and s.symbol = m.symbol
     where m.trade_date = $1
     order by m.symbol asc`,
    [tradeDate]
  );
  return rows;
}

export async function readWatchlistConfig(): Promise<{ targetSize: number; manualOverrideEnabled: boolean }> {
  const { rows } = await pool.query(`select target_size, manual_override_enabled from watchlist_configs order by id desc limit 1`);
  if (!rows[0]) {
    await pool.query(`insert into watchlist_configs (target_size, manual_override_enabled) values (10, false)`);
    return { targetSize: 10, manualOverrideEnabled: false };
  }
  return { targetSize: Number(rows[0].target_size), manualOverrideEnabled: Boolean(rows[0].manual_override_enabled) };
}

export async function writeWatchlistConfig(input: {
  targetSize: number;
  manualOverrideEnabled?: boolean;
}): Promise<{ targetSize: number; manualOverrideEnabled: boolean }> {
  const current = await readWatchlistConfig();
  const manualOverrideEnabled =
    typeof input.manualOverrideEnabled === "boolean" ? input.manualOverrideEnabled : current.manualOverrideEnabled;
  await pool.query(`insert into watchlist_configs (target_size, manual_override_enabled, updated_at) values ($1, $2, now())`, [
    input.targetSize,
    manualOverrideEnabled
  ]);
  return { targetSize: input.targetSize, manualOverrideEnabled };
}

async function getCurrentWatchlistId(): Promise<number | null> {
  const { rows } = await pool.query(`select id from watchlists order by id desc limit 1`);
  return rows[0] ? Number(rows[0].id) : null;
}

export async function addWatchlistSymbol(symbol: string) {
  const watchlistId = await getCurrentWatchlistId();
  if (!watchlistId) throw new Error("watchlist_not_found");
  const normalized = symbol.trim().toUpperCase();

  const { rows } = await pool.query(`select symbol from watchlist_symbols where watchlist_id=$1`, [watchlistId]);
  const currentSymbols = rows.map((r) => String(r.symbol));
  if (currentSymbols.includes(normalized)) throw new Error("symbol_exists");
  const rank = currentSymbols.length + 1;
  await pool.query(
    `insert into watchlist_symbols (watchlist_id, symbol, rank, score, score_detail) values ($1,$2,$3,$4,$5)`,
    [watchlistId, normalized, rank, 0, { manual: true }]
  );
}

export async function updateWatchlistSymbol(oldSymbol: string, newSymbol: string) {
  const watchlistId = await getCurrentWatchlistId();
  if (!watchlistId) throw new Error("watchlist_not_found");
  const oldNormalized = oldSymbol.trim().toUpperCase();
  const newNormalized = newSymbol.trim().toUpperCase();

  const { rows } = await pool.query(`select symbol from watchlist_symbols where watchlist_id=$1`, [watchlistId]);
  const currentSymbols = rows.map((r) => String(r.symbol));
  if (!currentSymbols.includes(oldNormalized)) throw new Error("symbol_not_found");
  if (oldNormalized !== newNormalized && currentSymbols.includes(newNormalized)) throw new Error("symbol_exists");
  await pool.query(`update watchlist_symbols set symbol=$3 where watchlist_id=$1 and symbol=$2`, [watchlistId, oldNormalized, newNormalized]);
}

export async function deleteWatchlistSymbol(symbol: string) {
  const watchlistId = await getCurrentWatchlistId();
  if (!watchlistId) throw new Error("watchlist_not_found");
  const normalized = symbol.trim().toUpperCase();
  const { rowCount } = await pool.query(`delete from watchlist_symbols where watchlist_id=$1 and symbol=$2`, [watchlistId, normalized]);
  if (!rowCount) throw new Error("symbol_not_found");
  await renormalizeWatchlistRanks(watchlistId);
}

async function renormalizeWatchlistRanks(watchlistId: number) {
  const { rows } = await pool.query(`select id from watchlist_symbols where watchlist_id=$1 order by rank asc, id asc`, [watchlistId]);
  for (let i = 0; i < rows.length; i += 1) {
    await pool.query(`update watchlist_symbols set rank=$2 where id=$1`, [rows[i].id, i + 1]);
  }
}
