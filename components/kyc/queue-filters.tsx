"use client";

import { Input } from "@/components/motion/input";
import { statuses, statusLabels, type Reviewer } from "@/lib/kyc/model";
import { queuePresentation, type FilterId } from "@/lib/kyc/presentation";

export type FilterValues = { search: string; status: string; assignee: string; country: string };
export const emptyFilters: FilterValues = { search: "", status: "", assignee: "", country: "" };
export const selectClassName = "h-11 w-full rounded-lg border bg-card px-3 text-sm disabled:opacity-50";

export function QueueFilters({ values, onChange, reviewers, countries,
  enabledFilters = queuePresentation.enabledFilters }: {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  reviewers: Reviewer[];
  countries: string[];
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
    <div className="flex flex-wrap items-end gap-4">
      <Input label="Search customers" placeholder="Name or email" value={values.search}
        maxLength={120} onChange={(search) => onChange({ ...values, search })}
        className="min-w-48 flex-1" classNames={{ field: "rounded-lg bg-card" }} />
      {enabledFilters.map((filter) => (
        <label key={filter} className="flex min-w-36 flex-1 flex-col gap-1.5 text-sm font-medium sm:flex-none">
          {options[filter].label}
          <select className={selectClassName} value={values[filter]}
            onChange={(event) => onChange({ ...values, [filter]: event.target.value })}>
            <option value="">All {filter === "assignee" ? "assignees" : filter === "country" ? "countries" : "statuses"}</option>
            {options[filter].values.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
