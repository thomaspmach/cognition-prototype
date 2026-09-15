import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background p-5">
      <section className="w-full max-w-sm rounded-xl border bg-card p-8" aria-labelledby="login-title">
        <h1 id="login-title" className="text-[28px] leading-9 font-semibold tracking-tight">Welcome back</h1>
        <LoginForm />
        <p className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">
          Local demonstration · Synthetic accounts and cases only.
        </p>
      </section>
    </main>
  );
}
