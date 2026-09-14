"use client";

import { ArrowRight, Search, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/motion/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { ToolIcon } from "@/components/workspace/tool-icon";
import { availabilityLabels, filterTools, toolRegistry } from "@/lib/tool-registry";
import { cn } from "@/lib/utils";

export function ToolCatalog() {
  const [query, setQuery] = useState("");
  const tools = filterTools(query);

  return (
    <section aria-labelledby="catalog-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h2 id="catalog-title" className="font-semibold">Internal tools</h2>
          <span className="rounded-md border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground">
            {toolRegistry.length}
          </span>
        </div>
        <div className="w-full sm:w-64">
          <Input
            label="Find a tool"
            placeholder="Search tools or teams"
            value={query}
            onChange={setQuery}
            leftIcon={<Search aria-hidden="true" className="size-4" />}
            reserveErrorLine={false}
            classNames={{
              label: "sr-only",
              field: "h-9 rounded-lg bg-card",
              input: "text-sm",
            }}
          />
        </div>
      </div>
      <p role="status" className="sr-only">{tools.length} tools shown</p>
      <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <article key={tool.id} aria-labelledby={`tool-${tool.id}`} className="flex min-w-0 flex-col rounded-xl border bg-card">
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-5 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-xl border",
                    tool.route ? "border-indigo-100 bg-indigo-50 text-primary" : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  <ToolIcon id={tool.id} />
                </span>
                <StatusBadge status={tool.route ? "info" : "neutral"}>
                  {availabilityLabels[tool.availability]}
                </StatusBadge>
              </div>
              <h3 id={`tool-${tool.id}`} className="text-base font-semibold tracking-tight">{tool.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{tool.description}</p>
              <dl className="mt-6 space-y-2 border-t pt-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <Users aria-hidden="true" className="size-3.5" />Owner
                  </dt>
                  <dd className="font-medium">{tool.responsibleTeam}</dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Planned access</dt>
                  <dd className="capitalize">{tool.accessRequirements.join(", ")}</dd>
                </div>
              </dl>
            </div>
            <div className="border-t px-5 py-4">
              {tool.route ? (
                <Link
                  href={tool.route}
                  aria-label={`Open ${tool.name} foundation`}
                  className="flex min-h-8 items-center justify-between gap-2 rounded-md text-sm font-medium text-primary hover:underline"
                >
                  Open foundation <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              ) : (
                <p className="flex min-h-8 items-center text-xs leading-5 text-muted-foreground">
                  Not implemented · No tool access yet
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      {tools.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <SearchX aria-hidden="true" className="mx-auto mb-3 size-6 text-muted-foreground" />
          <h3 className="font-medium">No matching tools</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try a tool name or a responsible team.</p>
          <button type="button" onClick={() => setQuery("")} className="mt-4 rounded-md px-3 py-2 font-medium text-primary hover:bg-indigo-50">
            Clear search
          </button>
        </div>
      )}
    </section>
  );
}
