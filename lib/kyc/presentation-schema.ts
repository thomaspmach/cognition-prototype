export const filterIds = ["status", "assignee", "country"] as const;
export const columnIds = ["id", "customerName", "country", "status", "assigneeName", "submittedAt"] as const;
export const pageSizes = [10, 25, 50] as const;
export const presentationPath = "lib/kyc/presentation.json";
export const maxPresentationBytes = 4096;

export type FilterId = (typeof filterIds)[number];
export type ColumnId = (typeof columnIds)[number];
export type QueuePresentation = {
  enabledFilters: FilterId[];
  columnOrder: ColumnId[];
  pageSize: (typeof pageSizes)[number];
};

function identifiers<T extends string>(value: unknown, allowed: readonly T[]): value is T[] {
  return Array.isArray(value)
    && value.every((item: unknown) => typeof item === "string" && allowed.some((id) => id === item))
    && new Set(value).size === value.length;
}

export function validatePresentation(value: unknown): QueuePresentation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Presentation must be an object.");
  }
  const keys = Object.keys(value);
  if (keys.length !== 3 || !keys.every((key) => ["enabledFilters", "columnOrder", "pageSize"].includes(key))) {
    throw new Error("Presentation requires exactly enabledFilters, columnOrder and pageSize.");
  }
  if (!("enabledFilters" in value) || !identifiers(value.enabledFilters, filterIds)) {
    throw new Error("Filters must be unique supported identifiers.");
  }
  if (!("columnOrder" in value) || !identifiers(value.columnOrder, columnIds)
    || value.columnOrder.length !== columnIds.length) {
    throw new Error("Column order must contain every authorized column exactly once.");
  }
  if (!("pageSize" in value) || (value.pageSize !== 10 && value.pageSize !== 25 && value.pageSize !== 50)) {
    throw new Error("Page size must be 10, 25 or 50.");
  }
  return { enabledFilters: value.enabledFilters, columnOrder: value.columnOrder, pageSize: value.pageSize };
}

export function parsePresentationJson(source: string): QueuePresentation {
  if (new TextEncoder().encode(source).length > maxPresentationBytes) {
    throw new Error("Presentation exceeds 4 KiB.");
  }
  const value: unknown = JSON.parse(source);
  const tokens = source.match(/"(?:[^"\\]|\\.)*"|:/g) ?? [];
  const keys = new Set<string>();
  for (let index = 0; index < tokens.length - 1; index++) {
    if (tokens[index + 1] !== ":") continue;
    const key: string = JSON.parse(tokens[index]);
    if (keys.has(key)) throw new Error("Duplicate JSON property.");
    keys.add(key);
  }
  return validatePresentation(value);
}
