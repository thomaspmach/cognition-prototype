import { Flag, RotateCcw, ShieldCheck } from "lucide-react";
import type { ToolId } from "@/lib/tool-registry";

const icons = { kyc: ShieldCheck, refunds: RotateCcw, "feature-flags": Flag };

export function ToolIcon({ id, className }: { id: ToolId; className?: string }) {
  const Icon = icons[id];
  return <Icon aria-hidden="true" className={className ?? "size-5"} strokeWidth={1.7} />;
}
