import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { columnIds, parsePresentationJson, presentationPath, validatePresentation } from "@/lib/kyc/presentation-schema";

const valid = { enabledFilters: ["status", "assignee"], columnOrder: [...columnIds], pageSize: 25 };

describe("presentation contract", () => {
  it("validates the committed raw JSON, including duplicate keys and byte size", () => {
    expect(() => parsePresentationJson(readFileSync(presentationPath, "utf8"))).not.toThrow();
  });

  it.each([10, 25, 50])("accepts every filter subset and required-column reversal at page size %s", (pageSize) => {
    for (let mask = 0; mask < 8; mask++) {
      const enabledFilters = ["status", "assignee", "country"].filter((_, index) => mask & (1 << index));
      const config = { enabledFilters, columnOrder: [...columnIds].reverse(), pageSize };
      expect(parsePresentationJson(JSON.stringify(config))).toEqual(config);
    }
  });

  it.each([
    ["unknown key", { ...valid, access: "admin" }],
    ["destination", { ...valid, destination: "https://example.test" }],
    ["missing key", { columnOrder: columnIds, pageSize: 25 }],
    ["unknown filter", { ...valid, enabledFilters: ["riskScore"] }],
    ["duplicate filter", { ...valid, enabledFilters: ["country", "country"] }],
    ["executable filter", { ...valid, enabledFilters: ["import('code')"] }],
    ["wrong filter type", { ...valid, enabledFilters: "status" }],
    ["nested filter", { ...valid, enabledFilters: [{ id: "status" }] }],
    ["unknown column", { ...valid, columnOrder: [...columnIds.slice(1), "riskScore"] }],
    ["duplicate column", { ...valid, columnOrder: [...columnIds.slice(1), "status"] }],
    ["missing action", { ...valid, columnOrder: columnIds.filter((id) => id !== "id") }],
    ["missing identity", { ...valid, columnOrder: columnIds.filter((id) => id !== "customerName") }],
    ["missing status", { ...valid, columnOrder: columnIds.filter((id) => id !== "status") }],
    ["unbounded page", { ...valid, pageSize: 1000000 }],
    ["fractional page", { ...valid, pageSize: 10.5 }],
    ["string page", { ...valid, pageSize: "25" }],
    ["zero page", { ...valid, pageSize: 0 }],
    ["null", null],
    ["array", [valid]],
  ])("rejects %s", (_, value) => {
    expect(() => parsePresentationJson(JSON.stringify(value))).toThrow();
  });

  it.each([
    '{"enabledFilters":[],"enabledFilters":["country"],"columnOrder":[],"pageSize":25}',
    String.raw`{"pageSize":10,"page\u0053ize":25,"enabledFilters":[],"columnOrder":[]}`,
    '{"enabledFilters":[],',
    `${JSON.stringify(valid)} trailing`,
    `\uFEFF${JSON.stringify(valid)}`,
    `${" ".repeat(4096)}${JSON.stringify(valid)}`,
  ])("rejects malformed, duplicate-key or oversized raw content", (source) => {
    expect(() => parsePresentationJson(source)).toThrow();
  });

  it("validates the imported value independently of the raw-file gate", () => {
    expect(validatePresentation(valid)).toEqual(valid);
    expect(() => validatePresentation({ ...valid, pageSize: Infinity })).toThrow();
  });
});
