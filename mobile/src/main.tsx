import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { App as CapacitorApp } from "@capacitor/app";
import "./styles.css";
import { listenForAuthCallback, sendEmailOtp, signInWithGoogle } from "./mobileAuth";
import {
  registerMobileSession,
  validateMobileSession,
} from "./mobileSession";
import { supabase } from "./supabase";
import {
  analyzeMobileAddress,
  detectMobileAddressNetwork,
  MobileAnalysisError,
  type MobileAnalysisResult,
} from "./mobileIntelligence";
import type {
  MobileQuotaStatus,
} from "./mobileQuota";
import MobileQuotaCard from "./MobileQuotaCard";
import MobileAnalysisResultPanel from "./MobileAnalysisResultPanel";
import {
  getActiveGooglePlaySubscriptions,
  getGooglePlaySubscriptionProducts,
  listenForGooglePlayPurchaseUpdates,
  startGooglePlaySubscriptionPurchase,
  type GooglePlaySubscriptionProduct,
} from "./googlePlayBilling";
import {
  GOOGLE_PLAY_SUBSCRIPTIONS,
} from "./googlePlayCatalog";
import {
  verifyGooglePlayPurchase,
} from "./googlePlayVerification";
import {
  getMobileAccountStatus,
} from "./mobileStatus";
import {
  getMobileAlerts,
  type MobileAlertRule,
} from "./mobileAlerts";
import {
  askMobileAyzo,
  type MobileAskAyzoTurn,
} from "./mobileAskAyzo";
import DraggableAskAyzo from "./DraggableAskAyzo";
import MobileAnalyticsConsentBanner from "./MobileAnalyticsConsent";

import {
  clearMobileAnalyticsUser,
  getMobileAnalyticsConsent,
  identifyMobileAnalyticsUser,
  setMobileAnalyticsConsent,
  trackMobileEvent,
} from "./mobileAnalytics";

import {
  clearMobileHistory,
  consumeHistoryReplay,
  readMobileHistory,
  recordMobileHistory,
  setHistoryReplay,
  type MobileHistoryItem,
} from "./mobileHistory";
import type {
  BillingInterval,
  PlanId,
} from "../../src/lib/plans/types";
import {
  NETWORKS,
  type NetworkId,
} from "../../src/lib/networks/registry";
import {
  getLiveNetworks,
  getProductToolsForNetwork,
} from "../../src/lib/networks/productCapabilities";

function formatCapabilityLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function Dashboard({
  onOpenProfile,
  onOpenHistory,
  onOpenAlerts,
}: {
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onOpenAlerts: () => void;
}) {
  const [activeNav, setActiveNav] = useState<
    "home" | "explore" | "analyze" | "alerts" | "profile"
  >("home");
  const replayItem =
    consumeHistoryReplay();

  const [selectedNetworkId, setSelectedNetworkId] =
    useState<NetworkId>(
      replayItem?.networkId ??
        "ethereum"
    );

  const selectedNetwork =
    NETWORKS[selectedNetworkId];

  const liveNetworks =
    getLiveNetworks();

  const tools =
    getProductToolsForNetwork(selectedNetworkId);

  const [analysisInput, setAnalysisInput] =
    useState(
      replayItem?.address ??
        ""
    );

  const [analysisResult, setAnalysisResult] =
    useState<MobileAnalysisResult | null>(
      null
    );

  const [analysisError, setAnalysisError] =
    useState<string | null>(
      null
    );

  const [analysisPlan, setAnalysisPlan] =
    useState<"free" | "pro" | "advanced" | null>(
      null
    );

  const [analysisQuota, setAnalysisQuota] =
    useState<MobileQuotaStatus | null>(
      null
    );

  const [analysisLoading, setAnalysisLoading] =
    useState(false);

  const [askAyzoOpen, setAskAyzoOpen] =
    useState(false);

  const [billingProducts, setBillingProducts] =
    useState<GooglePlaySubscriptionProduct[]>([]);

  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("monthly");

  const [billingLoading, setBillingLoading] =
    useState<PlanId | null>(null);

  const [billingMessage, setBillingMessage] =
    useState<string | null>(null);

  const [billingError, setBillingError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled =
      false;

    let listener:
      Awaited<
        ReturnType<
          typeof listenForGooglePlayPurchaseUpdates
        >
      > |
      undefined;

    const refreshAccountStatus =
      async () => {
        const status =
          await getMobileAccountStatus();

        if (cancelled) {
          return;
        }

        setAnalysisPlan(
          status.plan
        );

        setAnalysisQuota(
          status.quota
        );
      };

    const refreshAccountStatusSafely =
      async () => {
        try {
          await refreshAccountStatus();
        } catch (error) {
          console.error(
            "AYZO mobile account status query failed.",
            error
          );
        }
      };

    void (async () => {
      await refreshAccountStatusSafely();

      try {
        const productResult =
          await getGooglePlaySubscriptionProducts();

        if (cancelled) {
          return;
        }

        setBillingProducts(
          productResult.products
        );
      } catch (error) {
        if (!cancelled) {
          setBillingError(
            error instanceof Error
              ? error.message
              : "Google Play product query failed."
          );
        }
      }

      try {
        const restoreResult =
          await getActiveGooglePlaySubscriptions();

        if (cancelled) {
          return;
        }

        for (
          const purchase of
          restoreResult.purchases ?? []
        ) {
          if (
            cancelled ||
            !purchase.purchaseToken
          ) {
            continue;
          }

          const verified =
            await verifyGooglePlayPurchase(
              purchase.purchaseToken
            );

          if (cancelled) {
            return;
          }

          await refreshAccountStatus();

          if (cancelled) {
            return;
          }

          if (
            verified.status ===
              "active" ||
            verified.status ===
              "canceling"
          ) {
            setAnalysisPlan(
              verified.plan
            );

            setBillingMessage(
              `${verified.plan === "advanced" ? "Advanced" : "Pro"} restored through Google Play.`
            );

            void trackMobileEvent(
              "subscription_restored",
              {
                provider:
                  "google_play",
                plan:
                  verified.plan,
                status:
                  verified.status,
              }
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setBillingError(
            error instanceof Error
              ? error.message
              : "Google Play subscription restore failed."
          );
        }
      }
    })();

    void listenForGooglePlayPurchaseUpdates(
      (event) => {
        if (
          event.responseCode !== 0
        ) {
          setBillingLoading(null);

          if (event.responseCode !== 1) {
            setBillingError(
              event.debugMessage ??
              "Google Play purchase failed."
            );
          }

          return;
        }

        const purchases =
          event.purchases ?? [];

        if (!purchases.length) {
          setBillingLoading(null);
          return;
        }

        void (async () => {
          try {
            for (
              const purchase of purchases
            ) {
              if (
                !purchase.purchaseToken
              ) {
                continue;
              }

              const verified =
                await verifyGooglePlayPurchase(
                  purchase.purchaseToken
                );

              await refreshAccountStatus();

              if (
                verified.status ===
                  "active" ||
                verified.status ===
                  "canceling"
              ) {
                setAnalysisPlan(
                  verified.plan
                );

                setBillingMessage(
                  `${verified.plan === "advanced" ? "Advanced" : "Pro"} activated through Google Play.`
                );

                void trackMobileEvent(
                  "purchase_verified",
                  {
                    provider:
                      "google_play",
                    plan:
                      verified.plan,
                    status:
                      verified.status,
                  }
                );
              } else {
                setBillingMessage(
                  `Google Play subscription status: ${verified.status}.`
                );
              }
            }
          } catch (error) {
            setBillingError(
              error instanceof Error
                ? error.message
                : "Google Play purchase verification failed."
            );
          } finally {
            setBillingLoading(null);
          }
        })();
      }
    ).then((handle) => {
      listener =
        handle;
    });

    let appStateListener:
      | Awaited<
          ReturnType<
            typeof CapacitorApp.addListener
          >
        >
      | undefined;

    void CapacitorApp.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (
          !isActive ||
          cancelled
        ) {
          return;
        }

        void refreshAccountStatusSafely();
      }
    ).then((handle) => {
      appStateListener =
        handle;
    });

    return () => {
      cancelled =
        true;

      void listener?.remove();
      void appStateListener?.remove();
    };
  }, []);

  useEffect(() => {
    const address =
      analysisInput.trim();

    if (
      address.length < 26 ||
      analysisLoading
    ) {
      return;
    }

    let cancelled =
      false;

    const timer =
      window.setTimeout(
        () => {
          void detectMobileAddressNetwork({
            address,
            selectedNetworkId,
          })
            .then(
              (detectedNetworkId) => {
                if (
                  cancelled ||
                  !detectedNetworkId ||
                  detectedNetworkId ===
                    selectedNetworkId
                ) {
                  return;
                }

                setSelectedNetworkId(
                  detectedNetworkId
                );

                setAnalysisResult(
                  null
                );

                setAnalysisError(
                  null
                );
              }
            )
            .catch(
              () => undefined
            );
        },
        450
      );

    return () => {
      cancelled =
        true;

      window.clearTimeout(
        timer
      );
    };
  }, [
    analysisInput,
    selectedNetworkId,
    analysisLoading,
  ]);

  function getPlayPrice(
    planId: "pro" | "advanced",
    interval: BillingInterval
  ) {
    const subscription =
      GOOGLE_PLAY_SUBSCRIPTIONS[
        planId
      ];

    const product =
      billingProducts.find(
        (item) =>
          item.productId ===
          subscription.productId
      );

    const offer =
      product?.offers.find(
        (item) =>
          item.basePlanId ===
          subscription.basePlans[
            interval
          ]
      );

    return (
      offer
        ?.pricingPhases
        ?.at(-1)
        ?.formattedPrice ??
      null
    );
  }

  const startUpgrade =
    async (
      planId:
        "pro" |
        "advanced"
    ) => {
      if (billingLoading) {
        return;
      }

      setBillingError(null);
      setBillingMessage(null);
      setBillingLoading(planId);

      void trackMobileEvent(
        "purchase_started",
        {
          provider:
            "google_play",
          plan:
            planId,
          interval:
            billingInterval,
          flow:
            analysisPlan ===
              "pro" &&
            planId ===
              "advanced"
              ? "upgrade"
              : "purchase",
        }
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.auth.getUser();

        if (
          error ||
          !data.user?.id
        ) {
          throw new Error(
            "AYZO authentication session is unavailable."
          );
        }

        let oldPurchaseToken:
          string | undefined;

        let oldProductId:
          string | undefined;

        if (
          analysisPlan === "pro" &&
          planId === "advanced"
        ) {
          const activeSubscriptions =
            await getActiveGooglePlaySubscriptions();

          const proPurchase =
            activeSubscriptions.purchases.find(
              (purchase) =>
                purchase.products.includes(
                  GOOGLE_PLAY_SUBSCRIPTIONS.pro.productId
                )
            );

          if (!proPurchase?.purchaseToken) {
            throw new Error(
              "Your current Google Play Pro subscription could not be found."
            );
          }

          oldPurchaseToken =
            proPurchase.purchaseToken;

          oldProductId =
            GOOGLE_PLAY_SUBSCRIPTIONS.pro.productId;
        }

        const result =
          await startGooglePlaySubscriptionPurchase({
            planId,
            interval:
              billingInterval,
            userId:
              data.user.id,
            oldPurchaseToken,
            oldProductId,
          });

        if (
          result.responseCode !== 0
        ) {
          setBillingLoading(null);

          if (
            result.responseCode !== 1
          ) {
            throw new Error(
              result.debugMessage ??
              "Google Play purchase could not start."
            );
          }
        }
      } catch (error) {
        void trackMobileEvent(
          "purchase_failed",
          {
            provider:
              "google_play",
            plan:
              planId,
            interval:
              billingInterval,
          }
        );

        setBillingLoading(null);

        setBillingError(
          error instanceof Error
            ? error.message
            : "Google Play purchase could not start."
        );
      }
    };

  const runAnalysis =
    async () => {
      if (analysisLoading) {
        return;
      }

      setAnalysisLoading(true);
      setAnalysisError(null);
      setAnalysisResult(null);

      void trackMobileEvent(
        "analysis_started",
        {
          network:
            selectedNetworkId,
          plan:
            analysisPlan ??
            "unknown",
        }
      );

      try {
        const detectedNetworkId =
          await detectMobileAddressNetwork({
            address:
              analysisInput,
            selectedNetworkId,
          });

        const effectiveNetworkId =
          detectedNetworkId ??
          selectedNetworkId;

        if (
          effectiveNetworkId !==
          selectedNetworkId
        ) {
          setSelectedNetworkId(
            effectiveNetworkId
          );
        }

        const result =
          await analyzeMobileAddress({
            networkId:
              effectiveNetworkId,
            address:
              analysisInput,
          });

        setAnalysisResult(
          result
        );

        recordMobileHistory({
          networkId:
            effectiveNetworkId,
          address:
            analysisInput,
          analyzedAt:
            Date.now(),
        });

        setAnalysisPlan(
          result.plan
        );

        setAnalysisQuota(
          result.quota
        );

        void trackMobileEvent(
          "analysis_completed",
          {
            network:
              effectiveNetworkId,
            plan:
              result.plan ??
              "unknown",
            result:
              "success",
          }
        );
      } catch (error) {
        void trackMobileEvent(
          "analysis_failed",
          {
            network:
              selectedNetworkId,
            plan:
              analysisPlan ??
              "unknown",
            result:
              error instanceof
                MobileAnalysisError
                ? "analysis_error"
                : "error",
          }
        );

        setAnalysisError(
          error instanceof Error
            ? error.message
            : "AYZO analysis failed."
        );

        if (
          error instanceof
            MobileAnalysisError
        ) {
          setAnalysisPlan(
            error.plan
          );

          setAnalysisQuota(
            error.quota
          );
        }
      } finally {
        setAnalysisLoading(false);
      }
    };

  if (
    askAyzoOpen &&
    analysisResult
  ) {
    return (
      <AskAyzoScreen
        result={
          analysisResult
        }
        onBack={() =>
          setAskAyzoOpen(
            false
          )
        }
      />
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-block">
          <img
            className="brand-logo"
            src="/ayzo-logo.png"
            alt="AYZO"
          />
          <div className="subtitle">
            EVIDENCE FIRST. ON-CHAIN INTELLIGENCE.
          </div>
        </div>

        <label className="network-pill">
          <span className="network-dot" />
          <select
            aria-label="Network"
            value={selectedNetworkId}
            onChange={(event) => {
              setSelectedNetworkId(
                event.target.value as NetworkId
              );
              setAnalysisResult(null);
              setAnalysisError(null);
            }}
          >
            {liveNetworks.map((network) => (
              <option
                key={network.id}
                value={network.id}
              >
                {network.name}
              </option>
            ))}
          </select>
          <span className="chevron">⌄</span>
        </label>
      </header>

      <section
        className="search-panel"
        id="analyze"
      >
        <div className="search-heading">
          <div>
            <div className="eyebrow">ON-CHAIN ANALYSIS</div>
            <h1>Analyze anything on-chain</h1>
          </div>

          <div className="status-pill">
            LIVE
          </div>
        </div>

        <p className="intro">
          Investigate tokens, wallets, funding paths and connected entities
          with evidence-backed intelligence.
        </p>

        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            placeholder="Wallet, token or contract address"
            aria-label="Wallet, token or contract address"
            value={analysisInput}
            onChange={(event) =>
              setAnalysisInput(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                void runAnalysis();
              }
            }}
          />
          <button
            className="analyze-button"
            disabled={analysisLoading}
            onClick={() =>
              void runAnalysis()
            }
          >
            {analysisLoading
              ? "Analyzing..."
              : "Analyze"}
          </button>
        </div>

        {analysisError && (
          <div
            className="analysis-message analysis-error"
            role="alert"
          >
            <strong>Analysis failed</strong>
            <span>{analysisError}</span>
          </div>
        )}

        {analysisPlan && analysisQuota && (
          <MobileQuotaCard
            plan={analysisPlan}
            quota={analysisQuota}
          />
        )}

        {analysisResult && (
          <>
            <MobileAnalysisResultPanel
              result={analysisResult}
            />

            {analysisResult.plan !==
                "pro" &&
            analysisResult.plan !==
                "advanced" && (
              <section className="ask-ayzo-entry-card">
                <div>
                  <div className="eyebrow">
                    ASK AYZO
                  </div>

                  <strong>
                    Ask about this analysis
                  </strong>

                  <span>
                    Ask AYZO is available with Pro or Advanced.
                  </span>
                </div>

                <button
                  disabled
                >
                  Pro / Advanced
                </button>
              </section>
            )}
          </>
        )}
      </section>

      <section
        className="section-block"
        id="profile"
      >
        <div className="section-header">
          <div>
            <div className="eyebrow">AYZO PLANS</div>
            <h2>Upgrade with Google Play</h2>
          </div>
        </div>

        <div className="billing-toggle">
          <button
            className={
              billingInterval === "monthly"
                ? "active"
                : ""
            }
            onClick={() =>
              setBillingInterval(
                "monthly"
              )
            }
          >
            Monthly
          </button>

          <button
            className={
              billingInterval === "annual"
                ? "active"
                : ""
            }
            onClick={() =>
              setBillingInterval(
                "annual"
              )
            }
          >
            Annual
          </button>
        </div>

        <div className="billing-grid">
          {(
            [
              "pro",
              "advanced",
            ] as const
          ).map((planId) => {
            const price =
              getPlayPrice(
                planId,
                billingInterval
              );

            const isCurrentPlan =
              analysisPlan === planId;

            const isIncludedPlan =
              analysisPlan === "advanced" &&
              planId === "pro";

            const isUpgrade =
              analysisPlan === "pro" &&
              planId === "advanced";

            const planButtonLabel =
              isCurrentPlan
                ? "Current Plan"
                : isIncludedPlan
                  ? "Included"
                  : isUpgrade
                    ? "Upgrade to Advanced"
                    : `Choose ${
                        planId === "advanced"
                          ? "Advanced"
                          : "Pro"
                      }`;

            return (
              <article
                className="billing-card"
                key={planId}
              >
                <div>
                  <span className="billing-label">
                    {planId ===
                    "advanced"
                      ? "ADVANCED"
                      : "PRO"}
                  </span>

                  <strong>
                    {planId ===
                    "advanced"
                      ? "Advanced intelligence"
                      : "Professional intelligence"}
                  </strong>

                  <span className="billing-price">
                    {price ??
                      "Loading Google Play price..."}
                  </span>
                </div>

                <button
                  disabled={
                    billingLoading !==
                      null ||
                    isCurrentPlan ||
                    isIncludedPlan
                  }
                  onClick={() =>
                    void startUpgrade(
                      planId
                    )
                  }
                >
                  {billingLoading ===
                  planId
                    ? "Opening Google Play..."
                    : planButtonLabel}
                </button>
              </article>
            );
          })}
        </div>

        {billingMessage && (
          <div className="analysis-message analysis-success">
            <strong>
              Subscription verified
            </strong>
            <span>
              {billingMessage}
            </span>
          </div>
        )}

        {billingError && (
          <div className="analysis-message analysis-error">
            <strong>
              Billing error
            </strong>
            <span>
              {billingError}
            </span>
          </div>
        )}
      </section>

      <section
        className="section-block"
        id="explore"
      >
        <div className="section-header">
          <div>
            <div className="eyebrow">QUICK ACCESS</div>
            <h2>Intelligence tools</h2>
          </div>

          <button className="text-button">
            View all
          </button>
        </div>

        <div className="tool-grid">
          {tools.map((tool) => (
            <button
              className="tool-card"
              key={tool.id}
            >
              <div className="tool-icon">
                {tool.icon}
              </div>
              <div>
                <strong>{tool.title}</strong>
                <span>{tool.description}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <div>
            <div className="eyebrow">NETWORK INTELLIGENCE</div>
            <h2>Evidence overview</h2>
          </div>

          <span className="updated">
            Updated now
          </span>
        </div>

        <article className="evidence-card">
          <div className="metric-row">
            <div className="metric">
              <span>Network</span>
              <strong>{selectedNetwork.name}</strong>
            </div>

            <div className="metric">
              <span>Coverage</span>
              <strong>Live</strong>
            </div>

            <div className="metric">
              <span>Capabilities</span>
              <strong className="green">
                {selectedNetwork.capabilities.length}
              </strong>
            </div>
          </div>

          <div className="divider" />

          {selectedNetwork.capabilities
            .slice(0, 3)
            .map((capability) => (
              <div
                className="signal-row"
                key={capability}
              >
                <div>
                  <strong>
                    {formatCapabilityLabel(capability)}
                  </strong>
                  <span>
                    Evidence-backed {selectedNetwork.shortName} capability
                  </span>
                </div>
                <span className="available">
                  Available
                </span>
              </div>
            ))}
        </article>
      </section>

      <nav className="bottom-nav">
        <button
          className={activeNav === "home" ? "active" : ""}
          onClick={() => {
            setActiveNav("home");
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          <span>⌂</span>
          Home
        </button>

        <button
          className={activeNav === "explore" ? "active" : ""}
          onClick={() => {
            setActiveNav("explore");
            onOpenHistory();
          }}
        >
          <span>↺</span>
          History
        </button>

        <button
          className={`center-action ${
            activeNav === "analyze" ? "active" : ""
          }`}
          onClick={() => {
            setActiveNav("analyze");
            document
              .getElementById("analyze")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });

            window.setTimeout(() => {
              document
                .querySelector<HTMLInputElement>(
                  'input[aria-label="Wallet, token or contract address"]'
                )
                ?.focus();
            }, 350);
          }}
        >
          <span>◎</span>
          Analyze
        </button>

        <button
          className={activeNav === "alerts" ? "active" : ""}
          onClick={() => {
            setActiveNav("alerts");
            onOpenAlerts();
          }}
        >
          <span>♧</span>
          Alerts
        </button>

        <button
          className={activeNav === "profile" ? "active" : ""}
          onClick={() => {
            setActiveNav("profile");
            onOpenProfile();
          }}
        >
          <span>○</span>
          Profile
        </button>
      </nav>

      {analysisResult &&
      (
        analysisResult.plan ===
          "pro" ||
        analysisResult.plan ===
          "advanced"
      ) && (
        <DraggableAskAyzo
          onOpen={() => {
            void trackMobileEvent(
              "ask_ayzo_opened",
              {
                network:
                  analysisResult.networkId,
                plan:
                  analysisResult.plan ??
                  "unknown",
              }
            );

            setAskAyzoOpen(
              true
            );
          }}
        />
      )}
    </main>
  );
}






function AskAyzoScreen({
  result,
  onBack,
}: {
  result:
    MobileAnalysisResult;
  onBack:
    () => void;
}) {
  const [messages, setMessages] =
    useState<
      MobileAskAyzoTurn[]
    >([]);

  const [question, setQuestion] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const quickQuestions = [
    "Summarize the most important findings.",
    "What funding evidence matters here?",
    "Are there important wallet relationships?",
    "What limitations should I know about?",
  ] as const;

  async function submit(
    value?: string
  ) {
    const nextQuestion =
      (
        value ??
        question
      ).trim();

    if (
      !nextQuestion ||
      loading
    ) {
      return;
    }

    const previous =
      messages.slice(-6);

    void trackMobileEvent(
      "ask_ayzo_question_sent",
      {
        network:
          result.networkId,
        plan:
          result.plan ??
          "unknown",
        question_source:
          value
            ? "quick_prompt"
            : "custom",
      }
    );

    setMessages(
      current => [
        ...current,
        {
          role:
            "user",
          content:
            nextQuestion,
        },
      ]
    );

    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response =
        await askMobileAyzo({
          network:
            result.networkId,
          subjectValue:
            result.address,
          question:
            nextQuestion,
          evidencePayload:
            result.data,
          recentConversation:
            previous,
        });

      setMessages(
        current => [
          ...current,
          {
            role:
              "assistant",
            content:
              response.answer,
          },
        ]
      );

      void trackMobileEvent(
        "ask_ayzo_answered",
        {
          network:
            result.networkId,
          plan:
            result.plan ??
            "unknown",
          result:
            "success",
        }
      );
    } catch (caught) {
      void trackMobileEvent(
        "ask_ayzo_failed",
        {
          network:
            result.networkId,
          plan:
            result.plan ??
            "unknown",
          result:
            "error",
        }
      );
      setError(
        caught instanceof Error
          ? caught.message
          : "Ask AYZO is temporarily unavailable."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app ask-ayzo-page">
      <header className="account-page-header">
        <button
          className="account-back-button"
          onClick={onBack}
          aria-label="Back to analysis"
        >
          ‹
        </button>

        <div>
          <div className="eyebrow">
            EVIDENCE ASSISTANT
          </div>
          <h1>Ask AYZO</h1>
        </div>
      </header>

      <section className="ask-ayzo-context">
        <div>
          <strong>
            Current analysis connected
          </strong>

          <span>
            {result.networkId}
          </span>
        </div>

        <code>
          {result.address}
        </code>
      </section>

      <section className="ask-ayzo-conversation">
        {messages.length ===
        0 ? (
          <div className="ask-ayzo-welcome">
            <img
              src="/ayzo-logo.png"
              alt="AYZO"
            />

            <strong>
              Ask about the evidence
            </strong>

            <span>
              AYZO answers from the current bounded analysis and does not invent unsupported on-chain facts.
            </span>

            <div className="ask-ayzo-prompts">
              {quickQuestions.map(
                prompt => (
                  <button
                    key={prompt}
                    onClick={() =>
                      void submit(
                        prompt
                      )
                    }
                  >
                    {prompt}
                  </button>
                )
              )}
            </div>
          </div>
        ) : (
          messages.map(
            (
              message,
              index
            ) => (
              <article
                key={`${message.role}-${index}`}
                className={
                  message.role ===
                    "user"
                    ? "ask-message user"
                    : "ask-message assistant"
                }
              >
                <span>
                  {message.role ===
                    "user"
                    ? "YOU"
                    : "ASK AYZO"}
                </span>

                <p>
                  {message.content}
                </p>
              </article>
            )
          )
        )}

        {loading && (
          <article className="ask-message assistant">
            <span>
              ASK AYZO
            </span>

            <p>
              Reviewing current evidence…
            </p>
          </article>
        )}

        {error && (
          <div
            className="analysis-message analysis-error"
            role="alert"
          >
            <strong>
              Ask AYZO unavailable
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}
      </section>

      <section className="ask-ayzo-composer">
        <textarea
          aria-label="Ask AYZO question"
          placeholder="Ask about this analysis…"
          maxLength={280}
          value={question}
          onChange={event =>
            setQuestion(
              event.target.value
            )
          }
          onKeyDown={event => {
            if (
              event.key ===
                "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              void submit();
            }
          }}
        />

        <button
          disabled={
            loading ||
            !question.trim()
          }
          onClick={() =>
            void submit()
          }
        >
          Send
        </button>
      </section>
    </main>
  );
}

function HistoryScreen({
  onBack,
  onReplay,
}: {
  onBack: () => void;
  onReplay: (
    item: MobileHistoryItem
  ) => void;
}) {
  const [items, setItems] =
    useState<MobileHistoryItem[]>(
      () =>
        readMobileHistory()
    );

  return (
    <main className="app account-page">
      <header className="account-page-header">
        <button
          className="account-back-button"
          onClick={onBack}
          aria-label="Back to home"
        >
          ‹
        </button>

        <div>
          <div className="eyebrow">
            RESEARCH
          </div>
          <h1>History</h1>
        </div>
      </header>

      <div className="history-toolbar">
        <span>
          Recent successful analyses
        </span>

        {items.length > 0 && (
          <button
            onClick={() => {
              clearMobileHistory();
              setItems([]);
            }}
          >
            Clear
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <section className="empty-state-card">
          <strong>
            No analysis history yet
          </strong>
          <span>
            Successful analyses will appear here.
          </span>
        </section>
      ) : (
        <section className="history-list">
          {items.map(
            (
              item,
              index
            ) => (
              <button
                className="history-row"
                key={`${item.networkId}-${item.address}-${item.analyzedAt}-${index}`}
                onClick={() =>
                  onReplay(item)
                }
              >
                <div>
                  <strong>
                    {item.address}
                  </strong>
                  <span>
                    {item.networkId}
                  </span>
                </div>

                <div className="history-meta">
                  <span>
                    {new Date(
                      item.analyzedAt
                    ).toLocaleString()}
                  </span>
                  <b>›</b>
                </div>
              </button>
            )
          )}
        </section>
      )}
    </main>
  );
}

function AlertsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [rules, setRules] =
    useState<MobileAlertRule[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [canManage, setCanManage] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    void getMobileAlerts()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setRules(
          result.rules
        );

        setCanManage(
          result.canManage
        );
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "AYZO alerts are unavailable."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function ruleLabel(
    type: string
  ) {
    return type
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        letter =>
          letter.toUpperCase()
      );
  }

  return (
    <main className="app account-page">
      <header className="account-page-header">
        <button
          className="account-back-button"
          onClick={onBack}
          aria-label="Back to home"
        >
          ‹
        </button>

        <div>
          <div className="eyebrow">
            MONITORING
          </div>
          <h1>Alerts</h1>
        </div>
      </header>

      <section className="alerts-status-card">
        <div>
          <strong>
            Email monitoring
          </strong>
          <span>
            Scheduled evidence monitoring
          </span>
        </div>

        <b>
          {canManage
            ? "PRO"
            : "VIEW"}
        </b>
      </section>

      {loading ? (
        <section className="empty-state-card">
          <strong>
            Loading alerts…
          </strong>
        </section>
      ) : error ? (
        <section className="empty-state-card error">
          <strong>
            Alerts unavailable
          </strong>
          <span>
            {error}
          </span>
        </section>
      ) : rules.length === 0 ? (
        <section className="empty-state-card">
          <strong>
            No alert rules yet
          </strong>
          <span>
            Monitoring rules created for your AYZO account will appear here.
          </span>
        </section>
      ) : (
        <section className="alert-rule-list">
          {rules.map(
            rule => (
              <article
                className="alert-rule-card"
                key={rule.id}
              >
                <div className="alert-rule-top">
                  <strong>
                    {ruleLabel(
                      rule.rule_type
                    )}
                  </strong>

                  <span
                    className={
                      rule.enabled
                        ? "alert-enabled"
                        : "alert-disabled"
                    }
                  >
                    {rule.enabled
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>

                <div className="alert-rule-meta">
                  {rule.network && (
                    <span>
                      {rule.network}
                    </span>
                  )}

                  {rule.subject_type && (
                    <span>
                      {rule.subject_type}
                    </span>
                  )}

                  <span>
                    Email
                  </span>
                </div>

                {rule.subject_value && (
                  <code>
                    {rule.subject_value}
                  </code>
                )}
              </article>
            )
          )}
        </section>
      )}

      {!canManage && (
        <p className="alerts-note">
          Creating and managing monitoring rules requires an eligible AYZO plan.
        </p>
      )}
    </main>
  );
}

function ProfileScreen({
  onBack,
  onOpenSettings,
  onOpenSecurity,
  onOpenAbout,
  onOpenSubscription,
  onSignOut,
}: {
  onBack: () => void;
  onOpenSettings: () => void;
  onOpenSecurity: () => void;
  onOpenAbout: () => void;
  onOpenSubscription: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [email, setEmail] =
    useState("");

  const [plan, setPlan] =
    useState<"free" | "pro" | "advanced" | null>(
      null
    );

  const [quota, setQuota] =
    useState<MobileQuotaStatus | null>(
      null
    );

  const [signingOut, setSigningOut] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (
          !cancelled &&
          data.user?.email
        ) {
          setEmail(data.user.email);
        }
      });

    void getMobileAccountStatus()
      .then((status) => {
        if (cancelled) {
          return;
        }

        setPlan(status.plan);
        setQuota(status.quota);
      })
      .catch((error) => {
        console.error(
          "AYZO profile status query failed.",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const planLabel =
    plan === "advanced"
      ? "Advanced"
      : plan === "pro"
        ? "Pro"
        : "Free";

  return (
    <main className="app account-page">
      <header className="account-page-header">
        <button
          className="account-back-button"
          onClick={onBack}
          aria-label="Back to home"
        >
          ‹
        </button>

        <div>
          <div className="eyebrow">
            ACCOUNT
          </div>
          <h1>Profile</h1>
        </div>
      </header>

      <section className="profile-hero">
        <div className="profile-avatar">
          {email
            ? email
                .slice(0, 1)
                .toUpperCase()
            : "A"}
        </div>

        <div className="profile-identity">
          <strong>AYZO Account</strong>
          <span>
            {email || "Signed in securely"}
          </span>
        </div>
      </section>

      <section className="account-card">
        <div className="account-card-heading">
          <span>Current plan</span>
          <strong>{planLabel}</strong>
        </div>

        {quota && (
          <div className="account-stat-row">
            <span>
              Analyses remaining
            </span>
            <strong>
              {quota.remaining} / {quota.limit}
            </strong>
          </div>
        )}
      </section>

      <section className="account-section">
        <div className="account-section-title">
          ACCOUNT
        </div>

        <div className="account-menu">
          <button
            className="account-menu-row"
            onClick={onOpenSubscription}
          >
            <div>
              <strong>Subscription</strong>
              <span>
                Plan, billing and upgrades
              </span>
            </div>
            <span className="account-chevron">
              ›
            </span>
          </button>

          <button
            className="account-menu-row"
            onClick={onOpenSettings}
          >
            <div>
              <strong>Settings</strong>
              <span>
                App and account preferences
              </span>
            </div>
            <span className="account-chevron">
              ›
            </span>
          </button>

          <button
            className="account-menu-row"
            onClick={onOpenSecurity}
          >
            <div>
              <strong>
                Security & Session
              </strong>
              <span>
                Session and account protection
              </span>
            </div>
            <span className="account-chevron">
              ›
            </span>
          </button>
        </div>
      </section>

      <section className="account-section">
        <div className="account-section-title">
          INFORMATION
        </div>

        <div className="account-menu">
          <button
            className="account-menu-row"
            onClick={onOpenAbout}
          >
            <div>
              <strong>About AYZO</strong>
              <span>
                Product and version information
              </span>
            </div>
            <span className="account-chevron">
              ›
            </span>
          </button>

          <div className="account-menu-row static">
            <div>
              <strong>App version</strong>
              <span>AYZO Android</span>
            </div>
            <span className="account-value">
              1.0 (15)
            </span>
          </div>
        </div>
      </section>

      <section className="settings-danger-zone">
        <button
          className="sign-out-button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);

            void onSignOut()
              .finally(() => {
                setSigningOut(false);
              });
          }}
        >
          {signingOut
            ? "Signing out..."
            : "Sign out"}
        </button>
      </section>

      <nav className="bottom-nav">
        <button onClick={onBack}>
          <span>⌂</span>
          Home
        </button>

        <button disabled>
          <span>↺</span>
          History
        </button>

        <button
          className="center-action"
          onClick={onBack}
        >
          <span>◎</span>
          Analyze
        </button>

        <button disabled>
          <span>♧</span>
          Alerts
        </button>

        <button className="active">
          <span>○</span>
          Profile
        </button>
      </nav>
    </main>
  );
}

function SimpleAccountScreen({
  eyebrow,
  title,
  children,
  onBack,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <main className="app account-page">
      <header className="account-page-header">
        <button
          className="account-back-button"
          onClick={onBack}
          aria-label="Back"
        >
          ‹
        </button>

        <div>
          <div className="eyebrow">
            {eyebrow}
          </div>
          <h1>{title}</h1>
        </div>
      </header>

      {children}
    </main>
  );
}

function SettingsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const [
    analyticsConsent,
    setAnalyticsConsentState,
  ] =
    useState<
      "granted" |
      "denied" |
      null
    >(
      () =>
        getMobileAnalyticsConsent()
    );

  async function updateAnalyticsConsent(
    value:
      "granted" |
      "denied"
  ) {
    await setMobileAnalyticsConsent(
      value
    );

    if (
      value ===
      "granted"
    ) {
      try {
        const {
          data,
        } =
          await supabase.auth.getUser();

        if (
          data.user?.id
        ) {
          await identifyMobileAnalyticsUser(
            data.user.id
          );
        }
      } catch {
        // Analytics must never interrupt Settings.
      }
    }

    setAnalyticsConsentState(
      value
    );
  }

  return (
    <SimpleAccountScreen
      eyebrow="PROFILE"
      title="Settings"
      onBack={onBack}
    >
      <section className="account-menu">
        <div className="account-menu-row static">
          <div>
            <strong>Theme</strong>
            <span>
              AYZO dark interface
            </span>
          </div>
          <span className="account-value">
            Dark
          </span>
        </div>

        <div className="account-menu-row static">
          <div>
            <strong>Network</strong>
            <span>
              Select networks from Home
            </span>
          </div>
          <span className="account-value">
            Enabled
          </span>
        </div>

        <div className="account-menu-row analytics-settings-row">
          <div>
            <strong>
              Product analytics
            </strong>
            <span>
              Anonymous feature-usage measurement. Wallet addresses and Ask AYZO question text are excluded.
            </span>
          </div>

          <div className="analytics-setting-actions">
            <button
              type="button"
              className={
                analyticsConsent ===
                  "denied"
                  ? "active"
                  : ""
              }
              onClick={() =>
                void updateAnalyticsConsent(
                  "denied"
                )
              }
            >
              Off
            </button>

            <button
              type="button"
              className={
                analyticsConsent ===
                  "granted"
                  ? "active"
                  : ""
              }
              onClick={() =>
                void updateAnalyticsConsent(
                  "granted"
                )
              }
            >
              On
            </button>
          </div>
        </div>
      </section>
    </SimpleAccountScreen>
  );
}

function SecurityScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <SimpleAccountScreen
      eyebrow="PROFILE"
      title="Security"
      onBack={onBack}
    >
      <section className="account-menu">
        <div className="account-menu-row static">
          <div>
            <strong>
              Session validation
            </strong>
            <span>
              Automatic secure validation
            </span>
          </div>
          <span className="status-dot-label">
            Active
          </span>
        </div>

        <div className="account-menu-row static">
          <div>
            <strong>
              Idle session protection
            </strong>
            <span>
              Session expires after inactivity
            </span>
          </div>
          <span className="status-dot-label">
            Protected
          </span>
        </div>

        <div className="account-menu-row static">
          <div>
            <strong>Authentication</strong>
            <span>
              Google or secure email sign-in
            </span>
          </div>
          <span className="status-dot-label">
            Enabled
          </span>
        </div>
      </section>
    </SimpleAccountScreen>
  );
}

function AboutScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <SimpleAccountScreen
      eyebrow="AYZO"
      title="About"
      onBack={onBack}
    >
      <section className="about-card">
        <img
          className="about-logo"
          src="/ayzo-logo.png"
          alt="AYZO"
        />

        <strong>
          Evidence-first on-chain intelligence.
        </strong>

        <p>
          Analyze wallets, tokens, funding paths
          and connected entities with
          evidence-backed intelligence.
        </p>

        <span>
          AYZO Android 1.0 · Build 15
        </span>
      </section>
    </SimpleAccountScreen>
  );
}

