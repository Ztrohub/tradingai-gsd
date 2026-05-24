import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("phase2 universe CRUD contract", () => {
  it("exposes universe CRUD and sync endpoints", () => {
    const file = readFileSync(path.resolve("src/modules/data/data.routes.ts"), "utf8");
    expect(file).toContain('dataRouter.get("/universe"');
    expect(file).toContain('dataRouter.post("/universe/sync"');
    expect(file).toContain('dataRouter.post("/universe"');
    expect(file).toContain('dataRouter.put("/universe/:symbol"');
    expect(file).toContain('dataRouter.delete("/universe/:symbol"');
  });
});
