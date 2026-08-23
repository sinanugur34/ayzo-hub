import WaitlistForm from "@/components/WaitlistForm";

const proFeatures = [
  [
    "Deeper Wallet Intelligence",
    "Expand relationship analysis across more wallets and history.",
  ],
  [
    "Funding Provenance",
    "Trace where key wallets received their original and recent funding.",
  ],
  [
    "Developer History",
    "Investigate previous tokens and connected wallet activity.",
  ],
  [
    "Change Monitoring",
    "Detect meaningful holder and wallet behavior changes over time.",
  ],
  [
    "Watchlists & Alerts",
    "Monitor important tokens and receive Telegram alerts.",
  ],
  [
    "Advanced Evidence Reports",
    "Unlock deeper evidence context for on-chain investigations.",
  ],
];

export default function ProComingSoon() {
  return (
    <section className="mt-20 w-full max-w-4xl text-left">
      <div className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-zinc-950/80 shadow-2xl shadow-purple-950/20">
        <div className="p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-xs font-medium tracking-[0.2em] text-violet-300">
                AYZO PRO
              </div>

              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
                Go deeper on-chain.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Advanced intelligence for users who need
                more context, history and continuous
                monitoring.
              </p>
            </div>

            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-violet-300">
              COMING SOON
            </span>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {proFeatures.map(
              ([title, description]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-zinc-800/80 bg-black/30 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-medium text-zinc-200">
                      {title}
                    </div>

                    <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-[9px] text-violet-300">
                      PRO
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {description}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="mt-7 border-t border-zinc-800/80 pt-6">
            <div>
              <div className="text-sm font-medium text-zinc-200">
                Free includes 3 analyses per 24 hours.
              </div>

              <div className="mt-1 text-xs text-zinc-600">
                Join the waitlist for AYZO Pro launch
                access, higher limits and deeper
                intelligence.
              </div>
            </div>

            <div className="mt-5">
              <WaitlistForm source="pro-card" />
            </div>

            <div className="mt-4 text-xs text-zinc-600">
              Prefer Telegram?{" "}
              <a
                href="https://t.me/ayzo_io"
                target="_blank"
                rel="noreferrer"
                className="text-violet-300 transition hover:text-violet-200"
              >
                Join the AYZO community
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
