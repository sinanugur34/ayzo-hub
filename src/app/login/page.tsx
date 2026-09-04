import Link from "next/link";

import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-12 text-white">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-xs font-medium tracking-[0.15em] text-zinc-600 transition hover:text-zinc-300"
        >
          ← AYZO
        </Link>

        <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-violet-300">
            AYZO ACCOUNT
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
            Sign in securely
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Sign in to save your AYZO activity
            and manage your future Pro subscription.
          </p>

          <div className="mt-7">
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
