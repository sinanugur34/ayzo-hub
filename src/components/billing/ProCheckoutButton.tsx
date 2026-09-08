"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type BillingInterval =
  | "monthly"
  | "annual";

type Props = {
  interval:
    BillingInterval;

  label:
    string;

  variant?:
    "primary" |
    "secondary";

  compact?:
    boolean;
};

type CheckoutPayload = {
  ok?: unknown;
  checkoutUrl?:
    unknown;
  error?:
    unknown;
};

export default function ProCheckoutButton({
  interval,
  label,
  variant = "primary",
  compact = false,
}: Props) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  async function startCheckout() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/billing/checkout",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                interval,
              }),
          }
        );

      let payload:
        CheckoutPayload =
          {};

      try {
        payload =
          (
            await response
              .json()
          ) as CheckoutPayload;
      } catch {
        payload =
          {};
      }

      if (
        response.status ===
        401
      ) {
        router.push(
          "/login"
        );

        return;
      }

      if (
        !response.ok ||
        payload.ok !==
          true ||
        typeof payload
          .checkoutUrl !==
          "string"
      ) {
        setError(
          typeof payload
            .error ===
            "string"
            ? payload.error
            : "Unable to start checkout."
        );

        return;
      }

      let checkoutUrl:
        URL;

      try {
        checkoutUrl =
          new URL(
            payload
              .checkoutUrl
          );
      } catch {
        setError(
          "Unable to start checkout."
        );

        return;
      }

      if (
        checkoutUrl.protocol !==
          "https:"
      ) {
        setError(
          "Unable to start checkout."
        );

        return;
      }

      window.location.assign(
        checkoutUrl.toString()
      );
    } catch {
      setError(
        "Unable to start checkout."
      );
    } finally {
      setLoading(false);
    }
  }

  const buttonClass =
    variant ===
    "primary"
      ? "border-violet-400/30 bg-violet-500 text-white hover:bg-violet-400"
      : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800";

  return (
    <div>
      <button
        type="button"
        onClick={
          startCheckout
        }
        disabled={
          loading
        }
        className={`flex w-full items-center justify-center rounded-xl border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          compact
            ? "min-h-10 px-3 py-2 text-[11px]"
            : "min-h-12 px-4 py-3 text-sm"
        } ${buttonClass}`}
      >
        {loading
          ? "Opening secure checkout..."
          : label}
      </button>

      {error && (
        <p
          role="alert"
          aria-live="polite"
          className="mt-2 text-xs leading-5 text-rose-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
