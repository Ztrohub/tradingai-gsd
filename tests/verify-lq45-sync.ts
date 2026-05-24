import { ensureSchema, pool } from "../src/db/client.js";
import { refreshUniverseSnapshot } from "../src/modules/data/universe.service.js";
import { fetchLq45UniverseFromProvider, fetchLq45UniverseSources } from "../src/modules/data/providers/universe.client.js";
import { extractSymbols, getLatestUniverseSnapshot } from "../src/modules/data/universe.repository.js";

function diff(left: string[], right: string[]): { onlyLeft: string[]; onlyRight: string[] } {
  const a = new Set(left);
  const b = new Set(right);
  return {
    onlyLeft: [...a].filter((item) => !b.has(item)).sort(),
    onlyRight: [...b].filter((item) => !a.has(item)).sort()
  };
}

async function main() {
  await ensureSchema();

  const providerData = await fetchLq45UniverseFromProvider();
  const sources = await fetchLq45UniverseSources();
  const synced = await refreshUniverseSnapshot();
  const latest = await getLatestUniverseSnapshot();

  if (!latest) throw new Error("latest_snapshot_not_found");

  const dbSymbols = extractSymbols(latest);
  const providerSymbols = providerData.symbols;
  const delta = diff(dbSymbols, providerSymbols);

  const sameContent =
    delta.onlyLeft.length === 0 &&
    delta.onlyRight.length === 0 &&
    dbSymbols.length === providerSymbols.length;

  const summary = {
    sameContent,
    providerSource: providerData.sourceUrl,
    snapshotSource: latest.source,
    dbCount: dbSymbols.length,
    providerCount: providerSymbols.length,
    dbSymbols,
    providerSymbols,
    onlyInDb: delta.onlyLeft,
    onlyInProvider: delta.onlyRight,
    sources: {
      infovesta: sources.infovesta ? { url: sources.infovesta.sourceUrl, count: sources.infovesta.symbols.length } : null,
      seputarforex: sources.seputarforex ? { url: sources.seputarforex.sourceUrl, count: sources.seputarforex.symbols.length } : null,
      sourceMismatchDelta: sources.delta,
      infovestaError: sources.infovestaError,
      seputarforexError: sources.seputarforexError
    },
    syncedSnapshotId: synced.id
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!sameContent) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("verify_lq45_sync_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
