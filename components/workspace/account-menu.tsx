"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AccountMenu({ actor }: { actor: { name: string; role: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
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
    <div className="flex items-center gap-3 text-xs">
      <div className="hidden text-right sm:block">
        <p className="font-medium">{actor.name}</p>
        <p className="mt-0.5 text-muted-foreground capitalize">{actor.role}</p>
      </div>
      <button onClick={signOut} disabled={busy} className="rounded-lg border px-3 py-2 hover:bg-muted disabled:opacity-50">
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <span role="alert">Sign-out failed. Retry.</span>}
    </div>
  );
}
