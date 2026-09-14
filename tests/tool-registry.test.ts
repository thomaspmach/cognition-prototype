import { describe, expect, it } from "vitest";
import { filterTools, toolRegistry } from "@/lib/tool-registry";

describe("tool registry contracts", () => {
  it("keeps IDs and usable routes unique", () => {
    const ids = toolRegistry.map((tool) => tool.id);
    const routes = toolRegistry.flatMap((tool) => tool.route ? [tool.route] : []);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("never gives preview tools a destination", () => {
    const previews = toolRegistry.filter((tool) => tool.availability === "preview");
    expect(previews).toHaveLength(2);
    expect(previews.every((tool) => tool.route === null)).toBe(true);
  });

  it("finds names, descriptions and teams without case or whitespace surprises", () => {
    expect(filterTools("  KYC  ").map((tool) => tool.id)).toEqual(["kyc"]);
    expect(filterTools("COMPLIANCE").map((tool) => tool.id)).toEqual(["kyc"]);
    expect(filterTools("rollouts").map((tool) => tool.id)).toEqual(["feature-flags"]);
    expect(filterTools("   ")).toEqual(toolRegistry);
    expect(filterTools("unknown")).toEqual([]);
  });
});
