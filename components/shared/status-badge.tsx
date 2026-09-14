"use client";

import type { ReactNode } from "react";
import {
  AnimatedBadge,
  type AnimatedBadgeStatus,
} from "@/components/motion/animated-badge";

export function StatusBadge({
  children,
  status = "neutral",
}: {
  children: ReactNode;
  status?: AnimatedBadgeStatus;
}) {
  return (
    <AnimatedBadge status={status} size="sm" className="rounded-md font-medium">
      {children}
    </AnimatedBadge>
  );
}
