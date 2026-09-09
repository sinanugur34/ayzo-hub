"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type HeaderAccountState = {
  authenticated:
    boolean;

  email:
    string | null;

  plan:
    | "free"
    | "pro"
    | "advanced";
};

function isHeaderAccountState(
  value:
    unknown
): value is HeaderAccountState {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof record
      .authenticated ===
      "boolean" &&
    (
      record.email ===
        null ||
      typeof record.email ===
        "string"
    ) &&
    (
      record.plan ===
        "free" ||
      record.plan ===
        "pro" ||
      record.plan ===
        "advanced"
    )
  );
}

export default function HeaderAuthControls() {
  const [
    account,
    setAccount,
  ] =
    useState<
      HeaderAccountState |
      null
    >(null);

  const [
    signingOut,
    setSigningOut,
  ] =
    useState(false);

  useEffect(() => {
    let cancelled =
      false;

    async function loadAccount() {
      try {
        const response =
          await fetch(
            "/api/account/plan",
            {
              cache:
                "no-store",
            }
          );

        if (
          !response.ok
        ) {
          return;
        }

        const body:
          unknown =
            await response
              .json();

        if (
          !cancelled &&
          isHeaderAccountState(
            body
          )
        ) {
          setAccount(
            body
          );
        }
      } catch {
        /*
         * Fail closed:
         * do not guess
         * authentication state.
         */
      }
    }

    void loadAccount();

    return () => {
      cancelled =
        true;
    };
  }, []);

  async function signOut() {
    setSigningOut(
      true
    );

    try {
      const supabase =
        createClient();

      await supabase.auth
        .signOut({
          scope:
            "local",
        });

      /*
       * Full reload intentionally
       * resets auth-derived header,
       * quota and pricing state.
       */
      window.location.reload();
    } finally {
      setSigningOut(
        false
      );
    }
  }

  if (!account) {
    return null;
  }

  if (
    !account
      .authenticated
  ) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/login?mode=signin"
          className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900"
        >
          Sign in
        </Link>

        <Link
          href="/login?mode=signup"
          className="rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200"
        >
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="group relative">
        <button
          type="button"
          aria-label={`Current plan: ${account.plan}. Signed in as ${account.email ?? "unknown email"}`}
          className={
            account.plan ===
            "advanced"
              ? "rounded-full border border-purple-400/20 bg-purple-400/10 px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-purple-300 outline-none"
              : account.plan ===
                  "pro"
                ? "rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-violet-300 outline-none"
                : "rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-zinc-400 outline-none"
          }
        >
          {account.plan
            .toUpperCase()}
        </button>

        <div
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden min-w-[220px] rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-left shadow-xl group-hover:block group-focus-within:block"
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            Signed in as
          </div>

          <div className="mt-1 break-all text-xs font-medium text-zinc-200">
            {account.email ??
              "Email unavailable"}
          </div>
        </div>
      </div>

      <Link
        href="/account"
        className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900"
      >
        Account
      </Link>

      <button
        type="button"
        disabled={
          signingOut
        }
        onClick={
          signOut
        }
        className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-xs font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {signingOut
          ? "Signing out..."
          : "Sign out"}
      </button>
    </div>
  );
}
