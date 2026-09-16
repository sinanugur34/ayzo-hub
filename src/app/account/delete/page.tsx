import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Your AYZO Account | AYZO",
  description:
    "Instructions for requesting deletion of your AYZO account and associated personal data.",
};

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 text-zinc-300">
      <h1 className="text-3xl font-semibold text-white">
        Delete Your AYZO Account
      </h1>

      <p className="mt-4 text-sm text-zinc-500">
        Last updated: September 16, 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-7">
        <section>
          <h2 className="text-lg font-semibold text-white">
            How to request account deletion
          </h2>

          <p className="mt-2">
            To request deletion of your AYZO account and associated personal
            data, send an email from the email address linked to your AYZO
            account to{" "}
            <a
              href="mailto:support@ayzo.io?subject=AYZO%20Account%20Deletion%20Request"
              className="text-violet-300 underline underline-offset-4"
            >
              support@ayzo.io
            </a>
            .
          </p>

          <p className="mt-3">
            Use the subject line{" "}
            <span className="font-medium text-zinc-200">
              AYZO Account Deletion Request
            </span>
            . We may ask you to verify account ownership before processing the
            request.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            Data deleted with your account
          </h2>

          <p className="mt-2">
            After a verified deletion request is completed, AYZO deletes or
            anonymizes personal account data that is no longer required to
            operate the service. This may include account profile information,
            authentication-related account records, saved analyses, watchlists,
            account annotations, and other account-linked user content where
            applicable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            Data that may be retained
          </h2>

          <p className="mt-2">
            Limited records may be retained when necessary for legal,
            accounting, fraud-prevention, security, dispute-resolution, or
            regulatory obligations. Retained records are kept only for the
            period reasonably necessary for those purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            Public blockchain data
          </h2>

          <p className="mt-2">
            Public blockchain addresses and transaction data are part of public
            blockchain networks and cannot be deleted from those networks by
            AYZO. AYZO can delete account-linked records associated with your
            use of the service, subject to the retention limitations described
            above.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">
            Processing time
          </h2>

          <p className="mt-2">
            Verified deletion requests are processed within a reasonable period
            after identity and account ownership checks are completed.
          </p>
        </section>
      </div>
    </main>
  );
}
