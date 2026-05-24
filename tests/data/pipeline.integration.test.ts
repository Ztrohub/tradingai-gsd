import { describe, expect, it } from "vitest";
import { runDailyPipeline, runWeeklyPipeline } from "../../src/modules/data/pipeline.service.js";

describe("data pipeline exports", () => {
  it("exports weekly and daily runners", () => {
    expect(typeof runWeeklyPipeline).toBe("function");
    expect(typeof runDailyPipeline).toBe("function");
  });
});
