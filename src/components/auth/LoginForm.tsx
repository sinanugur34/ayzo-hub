"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  trackEvent,
} from "@/lib/analytics/client";

export default function LoginForm({
  mode,
}: {
  mode:
    | "signin"
    | "signup";
}) {
  const isSignup =
    mode ===
    "signup";

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] =
    useState(false);

  const [
    sent,
    setSent,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function continueWithGoogle() {
    setGoogleLoading(true);
    setError("");

    trackEvent(
      "login_started",
      {
        method:
          "google_oauth",
      }
    );

    try {
      const supabase =
        createClient();

      const redirectTo =
        `${window.location.origin}` +
        "/auth/callback";

      const {
        error:
          authError,
      } =
        await supabase.auth
          .signInWithOAuth({
            provider:
              "google",

            options: {
              redirectTo,

              queryParams: {
                prompt:
                  "select_account",
              },
            },
          });

      if (authError) {
        trackEvent(
          "login_failed",
          {
            method:
              "google_oauth",
          }
        );

        setError(
          "Google authentication is temporarily unavailable. Please use email instead."
        );

        setGoogleLoading(false);
      }
    } catch {
      trackEvent(
        "login_failed",
        {
          method:
            "google_oauth",
        }
      );

      setError(
        "Google authentication is temporarily unavailable. Please use email instead."
      );

      setGoogleLoading(false);
    }
  }

  async function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalized =
      email
        .trim()
        .toLowerCase();

    if (!normalized) {
      return;
    }

    setLoading(true);
    setError("");

    trackEvent(
      "login_started",
      {
        method:
          "email_otp",
      }
    );

    try {
      const supabase =
        createClient();

      const redirectTo =
        `${window.location.origin}` +
        "/auth/callback";

      const {
        error:
          authError,
      } =
        await supabase.auth
          .signInWithOtp({
            email:
              normalized,

            options: {
              emailRedirectTo:
                redirectTo,

              shouldCreateUser:
                isSignup,
            },
          });

      if (authError) {
        trackEvent(
          "login_failed",
          {
            method:
              "email_otp",
          }
        );

        setError(
          isSignup
            ? "We couldn't create your account. Please try again."
            : "We couldn't send the sign-in link. Check your email or create an account."
        );

        return;
      }

      trackEvent(
        "login_link_sent",
        {
          method:
            "email_otp",
        }
      );

      setSent(true);
    } catch {
      trackEvent(
        "login_failed",
        {
          method:
            "email_otp",
        }
      );

      setError(
        isSignup
          ? "We couldn't create your account. Please try again."
          : "We couldn't send the sign-in link. Check your email or create an account."
      );
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-left">
        <div className="text-sm font-medium text-emerald-300">
          Check your email
        </div>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {isSignup
            ? "We sent a secure AYZO account link. Open it to finish creating your account."
            : "We sent a secure AYZO sign-in link. Open it to continue."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={
          googleLoading ||
          loading
        }
        onClick={
          continueWithGoogle
        }
        className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
        >
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.61A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.41 13.94A6.02 6.02 0 0 1 6.1 12c0-.67.11-1.32.31-1.94V7.45H3.07A10 10 0 0 0 2 12c0 1.61.38 3.14 1.07 4.55l3.34-2.61Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.45l3.34 2.61C7.2 7.7 9.4 5.94 12 5.94Z"
          />
        </svg>

        {googleLoading
          ? "Connecting..."
          : "Continue with Google"}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-900" />

        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          or continue with email
        </span>

        <div className="h-px flex-1 bg-zinc-900" />
      </div>

      <form
        onSubmit={submit}
        className="space-y-3"
      >
        <label
          htmlFor="email"
          className="block text-left text-xs font-medium text-zinc-400"
        >
          Email address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={
            event =>
              setEmail(
                event.target.value
              )
          }
          placeholder="you@email.com"
          className="h-14 w-full rounded-xl border border-zinc-700 bg-black/40 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500"
        />

        <button
          type="submit"
          disabled={
            loading ||
            googleLoading
          }
          className="h-14 w-full rounded-xl bg-white px-6 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Sending..."
            : isSignup
              ? "Create account"
              : "Continue with email"}
        </button>

        {error && (
          <p
            role="alert"
            className="text-xs leading-5 text-rose-300"
          >
            {error}
          </p>
        )}

        <p className="text-center text-[10px] leading-5 text-zinc-600">
          Passwordless authentication.
          AYZO never asks for your wallet seed phrase
          or private key.
        </p>
      </form>
    </div>
  );
}
