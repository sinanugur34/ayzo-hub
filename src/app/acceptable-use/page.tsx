import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | AYZO",
  description: "Acceptable Use Policy for AYZO.",
};

export default function AcceptableUsePolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="text-3xl font-semibold text-white">
        Acceptable Use Policy
      </h1>

      <p className="mt-4 text-sm text-zinc-500">
        Last updated: September 11, 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold text-white">
            1. Purpose
          </h2>

          <p className="mt-2">
            This Acceptable Use Policy governs how AYZO may be used. AYZO
            provides blockchain analytics and evidence-based on-chain
            intelligence. Users must use the service responsibly, lawfully,
            and in a manner that does not harm AYZO, other users, third
            parties, or supporting infrastructure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            2. Prohibited Illegal Activity
          </h2>

          <p className="mt-2">
            You may not use AYZO to facilitate, promote, support, or conceal
            unlawful activity, including fraud, theft, sanctions evasion,
            money laundering, unauthorized access, or other activity
            prohibited by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            3. No Unauthorized Access or Abuse
          </h2>

          <p className="mt-2">
            You may not attempt to gain unauthorized access to AYZO systems,
            accounts, infrastructure, APIs, data providers, or security
            controls. You may not probe, scan, exploit, disrupt, overload,
            or interfere with the service or its supporting systems.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            4. Usage Limits and Automation
          </h2>

          <p className="mt-2">
            You may not bypass, evade, manipulate, or defeat account,
            subscription, rate, quota, access, or usage limits. Automated
            access must comply with the functionality and access permissions
            explicitly provided by AYZO.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            5. Harmful or Deceptive Use
          </h2>

          <p className="mt-2">
            You may not use AYZO to impersonate others, misrepresent evidence,
            create deceptive claims, harass individuals, or intentionally use
            analytical outputs in a manner designed to cause unlawful harm.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            6. Third-Party Rights
          </h2>

          <p className="mt-2">
            You must respect intellectual property, privacy, contractual, and
            other legal rights of third parties when using AYZO. You are
            responsible for ensuring that your use of the service complies
            with applicable obligations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            7. Blockchain Analytics Only
          </h2>

          <p className="mt-2">
            AYZO is an analytics software service. It does not execute trades,
            purchase or sell digital assets, provide custody, operate wallets,
            transmit customer funds, or execute blockchain transactions on a
            user&apos;s behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            8. No Investment or Trading Advice
          </h2>

          <p className="mt-2">
            AYZO outputs are informational and analytical only. Users may not
            represent AYZO outputs as guaranteed investment results or as
            investment, legal, tax, or financial advice provided by AYZO.
            Users remain responsible for their own decisions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            9. Enforcement
          </h2>

          <p className="mt-2">
            AYZO may restrict, suspend, or terminate access where we reasonably
            believe this policy has been violated, where necessary to protect
            the service or third parties, or where required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            10. Reporting Abuse
          </h2>

          <p className="mt-2">
            Suspected abuse or policy violations may be reported to
            contact@ayzo.io.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            11. Changes
          </h2>

          <p className="mt-2">
            We may update this Acceptable Use Policy as our service, security
            requirements, or legal obligations change. The current version
            will be published on this page.
          </p>
        </section>
      </div>
    </main>
  );
}
