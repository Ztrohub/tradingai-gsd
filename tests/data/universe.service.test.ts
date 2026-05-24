import { describe, expect, it } from "vitest";
import { loadWatchlistConfig } from "../../src/ui/routes/watchlist.js";

describe("phase 2 watchlist route contracts", () => {
  it("exports watchlist config loader", () => {
    expect(typeof loadWatchlistConfig).toBe("function");
  });
});
