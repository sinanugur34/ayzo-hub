"use client";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

export default function SignOutButton() {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function signOut() {
    setLoading(true);

    try {
      const supabase =
        createClient();

      await supabase.auth.signOut({
        scope:
          "local",
      });

      router.replace(
        "/login"
      );

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={signOut}
      className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-60"
    >
      {loading
        ? "Signing out..."
        : "Sign out"}
    </button>
  );
}
