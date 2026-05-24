const INFOVESTA_URL = "https://www.infovesta.com/index/stock/LQ45";
const SEPUTARFOREX_URL = "https://www.seputarforex.org/saham/lq_45/";

type SourceId = "infovesta" | "seputarforex";

export type ScrapeResult = {
  sourceId: SourceId;
  sourceUrl: string;
  symbols: string[];
};

function normalizeSymbols(raw: string[]): string[] {
  const filtered = raw
    .map((item) => item.trim().toUpperCase().replace(/\.JK$/, ""))
    .filter((item) => /^[A-Z]{4}$/.test(item));
  return Array.from(new Set(filtered)).sort();
}

function parseInfovestaSymbols(html: string): string[] {
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return [];
  const tbody = tbodyMatch[1];

  const matches = new Set<string>();
  const tdCellRegex = /<td[^>]*>\s*([A-Za-z]{4})\s*<\/td>/g;
  let m: RegExpExecArray | null;
  while ((m = tdCellRegex.exec(tbody)) !== null) matches.add(m[1]);

  return normalizeSymbols([...matches]);
}

function parseSeputarforexSymbols(html: string): string[] {
  const start = html.indexOf("Daftar Saham LQ45");
  const segment = start >= 0 ? html.slice(start) : html;
  const end = segment.indexOf("Lihat informasi dan grafik harga indeks");
  const scoped = end > 0 ? segment.slice(0, end) : segment;

  const matches = new Set<string>();
  const codeRegex = /kode=([A-Za-z]{4})/g;
  let m: RegExpExecArray | null;
  while ((m = codeRegex.exec(scoped)) !== null) matches.add(m[1]);

  return normalizeSymbols([...matches]);
}

function diffSymbols(left: string[], right: string[]): { onlyLeft: string[]; onlyRight: string[] } {
  const a = new Set(left);
  const b = new Set(right);
  return {
    onlyLeft: [...a].filter((item) => !b.has(item)).sort(),
    onlyRight: [...b].filter((item) => !a.has(item)).sort()
  };
}

function ensureReasonableCount(source: SourceId, symbols: string[]) {
  if (symbols.length !== 45) {
    throw new Error(`${source}_invalid_count_${symbols.length}`);
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ai-trade-bot/1.0)",
      Accept: "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(20000)
  });

  if (!res.ok) throw new Error(`scrape_http_${res.status}`);
  return await res.text();
}

async function scrapeSource(sourceId: SourceId, url: string): Promise<ScrapeResult> {
  const html = await fetchHtml(url);
  const symbols = sourceId === "infovesta" ? parseInfovestaSymbols(html) : parseSeputarforexSymbols(html);
  ensureReasonableCount(sourceId, symbols);
  return { sourceId, sourceUrl: url, symbols };
}

export async function fetchLq45UniverseSources() {
  let infovesta: ScrapeResult | null = null;
  let seputarforex: ScrapeResult | null = null;
  let infovestaError: unknown = null;
  let seputarforexError: unknown = null;

  try {
    infovesta = await scrapeSource("infovesta", INFOVESTA_URL);
  } catch (error) {
    infovestaError = error;
  }

  try {
    seputarforex = await scrapeSource("seputarforex", SEPUTARFOREX_URL);
  } catch (error) {
    seputarforexError = error;
  }

  const delta = infovesta && seputarforex ? diffSymbols(infovesta.symbols, seputarforex.symbols) : null;

  return {
    infovesta,
    seputarforex,
    infovestaError: infovestaError ? String(infovestaError) : null,
    seputarforexError: seputarforexError ? String(seputarforexError) : null,
    delta
  };
}

export async function fetchLq45UniverseFromProvider(): Promise<ScrapeResult> {
  const { infovesta, seputarforex, infovestaError, seputarforexError, delta } = await fetchLq45UniverseSources();

  if (infovesta && seputarforex) {
    if (delta && delta.onlyLeft.length === 0 && delta.onlyRight.length === 0) {
      return infovesta;
    }

    // If primary source drifts from cross-check source, treat it as failed and use fallback.
    return seputarforex;
  }

  if (infovesta) return infovesta;
  if (seputarforex) return seputarforex;

  throw new Error(
    `lq45_scrape_failed:infovesta=${String(infovestaError)};seputarforex=${String(seputarforexError)}`
  );
}
