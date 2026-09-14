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
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      ariaLabel={title}
      className="w-[440px] max-w-[100vw] border-l bg-card shadow-xl"
    >
      <FocusTrap
        active={open}
        focusTrapOptions={{
          escapeDeactivates: false,
          allowOutsideClick: true,
          returnFocusOnDeactivate: true,
        }}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          <header className="flex items-start justify-between gap-4 border-b p-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
            <button
              type="button"
              aria-label="Close detail panel"
              onClick={() => onOpenChange(false)}
              className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-muted"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </header>
          <div className="p-6">{children}</div>
        </div>
      </FocusTrap>
    </Drawer>
  );
}
