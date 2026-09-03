"use client";

import {
  useEffect,
  useState,
} from "react";

import WaitlistForm from "@/components/WaitlistForm";
import type {
  LiveEvmNetworkId,
} from "@/lib/networks/addressSelection";
import {
  NETWORKS,
} from "@/lib/networks/registry";

type AnalyticsWindow =
  Window & {
    gtag?: (
      ...args: unknown[]
    ) => void;
  };

function trackEvent(
  name: string,
  params?: Record<
    string,
    string | number | boolean
  >
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  (
    window as AnalyticsWindow
  ).gtag?.(
    "event",
    name,
    params ?? {}
  );
}

type ModuleStatus =
  | "complete"
  | "limited"
  | "not-run"
  | "unavailable";

type ModuleResult<T> = {
  status:
    ModuleStatus;

  data:
    T | null;

  error:
    string | null;

  limitation:
    string | null;
};

type Finding = {
  id: string;
  category: string;
  title: string;
  severity:
    | "attention"
    | "informational";
  confidence:
    | "low"
    | "medium"
    | "high";
  summary: string;
  caveat: string;
};

type AssetVerification = {
  address: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
  isContract: boolean;
  isErc20: boolean;
};

type HolderConcentration = {
  top1Percent: number;
  top5Percent: number;
  top10Percent: number;
  top20Percent: number;
  top50Percent: number;
  top100Percent: number;
};

type HolderIntelligence = {
  totalHolderCount:
    number | null;

  analyzedHolderCount:
    number;

  raw: {
    concentration:
      HolderConcentration;
  };

  adjusted: {
    concentration:
      HolderConcentration;

    excludedHolderCount:
      number;

    excludedSupplyPercent:
      number;
  };
};

type Relationship = {
  counterparty: string;

  direction:
    | "incoming"
    | "outgoing"
    | "bidirectional";

  interactionCount:
    number;

  transactionCount:
    number;

  transferCount:
    number;
};

type RelationshipIntelligence = {
  counterpartyCount:
    number;

  interactionCount:
    number;

  transactionCount:
    number;

  transferCount:
    number;

  counterparties:
    readonly Relationship[];
};

type FundingSource = {
  sourceAddress: string;

  fundingObservationCount:
    number;

  evidenceTransactionCount:
    number;

  repeatedFundingSource:
    boolean;
};

type FundingIntelligence = {
  fundingSourceCount:
    number;

  repeatedFundingSourceCount:
    number;

  uniqueFundingTransactionCount:
    number;

  firstObservedFunding: {
    sourceAddress: string;
    transactionHash: string;
    timestamp: string;
    evidenceKind: string;
    tokenAddress:
      string | null;
    rawValue: string;
  } | null;

  sources:
    readonly FundingSource[];
};

type DeploymentIntelligence = {
  isContract: boolean;

  deployment: {
    contractAddress:
      string;

    deployerAddress:
      string;

    transactionHash:
      string;

    blockNumber:
      number;

    timestamp:
      string | null;
  } | null;
};

type DeveloperHistory = {
  deployerAddress:
    string;

  verifiedDeploymentCount:
    number;

  otherVerifiedDeploymentCount:
    number;

  repeatedDeploymentActivity:
    boolean;
};

type CoordinationIntelligence = {
  targetWalletCount:
    number;

  signalCount:
    number;

  corroboratedSignalCount:
    number;

  coverage: {
    includesOwnershipInference:
      false;
  };
};

type WalletGraph = {
  nodeCount:
    number;

  edgeCount:
    number;

  maxDepthReached:
    number;

  uniqueEvidenceTransactionCount:
    number;

  nodes:
    readonly {
      address: string;
      depth: number;
      degree: number;
      interactionCount:
        number;
    }[];

  coverage: {
    includesOwnershipInference:
      false;
  };
};

