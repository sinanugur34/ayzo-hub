"use client";

import type {
  FormEvent,
  ReactNode,
} from "react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  NETWORKS,
} from "@/lib/networks/registry";

import type {
  LiveAnalysisNetworkId,
} from "@/lib/networks/addressSelection";

import styles from "./AppResearchDesk.module.css";

type PlanId =
  | "free"
  | "pro"
  | "advanced";

type AccountState = {
  authenticated: boolean;
  plan: PlanId;
};

function isPlanId(
  value: unknown
): value is PlanId {
  return (
    value === "free" ||
    value === "pro" ||
    value === "advanced"
  );
}

function planLabel(
  account:
    AccountState | null
) {
  if (!account) {
    return "Research access";
  }

  if (
    !account.authenticated
  ) {
    return "Sign in";
  }

  if (
    account.plan ===
    "advanced"
  ) {
    return "Advanced plan";
  }

  if (
    account.plan ===
    "pro"
  ) {
    return "Pro plan";
  }

  return "Free plan";
}

function addressPlaceholder(
  network:
    LiveAnalysisNetworkId
) {
  if (
    network ===
    "hedera"
  ) {
    return "Paste a Hedera account ID, for example 0.0.2";
  }

  return "Paste a wallet or token contract address";
}

export default function AppResearchDesk({
  network,
  liveNetworks,
  address,
  loading,
  isValid,
  message,
  accountControls,
  accessStatus,
  onNetworkChange,
  onAddressChange,
  onSubmit,
}: {
  network:
    LiveAnalysisNetworkId;

  liveNetworks:
    readonly LiveAnalysisNetworkId[];

  address:
    string;

  loading:
    boolean;

  isValid:
    boolean | null;

  message:
    string;

  accountControls:
    ReactNode;

  accessStatus:
    ReactNode;

  onNetworkChange:
    (
      network:
        LiveAnalysisNetworkId
    ) => void;

  onAddressChange:
    (
      value:
        string
    ) => void;

  onSubmit:
    (
      event:
        FormEvent<HTMLFormElement>
    ) => void;
}) {
  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    account,
    setAccount,
  ] =
    useState<
      AccountState | null
    >(null);

  const addressRef =
    useRef<HTMLInputElement>(
      null
    );

  const detailsRef =
    useRef<HTMLDetailsElement>(
      null
    );

  useEffect(() => {
    let cancelled =
      false;

    async function loadAccount() {
      try {
        const response =
          await fetch(
            "/api/account/plan",
            {
              cache:
                "no-store",

              credentials:
                "same-origin",
            }
          );

        const data:
          unknown =
          await response.json();

        if (
          cancelled ||
          typeof data !==
            "object" ||
          data === null
        ) {
          return;
        }

        const row =
          data as Record<
            string,
            unknown
          >;

        setAccount({
          authenticated:
            row.authenticated ===
            true,

          plan:
            isPlanId(
              row.plan
            )
              ? row.plan
              : "free",
        });
      } catch {
        if (!cancelled) {
          setAccount({
            authenticated:
              false,

            plan:
              "free",
          });
        }
      }
    }

    void loadAccount();

    return () => {
      cancelled =
        true;
    };
  }, []);

  useEffect(() => {
    function handleShortcut(
      event:
        KeyboardEvent
    ) {
      if (
        event.key !==
          "/" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const target =
        event.target;

      if (
        target instanceof
          HTMLElement &&
        (
          target.tagName ===
            "INPUT" ||
          target.tagName ===
            "TEXTAREA" ||
          target.tagName ===
            "SELECT" ||
          target.isContentEditable
        )
      ) {
        return;
      }

      event.preventDefault();

      addressRef.current
        ?.focus();
    }

    document.addEventListener(
      "keydown",
      handleShortcut
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleShortcut
      );
    };
  }, []);

  /*
   * AYZO_NETWORK_DISMISS_V1
   * Fine interaction parity:
   * - click outside closes the selector
   * - Escape closes and returns keyboard focus
   */
  useEffect(() => {
    function closeNetworkMenu(
      restoreFocus:
        boolean
    ) {
      const details =
        detailsRef.current;

      if (
        !details ||
        !details.open
      ) {
        return;
      }

      details.removeAttribute(
        "open"
      );

      if (
        restoreFocus
      ) {
        const summary =
          details.querySelector(
            "summary"
          );

        if (
          summary instanceof
            HTMLElement
        ) {
          summary.focus();
        }
      }
    }

    function handlePointerDown(
      event:
        PointerEvent
    ) {
      const details =
        detailsRef.current;

      const target =
        event.target;

      if (
        !details ||
        !details.open ||
        !(target instanceof Node) ||
        details.contains(
          target
        )
      ) {
        return;
      }

      closeNetworkMenu(
        false
      );
    }

    function handleEscape(
      event:
        KeyboardEvent
    ) {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      closeNetworkMenu(
        true
      );
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const filteredNetworks =
    useMemo(
      () => {
        const normalized =
          query
            .trim()
            .toLowerCase();

        if (!normalized) {
          return liveNetworks;
        }

        return liveNetworks.filter(
          id => {
            const definition =
              NETWORKS[id];

            return (
              definition.name
                .toLowerCase()
                .includes(
                  normalized
                ) ||
              definition.shortName
                .toLowerCase()
                .includes(
                  normalized
                )
            );
          }
        );
      },
      [
        liveNetworks,
        query,
      ]
    );

  const selected =
    NETWORKS[
      network
    ];

  function chooseNetwork(
    value:
      LiveAnalysisNetworkId
  ) {
    onNetworkChange(
      value
    );

    setQuery("");

    detailsRef.current
      ?.removeAttribute(
        "open"
      );
  }

  const statusText =
    message ||
    "Paste an address to detect its format. You can also choose a network.";

  return (
    <div
      className={
        styles.product
      }
    >
      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.wordmark
          }
          aria-label="AYZO"
        >
          AYZO
          <span>.</span>
        </div>

        <span
          className={
            styles.productLabel
          }
        >
          Evidence-first intelligence
        </span>

        <span
          className={
            styles.planLabel
          }
        >
          {planLabel(
            account
          )}
        </span>

        <div
          className={
            styles.accountSlot
          }
        >
          {accountControls}
        </div>
      </header>

      <div
        className={
          styles.body
        }
      >
        <section
          aria-labelledby="ayzo-research-desk-heading"
        >
          <p
            className={
              styles.eyebrow
            }
          >
            YOUR RESEARCH DESK
          </p>

          <h1
            id="ayzo-research-desk-heading"
            className={
              styles.title
            }
          >
            Start your investigation.
          </h1>

          <p
            className={
              styles.intro
            }
          >
            Start with a public address. Follow the funds and inspect the connections.
          </p>

          <div
            className={
              styles.networkHighlight
            }
          >
            <div
              className={
                styles.networkCount
              }
            >
              <strong>
                {
                  liveNetworks.length
                }
              </strong>

              <span>
                <b>
                  LIVE NETWORKS
                </b>
              </span>
            </div>

            <span
              className={
                styles.autoLabel
              }
            >
              <span
                aria-hidden="true"
              >
                ◇
              </span>

              Automatic network detection
            </span>
          </div>

          <form
            id="analyzer"
            onSubmit={
              onSubmit
            }
            aria-busy={
              loading
            }
            className={
              styles.entry
            }
          >
            <div
              className={
                styles.fields
              }
            >
              <div
                className={
                  styles.networkField
                }
              >
                <label
                  className={
                    styles.label
                  }
                >
                  Network ·{" "}
                  {
                    liveNetworks.length
                  }{" "}
                  live
                </label>

                <details
                  ref={
                    detailsRef
                  }
                  className={
                    styles.networkDetails
                  }
                >
                  <summary
                    className={
                      styles.networkTrigger
                    }
                    aria-label={`Select network. Current network: ${selected.name}`}
                  >
                    <span
                      className={
                        styles.networkDot
                      }
                      aria-hidden="true"
                    />

                    <span
                      className={
                        styles.networkTriggerName
                      }
                    >
                      {
                        selected.name
                      }
                      {" · "}
                      {
                        selected.shortName
                      }
                    </span>

                    <span
                      className={
                        styles.chevron
                      }
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </summary>

                  <div
                    className={
                      styles.networkMenu
                    }
                  >
                    <label
                      htmlFor="ayzo-network-search"
                      className={
                        styles.networkSearchLabel
                      }
                    >
                      Find a network ·{" "}
                      {
                        liveNetworks.length
                      }{" "}
                      live
                    </label>

                    <input
                      id="ayzo-network-search"
                      type="search"
                      value={
                        query
                      }
                      onChange={
                        event =>
                          setQuery(
                            event.target
                              .value
                          )
                      }
                      placeholder="Search name or ticker"
                      autoComplete="off"
                      className={
                        styles.networkSearch
                      }
                    />

                    <div
                      className={
                        styles.networkResults
                      }
                    >
                      {
                        filteredNetworks.map(
                          id => {
                            const definition =
                              NETWORKS[id];

                            const active =
                              id ===
                              network;

                            return (
                              <button
                                key={
                                  id
                                }
                                type="button"
                                aria-pressed={
                                  active
                                }
                                onClick={() =>
                                  chooseNetwork(
                                    id
                                  )
                                }
                                className={
                                  styles.networkChoice
                                }
                              >
                                <span>
                                  {
                                    definition.name
                                  }
                                </span>

                                <small>
                                  {
                                    definition.shortName
                                  }
                                </small>
                              </button>
                            );
                          }
                        )
                      }
                    </div>

                    {
                      filteredNetworks.length ===
                        0 && (
                        <p
                          className={
                            styles.noNetworks
                          }
                        >
                          No networks found.
                        </p>
                      )
                    }
                  </div>
                </details>
              </div>

              <div
                className={
                  styles.addressField
                }
              >
                <label
                  htmlFor="ayzo-public-address"
                  className={
                    styles.label
                  }
                >
                  Public address
                </label>

                <input
                  ref={
                    addressRef
                  }
                  id="ayzo-public-address"
                  type="text"
                  value={
                    address
                  }
                  onChange={
                    event =>
                      onAddressChange(
                        event.target
                          .value
                      )
                  }
                  placeholder={
                    addressPlaceholder(
                      network
                    )
                  }
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={
                    false
                  }
                  enterKeyHint="go"
                  aria-describedby="ayzo-address-hint ayzo-detection-status"
                  aria-invalid={
                    isValid ===
                    false
                  }
                  className={
                    styles.addressInput
                  }
                />
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  address
                    .trim()
                    .length ===
                    0
                }
                className={
                  styles.analyze
                }
              >
                {
                  loading
                    ? "Analyzing..."
                    : "Analyze"
                }

                <span
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
            </div>

            <div
              className={
                styles.addressGuidance
              }
            >
              <p
                id="ayzo-address-hint"
              >
                Use the public wallet or token contract address you want to investigate.
              </p>

              <details
                className={
                  styles.addressHelp
                }
              >
                <summary>
                  Which address should I use?

                  <span
                    aria-hidden="true"
                  >
                    ↓
                  </span>
                </summary>

                <div
                  className={
                    styles.addressHelpContent
                  }
                >
                  <p>
                    <strong>
                      Research a wallet:
                    </strong>
                    {" "}
                    copy its public address from your wallet or a blockchain explorer.
                  </p>

                  <p>
                    <strong>
                      Research a token:
                    </strong>
                    {" "}
                    copy its contract address or mint address from a blockchain explorer. Token analysis depends on network support.
                  </p>

                  <p>
                    <strong>
                      Check the network:
                    </strong>
                    {" "}
                    some networks share the same address format. Choose the network where the activity occurred.
                  </p>

                  <p
                    className={
                      styles.formatExample
                    }
                  >
                    <strong>
                      Format example only
                    </strong>

                    <code>
                      0x1234567890abcdef1234567890abcdef12345678
                    </code>

                    <span>
                      An Ethereum-style address. This example is not a recommended investigation.
                    </span>
                  </p>

                  <p>
                    Only a public address is needed. No wallet connection required.
                  </p>
                </div>
              </details>
            </div>

            <div
              className={
                styles.detection
              }
            >
              <p
                id="ayzo-detection-status"
                aria-live="polite"
                className={
                  isValid ===
                    false
                    ? styles.invalidMessage
                    : isValid ===
                        true
                      ? styles.validMessage
                      : styles.neutralMessage
                }
              >
                {statusText}
              </p>
            </div>

            <div
              className={
                styles.accessSlot
              }
            >
              {accessStatus}
            </div>

            <p
              className={
                styles.shortcuts
              }
            >
              <kbd>
                /
              </kbd>

              Focus address

              <span>
                ·
              </span>

              <kbd>
                Enter
              </kbd>

              Analyze
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
