import { describe, expect, it } from "vitest";
import { tabs } from "../src/ui/app-shell.js";
import { runStatusColor } from "../src/ui/components/run-status-badge.js";

describe("phase1 ui contract", () => {
  it("has required tabs", () => {
    expect(tabs).toEqual(["Provider Config", "Schedule", "Manual Runs", "Run History"]);
  });

  it("maps failed status to destructive color", () => {
    expect(runStatusColor("failed")).toBe("#C62828");
  });
});
