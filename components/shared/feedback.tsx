import { CircleCheck, CircleAlert, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Feedback({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error";
}) {
  const Icon = { info: Info, success: CircleCheck, error: CircleAlert }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        tone === "info" && "border-primary/20 bg-primary/5 text-primary",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-950",
        tone === "error" && "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
