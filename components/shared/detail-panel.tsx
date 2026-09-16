"use client";

import { FocusTrap } from "focus-trap-react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Drawer } from "@/components/motion/drawer";

export function DetailPanel({
  open,
  onOpenChange,
  title,
  description,
  ariaLabel,
  badge,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  ariaLabel?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel={ariaLabel || title}
      className="w-[700px] max-w-[100vw] border-l bg-card shadow-xl"
      backdropClassName="bg-black/20 backdrop-blur-none"
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          escapeDeactivates: false,
          allowOutsideClick: true,
          returnFocusOnDeactivate: true,
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b p-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="break-words text-lg font-semibold tracking-tight">{title}</h2>
                {badge}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{description}</p>
            </div>
            <button
              type="button"
              aria-label="Close detail panel"
              onClick={() => onOpenChange(false)}
              className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-muted"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>
        </div>
      </FocusTrap>
    </Drawer>
  );
}
