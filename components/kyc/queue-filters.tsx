"use client";

import { ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/motion/input";
import { statuses, statusLabels, type Reviewer } from "@/lib/kyc/model";
import { queuePresentation, type FilterId } from "@/lib/kyc/presentation";
import { cn } from "@/lib/utils";

export type FilterValues = { search: string; status: string; assignee: string; country: string };
export const emptyFilters: FilterValues = { search: "", status: "", assignee: "", country: "" };
export const selectClassName = "h-11 w-full rounded-lg border bg-card px-3 text-sm disabled:opacity-50";

export function QueueFilters({ values, onChange, reviewers, countries, children,
  enabledFilters = queuePresentation.enabledFilters }: {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  reviewers: Reviewer[];
  countries: string[];
  children?: ReactNode;
  enabledFilters?: readonly FilterId[];
}) {
  const options: Record<FilterId, { label: string; values: { value: string; label: string }[] }> = {
    status: { label: "Status", values: statuses.map((value) => ({ value, label: statusLabels[value] })) },
    assignee: { label: "Assignee", values: [
      { value: "unassigned", label: "Unassigned" },
      ...reviewers.map((reviewer) => ({ value: reviewer.id, label: reviewer.name })),
    ] },
    country: { label: "Country", values: countries.map((value) => ({ value, label: value })) },
  };
  return (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-4">
      <Input label="Search customers" placeholder="Name or email" value={values.search}
        leftIcon={<Search aria-hidden="true" className="size-4" />}
        maxLength={120} onChange={(search) => onChange({ ...values, search })}
        className="min-w-48 flex-1" classNames={{ label: "sr-only", field: "rounded-lg bg-card" }} />
      {enabledFilters.map((filter) => (
        <label key={filter} className="relative flex min-w-36 flex-1 flex-col gap-1.5 text-sm font-medium sm:flex-none">
          <span className="sr-only">{options[filter].label}</span>
          <select className={cn(selectClassName, "appearance-none pr-10", values[filter] ? "text-foreground" : "text-muted-foreground/60")} value={values[filter]}
            onChange={(event) => onChange({ ...values, [filter]: event.target.value })}>
            <option value="" className="text-muted-foreground/60">All {filter === "assignee" ? "assignees" : filter === "country" ? "countries" : "statuses"}</option>
            {options[filter].values.map((option) => (
              <option key={option.value} value={option.value} className="text-foreground">{option.label}</option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className={cn(
            "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2",
            values[filter] ? "text-foreground" : "text-muted-foreground/60",
          )} />
        </label>
      ))}
      {children}
    </div>
  );
}
