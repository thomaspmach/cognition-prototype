"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/shared/action-button";
import { Feedback } from "@/components/shared/feedback";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <main className="grid min-h-svh place-items-center bg-background p-5">
      <section className="w-full max-w-md space-y-6 rounded-xl border bg-card p-6" aria-labelledby="error-title">
        <h1 id="error-title" className="text-[28px] leading-9 font-semibold tracking-tight">Unable to load the workspace</h1>
        <Feedback tone="error">Please try again. If the problem continues, contact Engineering.</Feedback>
        <ActionButton
          state={pending ? "loading" : "idle"}
          loadingText="Trying again"
          onClick={() => startTransition(() => { router.refresh(); reset(); })}
        >
          Try again
        </ActionButton>
      </section>
    </main>
  );
}
