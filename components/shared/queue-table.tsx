"use client";

import { Table, type TableProps } from "@/components/motion/table";
import { cn } from "@/lib/utils";

export function QueueTable<T>({ className, ...props }: TableProps<T>) {
  return (
    <Table
      {...props}
      className={cn("rounded-lg bg-card text-foreground", className)}
    />
  );
}
