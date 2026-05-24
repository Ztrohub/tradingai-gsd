import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("phase2 watchlist manual override contract", () => {
  it("exposes override mode and watchlist symbol mutation endpoints", () => {
    const file = readFileSync(path.resolve("src/modules/data/data.routes.ts"), "utf8");
    expect(file).toContain('dataRouter.put("/watchlist/override-mode"');
    expect(file).toContain('dataRouter.post("/watchlist/current/symbols"');
    expect(file).toContain('dataRouter.put("/watchlist/current/symbols/:symbol"');
    expect(file).toContain('dataRouter.delete("/watchlist/current/symbols/:symbol"');
  });
});
