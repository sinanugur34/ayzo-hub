import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | AYZO",
  description: "Terms and Conditions for use of AYZO.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="text-3xl font-semibold text-white">
        Terms and Conditions
      </h1>

      <p className="mt-4 text-sm text-zinc-500">
        Last updated: September 10, 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold text-white">1. About AYZO</h2>
          <p className="mt-2">
            AYZO provides evidence-first on-chain intelligence and analytical
            tools for supported blockchain networks. AYZO is an informational
            software service and does not provide investment, legal, tax, or
            financial advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Eligibility and Accounts</h2>
          <p className="mt-2">
            You are responsible for maintaining the security of your account
            and for activity performed through it. You must provide accurate
            information and use the service only in accordance with applicable
            law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. Service Availability</h2>
          <p className="mt-2">
            Blockchain and third-party data may be delayed, incomplete, or
            unavailable. AYZO may modify, suspend, or discontinue features when
            necessary for security, maintenance, legal, or operational reasons.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Paid Plans</h2>
          <p className="mt-2">
            Paid plans, when available, provide the features and usage limits
            described on the AYZO pricing interface at the time of purchase.
            Subscription billing and payment processing may be handled by our
            authorized Merchant of Record and payment provider.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Acceptable Use</h2>
          <p className="mt-2">
            You may not misuse the service, interfere with its operation,
            attempt unauthorized access, bypass usage limits, abuse third-party
            infrastructure, or use AYZO for unlawful activity.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. No Investment Advice</h2>
          <p className="mt-2">
            AYZO outputs are analytical signals and evidence summaries only.
            They are not recommendations to buy, sell, hold, or transact in any
            asset. You remain solely responsible for your decisions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Limitation of Liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by applicable law, AYZO is not
            liable for losses arising from reliance on blockchain data,
            third-party services, market activity, service interruptions, or
            user decisions based on analytical output.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">8. Changes</h2>
          <p className="mt-2">
            We may update these Terms when our service, legal obligations, or
            business practices change. The current version will be published
            on this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">9. Contact</h2>
          <p className="mt-2">
            Questions about these Terms may be submitted through the official
            contact channels published on AYZO.
          </p>
        </section>
      </div>
    </main>
  );
}
