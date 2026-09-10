import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | AYZO",
  description: "Refund Policy for AYZO paid subscriptions.",
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="text-3xl font-semibold text-white">Refund Policy</h1>

      <p className="mt-4 text-sm text-zinc-500">
        Last updated: September 10, 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold text-white">Paid Subscriptions</h2>
          <p className="mt-2">
            AYZO paid subscriptions provide access to digital software
            functionality for the applicable subscription period.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Refund Requests</h2>
          <p className="mt-2">
            Refund requests are reviewed in accordance with applicable law and
            the policies of the authorized Merchant of Record handling the
            transaction. Eligibility may depend on the circumstances of the
            purchase, service usage, and local consumer protection rules.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Cancellation</h2>
          <p className="mt-2">
            Cancelling a recurring subscription prevents future renewal charges
            but does not automatically create a refund for a completed billing
            period unless required by applicable law or approved under the
            applicable refund process.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">How to Request Help</h2>
          <p className="mt-2">
            Customers should use the order, subscription, or support links
            provided with their purchase receipt, or contact AYZO through its
            official support channels.
          </p>
        </section>
      </div>
    </main>
  );
}
