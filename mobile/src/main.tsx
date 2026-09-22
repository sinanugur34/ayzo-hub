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

function Dashboard() {
  const [selectedNetworkId, setSelectedNetworkId] =
    useState<NetworkId>("ethereum");

  const selectedNetwork =
    NETWORKS[selectedNetworkId];

  const liveNetworks =
    getLiveNetworks();

  const tools =
    getProductToolsForNetwork(selectedNetworkId);

  const [analysisInput, setAnalysisInput] =
    useState("");

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

    void getGooglePlaySubscriptionProducts()
      .then((result) => {
        if (!cancelled) {
          setBillingProducts(
            result.products
          );
        }
      })
      .catch(() => undefined);

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

              setAnalysisPlan(
                verified.plan
              );

              setBillingMessage(
                `${verified.plan === "advanced" ? "Advanced" : "Pro"} activated through Google Play.`
              );
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

    return () => {
      cancelled =
        true;

      void listener?.remove();
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

        const result =
          await startGooglePlaySubscriptionPurchase({
            planId,
            interval:
              billingInterval,
            userId:
              data.user.id,
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

        setAnalysisPlan(
          result.plan
        );

        setAnalysisQuota(
          result.quota
        );
      } catch (error) {
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

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">AYZO</div>
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

      <section className="search-panel">
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
          <MobileAnalysisResultPanel
            result={analysisResult}
          />
        )}
      </section>

      <section className="section-block">
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
                    null
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
                    : `Choose ${
                        planId ===
                        "advanced"
                          ? "Advanced"
                          : "Pro"
                      }`}
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

      <section className="section-block">
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
        <button className="active">
          <span>⌂</span>
          Home
        </button>

        <button>
          <span>◇</span>
          Explore
        </button>

        <button className="center-action">
          <span>◎</span>
          Analyze
        </button>

        <button>
          <span>♧</span>
          Alerts
        </button>

        <button>
          <span>○</span>
          Profile
        </button>
      </nav>
    </main>
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
    "checking" | "welcome" | "signin" | "signup" | "dashboard"
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
    return <Dashboard />;
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
    </React.StrictMode>
  );
