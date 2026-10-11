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

      error?:
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

  const errorParam =
    Array.isArray(
      params.error
    )
      ? params.error[0]
      : params.error;

  const securityMessage =
    errorParam ===
      "device_replaced"
      ? "This session was signed out because your AYZO account was opened on another device."
      : errorParam ===
          "device_registration"
        ? "AYZO could not securely register this device. Please sign in again."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b1020] px-4 py-12 text-[#f3f6fc]">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-xs font-medium tracking-[0.15em] text-[#7f8da8] transition hover:text-[#f3f6fc]"
        >
          ← AYZO
        </Link>

        <section className="mt-8 rounded-3xl border border-[#2c3952] bg-[#101829]/95 p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-[#baa7ff]">
            AYZO ACCOUNT
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">
            {isSignup
              ? "Create your AYZO account"
              : "Sign in securely"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#a8b5cc]">
            {isSignup
              ? "Create an account to save analyses, build watchlists and access your AYZO plan."
              : "Sign in to access your saved research, watchlists and AYZO plan."}
          </p>

          {securityMessage && (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-5 text-amber-200"
            >
              {securityMessage}
            </div>
          )}

          <div className="mt-7">
            <LoginForm
              mode={
                mode
              }
            />
          </div>

          <div className="mt-6 border-t border-[#2c3952] pt-5 text-center text-xs text-[#a8b5cc]">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link
                  href="/login?mode=signin"
                  className="font-medium text-[#baa7ff] transition hover:text-[#d8ceff]"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to AYZO?{" "}
                <Link
                  href="/login?mode=signup"
                  className="font-medium text-[#baa7ff] transition hover:text-[#d8ceff]"
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