type EvmSuccess = {
  ok: true;

  engine:
    "evm";

  network: {
    id:
      LiveEvmNetworkId;

    name:
      string;

    family:
      "evm";

    chainId:
      number;

    nativeCurrency:
      string;
  };

  address:
    string;

  assetKind:
    | "wallet"
    | "contract"
    | "erc20_contract";

  coverage:
    "full"
    | "partial"
    | "limited";

  moduleSummary: {
    total:
      number;

    complete:
      number;

    limited:
      number;

    notRun:
      number;

    unavailable:
      number;
  };

  modules: {
    assetVerification:
      ModuleResult<
        AssetVerification
      >;

    holderIntelligence:
      ModuleResult<
        HolderIntelligence
      >;

    walletRelationships:
      ModuleResult<
        RelationshipIntelligence
      >;

    fundingProvenance:
      ModuleResult<
        FundingIntelligence
      >;

    deploymentIntelligence:
      ModuleResult<
        DeploymentIntelligence
      >;

    developerHistory:
      ModuleResult<
        DeveloperHistory
      >;

    coordinatedWalletBehavior:
      ModuleResult<
        CoordinationIntelligence
      >;

    walletGraph:
      ModuleResult<
        WalletGraph
      >;
  };

  findings:
    Finding[];

  caveats:
    string[];
};

type EvmFailure = {
  ok: false;
  code?: string;
  error: string;
};

type EvmResponse =
  | EvmSuccess
  | EvmFailure;

function short(
  value:
    string | null | undefined
) {
  if (!value) {
    return "Unavailable";
  }

  return (
    `${value.slice(0, 6)}` +
    `...` +
    `${value.slice(-6)}`
  );
}

function pct(
  value:
    number | null | undefined
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return "Unavailable";
  }

  return `${value.toFixed(2)}%`;
}

function formatCount(
  value:
    number | null | undefined
) {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString(
    "en-US"
  );
}

function formatTokenSupply(
  raw:
    string | null,
  decimals:
    number | null
) {
  if (
    raw === null ||
    decimals === null
  ) {
    return "Unavailable";
  }

  try {
    const value =
      BigInt(raw);

    const divisor =
      10n **
      BigInt(decimals);

    const whole =
      value / divisor;

    const fraction =
      value % divisor;

    const wholeText =
      whole.toLocaleString(
        "en-US"
      );

    if (
      fraction === 0n
    ) {
      return wholeText;
    }

    const fractionText =
      fraction
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .replace(
          /0+$/,
          ""
        )
        .slice(
          0,
          4
        );

    return fractionText
      ? `${wholeText}.${fractionText}`
      : wholeText;
  } catch {
    return raw;
  }
}

function assetKindLabel(
  value:
    EvmSuccess["assetKind"]
) {
  switch (value) {
    case "erc20_contract":
      return "ERC-20 Token";

    case "contract":
      return "Smart Contract";

    case "wallet":
      return "Wallet";
  }
}

function statusLabel(
  status:
    ModuleStatus
) {
  switch (status) {
    case "complete":
      return "VERIFIED";

    case "limited":
      return "ANALYZED";

    case "not-run":
      return "NOT APPLICABLE";

    case "unavailable":
      return "UNAVAILABLE";
  }
}

function statusClass(
  status:
    ModuleStatus
) {
  switch (status) {
    case "complete":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    case "limited":
      return "border-violet-500/20 bg-violet-500/10 text-violet-300";

    case "not-run":
      return "border-zinc-700 bg-zinc-900 text-zinc-500";

    case "unavailable":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }
}

function coverageLabel(
  coverage:
    EvmSuccess["coverage"]
) {
  switch (coverage) {
    case "full":
      return "FULL COVERAGE";

    case "partial":
      return "PARTIAL COVERAGE";

    case "limited":
      return "LIMITED COVERAGE";
  }
}

