"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function LoginForm() {
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
    sent,
    setSent,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

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
                true,
            },
          });

      if (authError) {
        setError(
          "We couldn't send the sign-in link. Please try again."
        );
        return;
      }

      setSent(true);
    } catch {
      setError(
        "We couldn't send the sign-in link. Please try again."
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
          We sent a secure AYZO sign-in link.
          Open it to continue.
        </p>
      </div>
    );
  }

  return (
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
        disabled={loading}
        className="h-14 w-full rounded-xl bg-white px-6 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Sending..."
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
        Passwordless sign-in.
        AYZO never asks for your wallet seed phrase
        or private key.
      </p>
    </form>
  );
}
