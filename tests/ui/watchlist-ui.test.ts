import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("universe/watchlist UI contract", () => {
  it("renders universe tab and explicit action buttons", () => {
    const html = readFileSync(path.resolve("src/ui/public/index.html"), "utf8");
    expect(html).toContain('data-tab="universe"');
    expect(html).toContain("Sync LQ45 Universe");
    expect(html).toContain("Run Weekly Selection");
    expect(html).toContain('id="watchlist-accordion"');
  });

  it("wires actions in browser script", () => {
    const app = readFileSync(path.resolve("src/ui/public/app.js"), "utf8");
    expect(app).toContain('"/api/universe/sync"');
    expect(app).toContain('"/api/actions/run-weekly-selection"');
    expect(app).toContain('"/api/watchlist/override-mode"');
    expect(app).toContain("waitForRunCompletion");
    expect(app).toContain("Base metrics: Last OHLCV + SMA20/SMA50 + Momentum/Range");
    expect(app).toContain('document.createElement("details")');
    expect(app).toContain('className = "watch-item"');
    expect(app).toContain("formatPercent(detail.momentum20, 2)");
    expect(app).toContain("formatNumber(detail.sma20, 2)");
    expect(app).toContain("Weekly selection completed and watchlist updated");
    expect(app).toContain("Weekly run completed and watchlist updated");
  });
});