export default function EvmIntelligenceReport({
  address,
  network,
}: {
  address: string;
  network:
    LiveEvmNetworkId;
}) {
  const networkDefinition =
    NETWORKS[network];

  const [
    data,
    setData,
  ] =
    useState<
      EvmSuccess | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    dailyLimitReached,
    setDailyLimitReached,
  ] =
    useState(false);

  const [
    elapsedSeconds,
    setElapsedSeconds,
  ] =
    useState(0);

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setError("");
      setData(null);
      setDailyLimitReached(
        false
      );

      try {
        trackEvent(
          "analysis_started",
          {
            feature:
              `${network}_intelligence`,
            network:
              network,
          }
        );

        const response =
          await fetch(
            "/api/intelligence",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                ...(process.env.NODE_ENV !==
                "production"
                  ? {
                      "x-ayzo-test-request":
                        "smoke",
                    }
                  : {}),
              },

              body:
                JSON.stringify({
                  network:
                    network,

                  address,
                }),
            }
          );

        const result =
          (
            await response.json()
          ) as EvmResponse;

        window.dispatchEvent(
          new Event(
            "ayzo:quota-updated"
          )
        );

        if (cancelled) {
          return;
        }

        if (!result.ok) {
          if (
            result.code ===
            "DAILY_FREE_LIMIT"
          ) {
            setDailyLimitReached(
              true
            );

            return;
          }

          throw new Error(
            result.error ??
              `${networkDefinition.name} intelligence analysis failed.`
          );
        }

        trackEvent(
          "intelligence_completed",
          {
            feature:
              `${network}_intelligence`,
            network:
              network,
          }
        );

        setData(result);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof
              Error
              ? caught.message
              : `AYZO ${networkDefinition.name} intelligence is temporarily unavailable.`
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      cancelled =
        true;
    };
  }, [
    address,
    network,
    networkDefinition.name,
  ]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setElapsedSeconds(
            value =>
              value + 1
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    loading,
    address,
  ]);

  if (loading) {
    return (
      <div className="mt-6 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-zinc-950/70 text-left">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-violet-400">
                AYZO {networkDefinition.name.toUpperCase()} INTELLIGENCE
              </div>

              <h3 className="mt-2 text-xl font-semibold text-zinc-100">
                Building the evidence map
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Verifying the address, measuring holders, tracing
                relationships, funding, deployment history and the
                bounded wallet graph.
              </p>
            </div>

            <div className="rounded-full border border-zinc-800 bg-black/30 px-3 py-1.5 font-mono text-[10px] text-zinc-500">
              {elapsedSeconds}s elapsed
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {[
              "Asset verification",
              "Holder intelligence",
              "Wallet relationships",
              "Funding provenance",
              "Deployment history",
              "Developer history",
              "Coordination signals",
              "Wallet graph",
            ].map(
              item => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-400" />
                  </span>

                  <span className="text-xs text-zinc-400">
                    {item}
                  </span>
                </div>
              )
            )}
          </div>

          <div className="mt-6 h-1 overflow-hidden rounded-full bg-zinc-900">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-500" />
          </div>

          <p className="mt-4 text-[10px] leading-5 text-zinc-700">
            {networkDefinition.name} analysis can take longer because AYZO verifies
            multiple independent evidence modules.
          </p>
        </div>
      </div>
    );
  }

  if (
    dailyLimitReached
  ) {
    return (
      <div className="mt-6 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 to-zinc-950/80 text-left">
        <div className="p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.18em] text-violet-300">
            FREE PLAN
          </div>

          <h3 className="mt-2 text-2xl font-semibold text-zinc-100">
            Daily Free Limit Reached
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            You&apos;ve used your 3 free analyses for the current
            24-hour window.
          </p>

          <div className="mt-6">
            <WaitlistForm
              source="free-limit"
              compact
            />
          </div>
        </div>
      </div>
    );
  }

  if (
    error ||
    !data
  ) {
    return (
      <div className="mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 text-left">
        <div className="text-sm font-medium text-amber-300">
          {networkDefinition.name} intelligence unavailable
        </div>

        <div className="mt-2 text-xs leading-5 text-zinc-500">
          {error}
        </div>
      </div>
    );
  }

  const asset =
    data.modules
      .assetVerification
      .data;

  const holders =
    data.modules
      .holderIntelligence
      .data;

  const relationships =
    data.modules
      .walletRelationships
      .data;

  const funding =
    data.modules
      .fundingProvenance
      .data;

  const deployment =
    data.modules
      .deploymentIntelligence
      .data;

  const developer =
    data.modules
      .developerHistory
      .data;

  const coordination =
    data.modules
      .coordinatedWalletBehavior
      .data;

  const graph =
    data.modules
      .walletGraph
      .data;

  return (
    <div className="mt-6 space-y-6 text-left">
      <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/10 via-purple-500/5 to-zinc-950/80 shadow-2xl shadow-purple-950/10">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-5 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-start">
            <div>
              <div className="text-xs font-medium tracking-[0.18em] text-violet-300">
                AYZO INTELLIGENCE
              </div>

              <h2 className="mt-2 text-2xl font-semibold">
                {asset?.name ??
                  assetKindLabel(
                    data.assetKind
                  )}
                {asset?.symbol
                  ? ` · ${asset.symbol}`
                  : ""}
              </h2>

              <div className="mt-2 break-all font-mono text-xs text-zinc-500">
                {data.address}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-emerald-300">
                {data.network.name.toUpperCase()}
              </span>

              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-medium tracking-wide text-violet-300">
                {coverageLabel(
                  data.coverage
                )}
              </span>
            </div>
          </div>

          <div className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewStat
              label="Asset type"
              value={
                assetKindLabel(
                  data.assetKind
                )
              }
            />

            <OverviewStat
              label="Holders analyzed"
              value={
                holders
                  ? formatCount(
                      holders.analyzedHolderCount
                    )
                  : "—"
              }
            />

            <OverviewStat
              label="Funding sources"
              value={
                funding
                  ? formatCount(
                      funding.fundingSourceCount
                    )
                  : "—"
              }
            />

            <OverviewStat
              label="Graph"
              value={
                graph
                  ? `${graph.nodeCount} nodes · ${graph.edgeCount} edges`
                  : "—"
              }
            />
          </div>

          <div className="grid gap-2 border-t border-zinc-900 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                [
                  "Verification",
                  data.modules
                    .assetVerification
                    .status,
                ],

                [
                  "Holders",
                  data.modules
                    .holderIntelligence
                    .status,
                ],

                [
                  "Relationships",
                  data.modules
                    .walletRelationships
                    .status,
                ],

                [
                  "Funding",
                  data.modules
                    .fundingProvenance
                    .status,
                ],

                [
                  "Deployment",
                  data.modules
                    .deploymentIntelligence
                    .status,
                ],

                [
                  "Developer",
                  data.modules
                    .developerHistory
                    .status,
                ],

                [
                  "Coordination",
                  data.modules
                    .coordinatedWalletBehavior
                    .status,
                ],

                [
                  "Graph",
                  data.modules
                    .walletGraph
                    .status,
                ],
              ] as const
            ).map(
              ([
                label,
                status,
              ]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-zinc-900 bg-black/20 px-3 py-3"
                >
                  <span className="text-[11px] text-zinc-500">
                    {label}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-1 text-[8px] font-medium tracking-wide ${statusClass(
                      status
                    )}`}
                  >
                    {statusLabel(
                      status
                    )}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <KeyFindings
        findings={
          data.findings
        }
      />

      <EvidenceSection
        title="Asset Verification"
        subtitle="Contract and ERC-20 evidence"
        metric={
          asset?.isErc20
            ? "ERC-20"
            : asset?.isContract
              ? "CONTRACT"
              : "WALLET"
        }
      >
        {asset ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              label="Name"
              value={
                asset.name ??
                "Unavailable"
              }
            />

            <MiniStat
              label="Symbol"
              value={
                asset.symbol ??
                "Unavailable"
              }
            />

            <MiniStat
              label="Decimals"
              value={
                asset.decimals ===
                null
                  ? "Unavailable"
                  : String(
                      asset.decimals
                    )
              }
            />

            <MiniStat
              label="Total supply"
              value={
                formatTokenSupply(
                  asset.totalSupply,
                  asset.decimals
                )
              }
            />
          </div>
        ) : (
          <Unavailable />
        )}
      </EvidenceSection>

      <EvidenceSection
        title="Holder Intelligence"
        subtitle="Raw and entity-adjusted concentration"
        metric={
          holders
            ? `${formatCount(
                holders.analyzedHolderCount
              )} analyzed`
            : "Unavailable"
        }
      >
        {holders ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Raw Top 1"
                value={pct(
                  holders.raw
                    .concentration
                    .top1Percent
                )}
              />

              <Stat
                label="Raw Top 5"
                value={pct(
                  holders.raw
                    .concentration
                    .top5Percent
                )}
              />

              <Stat
                label="Raw Top 10"
                value={pct(
                  holders.raw
                    .concentration
                    .top10Percent
                )}
              />

              <Stat
                label="Adjusted Top 10"
                value={pct(
                  holders.adjusted
                    .concentration
                    .top10Percent
                )}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniStat
                label="Total holders"
                value={
                  holders.totalHolderCount ===
                  null
                    ? "Unknown"
                    : formatCount(
                        holders.totalHolderCount
                      )
                }
              />

              <MiniStat
                label="Excluded entities"
                value={formatCount(
                  holders.adjusted
                    .excludedHolderCount
                )}
              />

              <MiniStat
                label="Excluded supply"
                value={pct(
                  holders.adjusted
                    .excludedSupplyPercent
                )}
              />
            </div>

            <Methodology>
              Adjusted concentration excludes only explicit high-confidence
              entity categories supported by AYZO evidence. Concentration
              alone is not treated as a trading or risk conclusion.
            </Methodology>
          </>
        ) : (
          <Unavailable />
        )}
      </EvidenceSection>

      <EvidenceSection
        title="Wallet Relationships"
        subtitle="Observed counterparties and direct activity"
        metric={
          relationships
            ? `${relationships.counterpartyCount} counterparties`
            : "Unavailable"
        }
      >
        {relationships ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Counterparties"
                value={formatCount(
                  relationships.counterpartyCount
                )}
              />

              <Stat
                label="Interactions"
                value={formatCount(
                  relationships.interactionCount
                )}
              />

              <Stat
                label="Transactions"
                value={formatCount(
                  relationships.transactionCount
                )}
              />

              <Stat
                label="Token transfers"
                value={formatCount(
                  relationships.transferCount
                )}
              />
            </div>

            <div className="mt-5 space-y-2">
              {relationships.counterparties
                .slice(
                  0,
                  5
                )
                .map(
                  item => (
                    <EvidenceRow
                      key={
                        item.counterparty
                      }
                      left={short(
                        item.counterparty
                      )}
                      middle={
                        item.direction
                      }
                      right={`${item.interactionCount} interactions`}
                    />
                  )
                )}
            </div>

            <Methodology>
              Observed interaction does not establish common ownership,
              identity, coordination, intent or control.
            </Methodology>
          </>
        ) : (
          <Unavailable />
        )}
      </EvidenceSection>

      <EvidenceSection
        title="Funding Provenance"
        subtitle="Observed incoming funding evidence"
        metric={
          funding
            ? `${funding.fundingSourceCount} sources`
            : "Unavailable"
        }
      >
        {funding ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Funding sources"
                value={formatCount(
                  funding.fundingSourceCount
                )}
              />

              <Stat
                label="Repeated sources"
                value={formatCount(
                  funding.repeatedFundingSourceCount
                )}
              />

              <Stat
                label="Evidence transactions"
                value={formatCount(
                  funding.uniqueFundingTransactionCount
                )}
              />
            </div>

            {funding.sources.length >
              0 && (
              <div className="mt-5 space-y-2">
                {funding.sources
                  .slice(
                    0,
                    5
                  )
                  .map(
                    item => (
                      <EvidenceRow
                        key={
                          item.sourceAddress
                        }
                        left={short(
                          item.sourceAddress
                        )}
                        middle={
                          item.repeatedFundingSource
                            ? "repeated"
                            : "observed"
                        }
                        right={`${item.fundingObservationCount} observations`}
                      />
                    )
                  )}
              </div>
            )}

            <Methodology>
              An observed funding source is evidence of an incoming
              transaction or token transfer. It does not identify the
              ultimate origin or establish ownership.
            </Methodology>
          </>
        ) : (
          <Unavailable />
        )}
      </EvidenceSection>

      <EvidenceSection
        title="Deployment History"
        subtitle="Verified creation and deployer evidence"
        metric={
          developer
            ? `${developer.verifiedDeploymentCount} deployments`
            : deployment
              ?.deployment
              ? "Verified"
              : "Unavailable"
        }
      >
        {deployment?.deployment ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MiniStat
                label="Deployer"
                value={short(
                  deployment
                    .deployment
                    .deployerAddress
                )}
              />

              <MiniStat
                label="Creation block"
                value={formatCount(
                  deployment
                    .deployment
                    .blockNumber
                )}
              />

              <MiniStat
                label="Verified deployments"
                value={
                  developer
                    ? formatCount(
                        developer
                          .verifiedDeploymentCount
                      )
                    : "Unavailable"
                }
              />

              <MiniStat
                label="Other deployments"
                value={
                  developer
                    ? formatCount(
                        developer
                          .otherVerifiedDeploymentCount
                      )
                    : "Unavailable"
                }
              />
            </div>

            <Methodology>
              The deployer is the address proven by the specific
              contract-creation transaction. It does not establish the
              current owner or a real-world identity.
            </Methodology>
          </>
        ) : (
          <Unavailable />
        )}
      </EvidenceSection>

      <EvidenceSection
        title="Coordination Signals"
        subtitle="Evidence-backed behavior across the bounded wallet set"
        metric={
          coordination
            ? `${coordination.signalCount} signals`
            : "Not run"
        }
      >
        {coordination ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Wallets"
                value={formatCount(
                  coordination.targetWalletCount
                )}
              />

              <Stat
                label="Signals"
                value={formatCount(
                  coordination.signalCount
                )}
              />

              <Stat
                label="Corroborated"
                value={formatCount(
                  coordination.corroboratedSignalCount
                )}
              />
            </div>

            <Methodology>
              Coordination signals describe shared on-chain evidence.
              They do not prove common ownership, identity, intent or
              malicious activity.
            </Methodology>
          </>
        ) : (
          <Unavailable
            text="No sufficiently supported secondary wallet set was available for this bounded analysis."
          />
        )}
      </EvidenceSection>

      <EvidenceSection
        title="Wallet Graph"
        subtitle="Bounded multi-hop on-chain connectivity"
        metric={
          graph
            ? `${graph.nodeCount} nodes · ${graph.edgeCount} edges`
            : "Unavailable"
        }
      >
        {graph ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Nodes"
                value={formatCount(
                  graph.nodeCount
                )}
              />

              <Stat
                label="Edges"
                value={formatCount(
                  graph.edgeCount
                )}
              />

              <Stat
                label="Max depth"
                value={formatCount(
                  graph.maxDepthReached
                )}
              />

              <Stat
                label="Evidence TXs"
                value={formatCount(
                  graph.uniqueEvidenceTransactionCount
                )}
              />
            </div>

            <div className="mt-5 space-y-2">
              {graph.nodes
                .slice(
                  0,
                  6
                )
                .map(
                  node => (
                    <EvidenceRow
                      key={
                        node.address
                      }
                      left={short(
                        node.address
                      )}
                      middle={`depth ${node.depth}`}
                      right={`${node.interactionCount} interactions`}
                    />
                  )
                )}
            </div>

            <Methodology>
              Graph proximity represents observed connectivity only.
              It does not establish common ownership, identity,
              intent or control.
            </Methodology>
          </>
        ) : (
          <Unavailable />
        )}
      </EvidenceSection>

      <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-zinc-950/70 p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-violet-400">
              SHARE AYZO
            </div>

            <h3 className="mt-2 text-lg font-semibold text-zinc-100">
              Share your investigation
            </h3>

            <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500">
              Evidence-first {data.network.name} intelligence without wallet
              connection or trading recommendations.
            </p>
          </div>

          <a
            href={`https://x.com/intent/post?text=${encodeURIComponent(
              `I investigated a ${data.network.name} address with @IOAYZO.\n\nHolder intelligence • Funding provenance • Wallet relationships • Deployment history • Wallet graph\n\nTry AYZO Alpha → https://app.ayzo.io`
            )}`}
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              trackEvent(
                "share_x_clicked",
                {
                  feature:
                    `${network}_intelligence`,
                }
              )
            }
            className="inline-flex items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-medium text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/20"
          >
            Share Analysis on X ↗
          </a>
        </div>

        <p className="mt-4 text-[10px] leading-5 text-zinc-700">
          AYZO reports observed on-chain evidence and does not classify
          an asset as safe, fraudulent or suitable for investment.
        </p>
      </section>
    </div>
  );
}

function KeyFindings({
  findings,
}: {
  findings: Finding[];
}) {
  if (
    findings.length === 0
  ) {
    return null;
  }

  const primary =
    findings.slice(
      0,
      3
    );

  const remaining =
    findings.slice(
      3
    );

  return (
    <section className="rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 to-zinc-950/70 p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-medium tracking-[0.18em] text-violet-400">
            KEY FINDINGS
          </div>

          <h3 className="mt-2 text-xl font-semibold text-zinc-100">
            What the evidence shows
          </h3>

          <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-500">
            The most relevant evidence surfaced by AYZO in this
            investigation.
          </p>
        </div>

        <div className="text-xs text-zinc-600">
          {findings.length} findings
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {primary.map(
          finding => (
            <FindingCard
              key={
                finding.id
              }
              finding={
                finding
              }
            />
          )
        )}
      </div>

      {remaining.length > 0 && (
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border border-zinc-800 bg-black/20 px-4 py-3 text-xs text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-300">
            <span>
              View {remaining.length} more finding
              {remaining.length === 1 ? "" : "s"}
            </span>

            <span className="text-lg text-zinc-600 transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>

          <div className="mt-3 space-y-3">
            {remaining.map(
              finding => (
                <FindingCard
                  key={
                    finding.id
                  }
                  finding={
                    finding
                  }
                />
              )
            )}
          </div>
        </details>
      )}
    </section>
  );
}

function FindingCard({
  finding,
}: {
  finding: Finding;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm font-medium text-zinc-200">
          {finding.title}
        </div>

        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[9px] uppercase tracking-wide text-zinc-500">
          {finding.confidence} confidence
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-zinc-400">
        {finding.summary}
      </p>

      <p className="mt-3 text-[10px] leading-5 text-zinc-600">
        {finding.caveat}
      </p>
    </div>
  );
}

function EvidenceSection({
  title,
  subtitle,
  metric,
  children,
}: {
  title: string;
  subtitle: string;
  metric: string;
  children:
    React.ReactNode;
}) {
  return (
    <details className="group rounded-3xl border border-zinc-800 bg-zinc-950/70">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 p-5 sm:p-6">
        <div>
          <h3 className="text-base font-semibold text-zinc-100 sm:text-lg">
            {title}
          </h3>

          <p className="mt-1 text-xs text-zinc-600">
            {subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="max-w-32 text-right text-sm font-medium text-zinc-300">
            {metric}
          </div>

          <span className="text-xl text-zinc-600 transition-transform group-open:rotate-90">
            ›
          </span>
        </div>
      </summary>

      <div className="border-t border-zinc-900 px-6 pb-6 pt-5 sm:px-7">
        {children}
      </div>
    </details>
  );
}

function OverviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-black/30 p-5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </div>

      <div className="mt-2 break-words text-sm font-medium text-zinc-200">
        {value}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/30 p-5">
      <div className="text-xs text-zinc-600">
        {label}
      </div>

      <div className="mt-2 text-xl font-semibold text-zinc-200">
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/50 p-4">
      <div className="text-[11px] text-zinc-600">
        {label}
      </div>

      <div className="mt-2 break-all text-sm font-medium text-zinc-300">
        {value}
      </div>
    </div>
  );
}

function EvidenceRow({
  left,
  middle,
  right,
}: {
  left: string;
  middle: string;
  right: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs sm:flex-row sm:items-center">
      <span className="font-mono text-zinc-400">
        {left}
      </span>

      <span className="text-zinc-600">
        {middle}
      </span>

      <span className="text-zinc-400">
        {right}
      </span>
    </div>
  );
}

function Methodology({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-violet-500/10 bg-violet-500/5 p-4 text-[11px] leading-5 text-zinc-500">
      {children}
    </div>
  );
}

function Unavailable({
  text =
    "This intelligence module is unavailable for the current analysis.",
}: {
  text?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/20 p-5 text-sm text-zinc-500">
      {text}
    </div>
  );
}
