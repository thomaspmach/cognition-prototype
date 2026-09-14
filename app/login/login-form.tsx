"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Input } from "@/components/motion/input";
import { ActionButton } from "@/components/shared/action-button";
import { Feedback } from "@/components/shared/feedback";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.status === 429
          ? "Too many sign-in attempts. Please wait a moment and try again."
          : "Sign-in failed. Check your email and password, then try again.");
      } else {
        router.replace("/");
        router.refresh();
      }
    } catch {
      setError("Could not reach the workspace. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <Input label="Email" type="email" autoComplete="username" required value={email}
        onChange={setEmail} classNames={{ field: "rounded-lg" }} />
      <Input label="Password" type="password" autoComplete="current-password" required value={password}
        onChange={setPassword} classNames={{ field: "rounded-lg" }} />
      {error && <Feedback tone="error">{error}</Feedback>}
      <ActionButton type="submit" state={busy ? "loading" : "idle"} loadingText="Signing in"
        className="w-full justify-center bg-primary text-primary-foreground">Sign in</ActionButton>
    </form>
  );
}
