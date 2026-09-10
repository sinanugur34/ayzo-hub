import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AYZO",
  description: "Privacy Policy for AYZO.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="text-3xl font-semibold text-white">Privacy Policy</h1>

      <p className="mt-4 text-sm text-zinc-500">
        Last updated: September 10, 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Information We Process</h2>
          <p className="mt-2">
            AYZO may process account information, authentication data, usage
            information, device and technical data, and information you submit
            when using the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. Blockchain Data</h2>
          <p className="mt-2">
            Public blockchain addresses and transaction data analyzed through
            AYZO are obtained from public blockchain networks and related data
            providers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. How We Use Information</h2>
          <p className="mt-2">
            We use information to operate, secure, maintain, improve, and
            support AYZO, enforce usage limits, prevent abuse, and understand
            service performance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. Payments</h2>
          <p className="mt-2">
            Payment information for paid subscriptions may be processed by our
            authorized Merchant of Record and payment provider. AYZO does not
            need to store full payment card details in order to provide the
            service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. Analytics and Service Providers</h2>
          <p className="mt-2">
            We may use infrastructure, analytics, authentication, email, and
            blockchain data providers as necessary to operate AYZO. These
            providers process information subject to their applicable terms and
            privacy obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">6. Data Retention</h2>
          <p className="mt-2">
            We retain information only for as long as reasonably necessary for
            operational, security, legal, accounting, and service purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">7. Your Rights</h2>
          <p className="mt-2">
            Depending on your jurisdiction, you may have rights regarding
            access, correction, deletion, objection, restriction, or data
            portability. Requests may be made through AYZO&apos;s official contact
            channels.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">8. Changes</h2>
          <p className="mt-2">
            We may update this Privacy Policy as our practices or legal
            obligations change. The current version will be published here.
          </p>
        </section>
      </div>
    </main>
  );
}
