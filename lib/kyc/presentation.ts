export type FilterId = "status" | "assignee" | "country";

export const queuePresentation: { enabledFilters: readonly FilterId[] } = {
  enabledFilters: ["status", "assignee"],
};
