"use client";

import { LogOut, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AccountMenu() {
  const router = useRouter();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const signOutRef = useRef<HTMLButtonElement>(null);
  const focusFrame = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, bottom: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const close = () => {
      const menu = menuRef.current;
      if (menu?.matches(":popover-open")) menu.hidePopover();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    };
  }, []);

  useEffect(() => {
    if (error) triggerRef.current?.focus({ preventScroll: true });
  }, [error]);

  function positionMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(176, window.innerWidth - 16);
    setCoords({
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      bottom: window.innerHeight - rect.top + 8,
    });
  }

  async function signOut() {
    menuRef.current?.hidePopover();
    setBusy(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign-out failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="contents text-xs" title="">
      <button ref={triggerRef} type="button" disabled={busy} aria-busy={busy}
        aria-label="Account menu" title={busy ? "Signing out…" : "Account menu"}
        aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} popoverTarget={menuId}
        onClick={positionMenu}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            positionMenu();
            menuRef.current?.showPopover();
          }
        }}
        className="inline-flex size-9 items-center justify-center justify-self-end rounded-lg border hover:bg-muted disabled:opacity-50">
        <MoreHorizontal aria-hidden="true" className="size-4" />
      </button>
      <div ref={menuRef} id={menuId} popover="auto" role="menu" aria-label="Account actions"
        onBeforeToggle={(event) => {
          const opening = event.newState === "open";
          setOpen(opening);
          if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
          focusFrame.current = opening ? requestAnimationFrame(() => {
            focusFrame.current = null;
            if (menuRef.current?.matches(":popover-open")) signOutRef.current?.focus({ preventScroll: true });
          }) : null;
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== triggerRef.current) {
            event.currentTarget.hidePopover();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" || (event.key === "Tab" && event.shiftKey)) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.hidePopover();
            triggerRef.current?.focus({ preventScroll: true });
          } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            signOutRef.current?.focus({ preventScroll: true });
          }
        }}
        style={coords}
        className="fixed inset-auto m-0 w-44 max-w-[calc(100vw-16px)] rounded-lg border bg-card p-2 text-sm text-foreground shadow-lg">
        <button ref={signOutRef} type="button" role="menuitem" onClick={signOut} disabled={busy || !open}
          className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted focus-visible:bg-muted disabled:opacity-50">
          <LogOut aria-hidden="true" className="size-4" />
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
      {error && <span role="alert" className="col-span-full mt-2 min-w-0 break-words text-destructive">Sign-out failed. Retry.</span>}
    </div>
  );
}
