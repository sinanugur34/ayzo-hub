import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import CaseWorkspace from "@/components/account/CaseWorkspace";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  planHasFeature,
} from "@/lib/plans/registry";

export const dynamic =
  "force-dynamic";

type Props = {
  params:
    Promise<{
      caseId: string;
    }>;
};

export default async function CasePage({
  params,
}: Props) {
  const {
    userId,
    deviceRevoked,
  } =
    await getAuthenticatedAccountContext();

  if (!userId) {
    redirect(
      deviceRevoked
        ? "/login?error=device_replaced"
        : "/login"
    );
  }

  const {
    entitlement,
    billingAvailable,
  } =
    await getServerEntitlement();

  const {
    caseId,
  } =
    await params;

  if (
    !billingAvailable ||
    !planHasFeature(
      entitlement.planId,
      "cases"
    )
  ) {
    return (
      <main className="min-h-screen bg-black px-4 py-12 text-white">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/account"
            className="text-xs font-medium tracking-[0.15em] text-zinc-600 transition hover:text-zinc-300"
          >
            ← Account
          </Link>

          <div className="mt-8 rounded-3xl border border-purple-500/20 bg-purple-500/5 p-6">
            <div className="text-xs font-medium tracking-[0.16em] text-purple-300">
              ADVANCED · CASES
            </div>

            <h1 className="mt-3 text-2xl font-semibold">
              AYZO Advanced required
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Investigation Cases are available only with AYZO Advanced.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-12 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/account"
          className="text-xs font-medium tracking-[0.15em] text-zinc-600 transition hover:text-zinc-300"
        >
          ← Account
        </Link>

        <CaseWorkspace
          caseId={
            caseId
          }
        />
      </div>
    </main>
  );
}
