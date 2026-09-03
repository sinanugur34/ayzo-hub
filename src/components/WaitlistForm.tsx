"use client";

import {
  FormEvent,
  useState,
} from "react";

export default function WaitlistForm({
  source,
  compact = false,
  buttonLabel,
}: {
  source:
    | "pro-card"
    | "advanced-card"
    | "free-limit";
  compact?: boolean;
  buttonLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] =
    useState(false);
  const [loading, setLoading] =
    useState(false);

  const expandedPaidCard =
    compact &&
    (
      source === "pro-card" ||
      source === "advanced-card"
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const value = email
      .trim()
      .toLowerCase();

    if (!value) {
      setSuccess(false);
      setMessage(
        "Enter your email address."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const form = new FormData(
        event.currentTarget
      );

      const response = await fetch(
        "/api/waitlist",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: value,
            source,
            website:
              form.get("website") ?? "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setSuccess(false);
        setMessage(
          data.error ??
            "Unable to join the waitlist."
        );
        return;
      }

      setSuccess(true);
      setMessage(
        data.message ??
          "You're on the AYZO Pro waitlist."
      );
      setEmail("");
    } catch {
      setSuccess(false);
      setMessage(
        "Unable to join the waitlist."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
        <div className="text-sm font-medium text-emerald-300">
          You&apos;re on the list.
        </div>

        <div className="mt-1 text-xs text-zinc-500">
          We&apos;ll email you when AYZO paid plans
          launch.
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
    >
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div
        className={
          expandedPaidCard
            ? "flex flex-col gap-3"
            : "flex flex-col gap-2 sm:flex-row"
        }
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(
              event.target.value
            );
            setMessage("");
          }}
          placeholder="Enter your email address"
          disabled={loading}
          className={`min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black/40 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/70 disabled:opacity-60 ${
            expandedPaidCard
              ? "h-14 w-full px-5 text-base"
              : "h-12 px-4 text-sm"
          }`}
        />

        <button
          type="submit"
          disabled={loading}
          className={`shrink-0 rounded-xl bg-white font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 ${
            expandedPaidCard
              ? "h-14 w-full px-6 text-sm"
              : "h-12 px-5 text-sm"
          }`}
        >
          {loading
            ? "Joining..."
            : buttonLabel ??
              (
                source ===
                  "advanced-card"
                  ? "Join Advanced Waitlist"
                  : "Join Pro Waitlist"
              )}
        </button>
      </div>

      <p className="mt-2 text-[10px] leading-4 text-zinc-600">
        By joining, you agree to receive AYZO
        paid-plan launch and early-access emails.
        Unsubscribe anytime.
      </p>

      {message && (
        <div className="mt-2 text-xs text-amber-300">
          {message}
        </div>
      )}
    </form>
  );
}
