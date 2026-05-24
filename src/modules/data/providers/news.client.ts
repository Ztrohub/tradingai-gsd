export async function fetchSymbolSentiment(symbol: string, tradeDate: string) {
  const seed = symbol.length * 13 + tradeDate.length;
  const headlineCount = 3 + (seed % 7);
  const sentimentScore = Number((((seed % 200) - 100) / 100).toFixed(2));
  return { provider: "news-aggregator", headlineCount, sentimentScore };
}
