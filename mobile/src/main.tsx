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

function Dashboard() {
  return (
    <main className="app">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">AYZO</div>
          <div className="subtitle">
            EVIDENCE FIRST. ON-CHAIN INTELLIGENCE.
          </div>
        </div>

        <button className="network-pill">
          <span className="network-dot" />
          Ethereum
          <span className="chevron">⌄</span>
        </button>
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
            placeholder="Token, wallet or transaction hash"
            aria-label="Token, wallet or transaction hash"
          />
          <button className="analyze-button">
            Analyze
          </button>
        </div>
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
          <button className="tool-card">
            <div className="tool-icon">◎</div>
            <div>
              <strong>Token Analysis</strong>
              <span>Authorities, holders & liquidity</span>
            </div>
          </button>

          <button className="tool-card">
            <div className="tool-icon">◌</div>
            <div>
              <strong>Wallet Analysis</strong>
              <span>Behavior, history & signals</span>
            </div>
          </button>

          <button className="tool-card">
            <div className="tool-icon">↗</div>
            <div>
              <strong>Funding Trace</strong>
              <span>Follow source and destination</span>
            </div>
          </button>

          <button className="tool-card">
            <div className="tool-icon">⌘</div>
            <div>
              <strong>Connections</strong>
              <span>Entities, clusters & links</span>
            </div>
          </button>
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
              <strong>Ethereum</strong>
            </div>

            <div className="metric">
              <span>Coverage</span>
              <strong>Live</strong>
            </div>

            <div className="metric">
              <span>Signals</span>
              <strong className="green">Active</strong>
            </div>
          </div>

          <div className="divider" />

          <div className="signal-row">
            <div>
              <strong>Funding provenance</strong>
              <span>Trace transaction origins</span>
            </div>
            <span className="available">Available</span>
          </div>

          <div className="signal-row">
            <div>
              <strong>Wallet relationships</strong>
              <span>Identify linked addresses</span>
            </div>
            <span className="available">Available</span>
          </div>

          <div className="signal-row">
            <div>
              <strong>Cluster intelligence</strong>
              <span>Surface connected entities</span>
            </div>
            <span className="available">Available</span>
          </div>
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
