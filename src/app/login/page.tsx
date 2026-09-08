import Link from "next/link";

import LoginForm from "@/components/auth/LoginForm";

import {
  resolveLoginMode,
} from "@/lib/auth/loginMode";

type LoginPageProps = {
  searchParams:
    Promise<{
      mode?:
        | string
        | string[];
    }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params =
    await searchParams;

  const mode =
    resolveLoginMode(
      params.mode
    );

  const isSignup =
    mode ===
    "signup";

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
            {isSignup
              ? "Create your AYZO account"
              : "Sign in securely"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {isSignup
              ? "Create an account to save analyses, build watchlists and access your AYZO plan."
              : "Sign in to access your saved research, watchlists and AYZO plan."}
          </p>

          <div className="mt-7">
            <LoginForm
              mode={
                mode
              }
            />
          </div>

          <div className="mt-6 border-t border-zinc-900 pt-5 text-center text-xs text-zinc-500">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link
                  href="/login?mode=signin"
                  className="font-medium text-violet-300 transition hover:text-violet-200"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to AYZO?{" "}
                <Link
                  href="/login?mode=signup"
                  className="font-medium text-violet-300 transition hover:text-violet-200"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
