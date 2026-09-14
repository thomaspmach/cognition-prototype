"use client";

import {
  StatefulButton,
  type StatefulButtonProps,
} from "@/components/motion/button/stateful";
import { cn } from "@/lib/utils";

export function ActionButton({ className, ...props }: StatefulButtonProps) {
  return (
    <StatefulButton
      {...props}
      className={cn("min-h-9 rounded-lg px-3 text-sm font-medium", className)}
    />
  );
}
