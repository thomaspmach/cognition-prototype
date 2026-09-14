import config from "./presentation.json" with { type: "json" };
import { validatePresentation } from "./presentation-schema.ts";

export type { FilterId } from "./presentation-schema.ts";
export const queuePresentation = validatePresentation(config);