const SESSION_ACTIVITY_KEY =
  "ayzo:last-active-at";

const SESSION_IDLE_LIMIT_MS =
  24 * 60 * 60 * 1000;

function touchSessionActivity() {
  localStorage.setItem(
    SESSION_ACTIVITY_KEY,
    String(Date.now())
  );
}

function sessionActivityExpired() {
  const value =
    localStorage.getItem(
      SESSION_ACTIVITY_KEY
    );

  if (!value) {
    return false;
  }

  const lastActive =
    Number(value);

  return (
    !Number.isFinite(lastActive) ||
    Date.now() - lastActive >
      SESSION_IDLE_LIMIT_MS
  );
}

function App() {
  const [screen, setScreen] = useState<
    | "checking"
    | "welcome"
    | "signin"
    | "signup"
    | "dashboard"
    | "profile"
    | "settings"
    | "security"
    | "about"
    | "history"
    | "alerts"
  >("checking");

  const [authError, setAuthError] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [emailSent, setEmailSent] =
    useState(false);

  const [emailLoading, setEmailLoading] =
    useState(false);

  const startupCompleteRef =
    useRef(false);

  const authFlowActiveRef =
    useRef(false);

  useEffect(
    () => {
      if (
        screen ===
          "checking"
      ) {
        return;
      }

      void trackMobileEvent(
        "screen_view",
        {
          screen_name:
            screen,
        }
      );
    },
    [
      screen,
    ]
  );

  useEffect(() => {
    let cancelled = false;

    async function returnToWelcome() {
      localStorage.removeItem(
        SESSION_ACTIVITY_KEY
      );

      await supabase.auth.signOut({
        scope: "local",
      });

      if (!cancelled) {
        setScreen("welcome");
      }
    }

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (cancelled) {
        return;
      }

      if (
        error ||
        !data.user
      ) {
        startupCompleteRef.current =
          true;
        setScreen("welcome");
        return;
      }

      if (sessionActivityExpired()) {
        await returnToWelcome();
        return;
      }

      try {
        await validateMobileSession();
      } catch (error) {
        console.error(
          "AYZO mobile session validation failed.",
          error
        );

        await returnToWelcome();
        return;
      }

      if (cancelled) {
        return;
      }

      touchSessionActivity();

      await identifyMobileAnalyticsUser(
        data.user.id
      );

      startupCompleteRef.current =
        true;
      setScreen("dashboard");
    });

    let handle:
      | Awaited<ReturnType<typeof listenForAuthCallback>>
      | undefined;

    void listenForAuthCallback(() => {
      void (async () => {
        try {
          await registerMobileSession();

          if (cancelled) {
            return;
          }

          touchSessionActivity();

          try {
            const {
              data,
            } =
              await supabase.auth.getUser();

            if (
              data.user?.id
            ) {
              await identifyMobileAnalyticsUser(
                data.user.id
              );
            }
          } catch {
            // Analytics identity must never interrupt login.
          }

          void trackMobileEvent(
            "login_success"
          );

          authFlowActiveRef.current =
            false;
          startupCompleteRef.current =
            true;
          setScreen("dashboard");
        } catch (error) {
          console.error(
            "AYZO mobile device registration failed.",
            error
          );

          authFlowActiveRef.current =
            false;
          await returnToWelcome();
        }
      })();
    }).then((listener) => {
      handle = listener;
    });

    let stateHandle:
      | Awaited<ReturnType<typeof CapacitorApp.addListener>>
      | undefined;

    void CapacitorApp.addListener(
      "appStateChange",
      async ({ isActive }) => {
        if (
          !isActive ||
          !startupCompleteRef.current ||
          authFlowActiveRef.current
        ) {
          return;
        }

        const {
          data,
          error,
        } = await supabase.auth.getUser();

        if (
          error ||
          !data.user
        ) {
          return;
        }

        if (sessionActivityExpired()) {
          await returnToWelcome();
          return;
        }

        try {
          await validateMobileSession();
        } catch (error) {
          console.error(
            "AYZO foreground mobile session validation failed.",
            error
          );

          await returnToWelcome();
          return;
        }

        if (!cancelled) {
          touchSessionActivity();
        }
      }
    ).then((listener) => {
      stateHandle = listener;
    });

    return () => {
      cancelled = true;
      void handle?.remove();
      void stateHandle?.remove();
    };
  }, []);

  async function signOutAndReturn() {
    void trackMobileEvent(
      "logout"
    );

    localStorage.removeItem(
      SESSION_ACTIVITY_KEY
    );

    await clearMobileAnalyticsUser();

    await supabase.auth.signOut({
      scope: "local",
    });

    setScreen("welcome");
  }

  async function continueWithEmail(
    isSignup: boolean
  ) {
    setAuthError("");
    setEmailLoading(true);

    try {
      await sendEmailOtp(
        email,
        isSignup
      );

      setEmailSent(true);
    } catch {
      setAuthError(
        isSignup
          ? "We couldn't create your account. Please try again."
          : "We couldn't send the sign-in link. Please try again."
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function continueWithGoogle() {
    const returnScreen =
      screen === "signup"
        ? "signup"
        : "signin";

    setAuthError("");
    authFlowActiveRef.current =
      true;
    setScreen("checking");

    try {
      await signInWithGoogle();
    } catch {
      authFlowActiveRef.current =
        false;
      setScreen(returnScreen);

      setAuthError(
        "Google authentication is temporarily unavailable."
      );
    }
  }

  if (screen === "checking") {
    return (
      <main className="welcome-screen">
        <div className="welcome-content">
          <img
            className="welcome-logo"
            src="/ayzo-logo.png"
            alt="AYZO"
          />
        </div>
      </main>
    );
  }

  if (screen === "dashboard") {
    return (
      <Dashboard
        onOpenProfile={() =>
          setScreen("profile")
        }
        onOpenHistory={() => {
          void trackMobileEvent(
            "history_opened"
          );

          setScreen(
            "history"
          );
        }}
        onOpenAlerts={() => {
          void trackMobileEvent(
            "alerts_opened"
          );

          setScreen(
            "alerts"
          );
        }}
      />
    );
  }

  if (screen === "history") {
    return (
      <HistoryScreen
        onBack={() =>
          setScreen("dashboard")
        }
        onReplay={(item) => {
          void trackMobileEvent(
            "history_replayed",
            {
              network:
                item.networkId,
            }
          );

          setHistoryReplay(item);
          setScreen("dashboard");
        }}
      />
    );
  }

  if (screen === "alerts") {
    return (
      <AlertsScreen
        onBack={() =>
          setScreen("dashboard")
        }
      />
    );
  }

  if (screen === "profile") {
    return (
      <ProfileScreen
        onBack={() =>
          setScreen("dashboard")
        }
        onOpenSettings={() =>
          setScreen("settings")
        }
        onOpenSecurity={() =>
          setScreen("security")
        }
        onOpenAbout={() =>
          setScreen("about")
        }
        onOpenSubscription={() => {
          void trackMobileEvent(
            "plan_viewed",
            {
              source:
                "profile",
            }
          );

          setScreen(
            "dashboard"
          );
        }}
        onSignOut={
          signOutAndReturn
        }
      />
    );
  }

  if (screen === "settings") {
    return (
      <SettingsScreen
        onBack={() =>
          setScreen("profile")
        }
      />
    );
  }

  if (screen === "security") {
    return (
      <SecurityScreen
        onBack={() =>
          setScreen("profile")
        }
      />
    );
  }

  if (screen === "about") {
    return (
      <AboutScreen
        onBack={() =>
          setScreen("profile")
        }
      />
    );
  }

  if (screen === "signin" || screen === "signup") {
    const isSignup = screen === "signup";

    return (
      <main className="welcome-screen">
        <div className="welcome-content">
          <img
            className="welcome-logo"
            src="/ayzo-logo.png"
            alt="AYZO"
          />

          <div className="welcome-copy">
            <div className="eyebrow">
              {isSignup ? "CREATE ACCOUNT" : "WELCOME BACK"}
            </div>

            <h1>
              {isSignup
                ? "Create your AYZO account"
                : "Sign in to AYZO"}
            </h1>

            <p>
              Continue securely with Google or email.
            </p>
          </div>

          <div className="welcome-actions">
            {emailSent ? (
              <div className="email-sent-card">
                <strong>Check your email</strong>
                <span>
                  We sent a secure AYZO link to continue.
                </span>
              </div>
            ) : (
              <>
                <button
                  className="google-auth-button"
                  onClick={continueWithGoogle}
                >
                  Continue with Google
                </button>

                <input
                  className="auth-email-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                />

                <button
                  className="secondary-auth-button"
                  disabled={emailLoading}
                  onClick={() =>
                    continueWithEmail(isSignup)
                  }
                >
                  {emailLoading
                    ? "Sending..."
                    : "Continue with email"}
                </button>
              </>
            )}

            <button
              className="text-auth-button"
              onClick={() =>
                setScreen(
                  isSignup ? "signin" : "signup"
                )
              }
            >
              {isSignup
                ? "Already have an account? Sign in"
                : "New to AYZO? Create account"}
            </button>

            {authError ? (
              <div className="auth-error">
                {authError}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="welcome-screen">
      <div className="welcome-content">
        <img
          className="welcome-logo"
          src="/ayzo-logo.png"
          alt="AYZO"
        />

        <div className="welcome-copy">
          <div className="eyebrow">
            EVIDENCE FIRST
          </div>

          <h1>
            On-chain intelligence,
            without the noise.
          </h1>

          <p>
            Analyze tokens, wallets, funding paths
            and connected entities with evidence-backed intelligence.
          </p>
        </div>

        <div className="welcome-actions">
          <button
            className="primary-auth-button"
            onClick={() => setScreen("signin")}
          >
            Sign in
          </button>

          <button
            className="secondary-auth-button"
            onClick={() => setScreen("signup")}
          >
            Create account
          </button>
        </div>

        <div className="welcome-footer">
          Secure access · No wallet connection required
        </div>
      </div>
    </main>
  );
}

ReactDOM
  .createRoot(
    document.getElementById("root")!
  )
  .render(
    <React.StrictMode>
      <App />
      <MobileAnalyticsConsentBanner />
    </React.StrictMode>
  );
