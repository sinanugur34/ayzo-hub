import {
  NETWORKS,
} from "../../src/lib/networks/registry";

import type {
  MobileAnalysisResult,
} from "./mobileIntelligence";

import {
  buildMobileResultSummary,
} from "./mobileResultSummary";

import {
  buildMobileEvidenceWorkspace,
} from "./mobileEvidenceWorkspace";

function shortAddress(
  value: string
) {
  if (
    value.length <=
    24
  ) {
    return value;
  }

  return (
    `${value.slice(
      0,
      10
    )}` +
    "..." +
    `${value.slice(
      -8
    )}`
  );
}

function displayValue(
  value: string | null
) {
  if (!value) {
    return "Not reported";
  }

  return value
    .replace(
      /[-_]/g,
      " "
    )
    .replace(
      /^./,
      letter =>
        letter
          .toUpperCase()
    );
}

function planLabel(
  plan:
    MobileAnalysisResult["plan"]
) {
  if (
    plan === "advanced"
  ) {
    return "ADVANCED";
  }

  if (
    plan === "pro"
  ) {
    return "PRO";
  }

  if (
    plan === "free"
  ) {
    return "FREE";
  }

  return "AYZO";
}

function eventDirectionLabel(
  direction:
    "incoming" |
    "outgoing" |
    "self" |
    "observed"
) {
  switch (
    direction
  ) {
    case "incoming":
      return "IN";

    case "outgoing":
      return "OUT";

    case "self":
      return "SELF";

    case "observed":
      return "OBSERVED";
  }
}

export default function MobileAnalysisResultPanel({
  result,
}: {
  result:
    MobileAnalysisResult;
}) {
  const summary =
    buildMobileResultSummary(
      result.data
    );

  const workspace =
    buildMobileEvidenceWorkspace({
      networkId:
        result.networkId,

      address:
        result.address,

      data:
        result.data,
    });

  const network =
    NETWORKS[
      result.networkId
    ];

  const incoming =
    workspace.timeline.filter(
      event =>
        event.direction ===
        "incoming"
    ).length;

  const outgoing =
    workspace.timeline.filter(
      event =>
        event.direction ===
        "outgoing"
    ).length;

  const primaryFinding =
    summary.findings[0] ??
    null;

  const primaryLimitation =
    summary.caveats[0] ??
    workspace.limitation;

  return (
    <article className="analysis-workspace-mobile">
      <header className="analysis-workspace-header">
        <div>
          <div className="eyebrow">
            AYZO · ON-CHAIN INTELLIGENCE
          </div>

          <h2>
            Follow the evidence.
          </h2>

          <p>
            See the finding first, then inspect
            observed connections and transaction
            evidence behind it.
          </p>
        </div>

        <div className="analysis-workspace-chips">
          <span>
            {planLabel(
              result.plan
            )}
          </span>

          <span>
            ● {network.name}
          </span>
        </div>
      </header>

      <div className="analysis-workspace-subject">
        <div className="analysis-workspace-subject-icon">
          ⌕
        </div>

        <div>
          <strong>
            Analyzed subject
          </strong>

          <span>
            {shortAddress(
              result.address
            )}
          </span>
        </div>

        <small>
          EVIDENCE
        </small>
      </div>

      <section className="analysis-workspace-metrics">
        <div>
          <span>
            Observed incoming
          </span>

          <strong>
            {workspace.timeline.length >
            0
              ? incoming
              : "—"}
          </strong>

          <small>
            bounded activity
          </small>
        </div>

        <div>
          <span>
            Observed outgoing
          </span>

          <strong>
            {workspace.timeline.length >
            0
              ? outgoing
              : "—"}
          </strong>

          <small>
            bounded activity
          </small>
        </div>

        <div>
          <span>
            Evidence records
          </span>

          <strong>
            {
              workspace
                .timeline
                .length
            }
          </strong>

          <small>
            current window
          </small>
        </div>

        <div>
          <span>
            Data coverage
          </span>

          <strong>
            {displayValue(
              summary.coverage
            )}
          </strong>

          <small>
            explicit scope
          </small>
        </div>
      </section>

      <section className="mobile-analysis-overview-grid">
        <div className="mobile-evidence-map">
          <div className="mobile-analysis-section-heading">
            <div>
              <span>
                VISUAL EVIDENCE
              </span>

              <strong>
                Evidence map
              </strong>
            </div>

            <small>
              {
                workspace
                  .nodes
                  .length
              }{" "}
              nodes ·{" "}
              {
                workspace
                  .edges
                  .length
              }{" "}
              links
            </small>
          </div>

          <div className="mobile-evidence-root">
            <span>
              ANALYZED SUBJECT
            </span>

            <strong>
              {shortAddress(
                result.address
              )}
            </strong>
          </div>

          {workspace.edges.length >
          0 ? (
            <div className="mobile-evidence-connections">
              {workspace.edges
                .slice(
                  0,
                  8
                )
                .map(
                  edge => {
                    const source =
                      workspace.nodes.find(
                        node =>
                          node.id ===
                          edge.source
                      );

                    const target =
                      workspace.nodes.find(
                        node =>
                          node.id ===
                          edge.target
                      );

                    if (
                      !source ||
                      !target
                    ) {
                      return null;
                    }

                    return (
                      <div
                        className="mobile-evidence-connection"
                        key={
                          edge.id
                        }
                      >
                        <div className="mobile-evidence-connection-path">
                          <span>
                            {shortAddress(
                              source.label
                            )}
                          </span>

                          <b>
                            {edge.direction ===
                            "bidirectional"
                              ? "↔"
                              : edge.direction ===
                                  "observed"
                                ? "—"
                                : "→"}
                          </b>

                          <span>
                            {shortAddress(
                              target.label
                            )}
                          </span>
                        </div>

                        <small>
                          {
                            edge.label
                          }
                        </small>
                      </div>
                    );
                  }
                )}
            </div>
          ) : (
            <div className="analysis-empty">
              No supported relationship edge was
              available in this bounded evidence
              window.
            </div>
          )}
        </div>

        <aside className="mobile-evidence-brief">
          <div className="mobile-analysis-section-heading">
            <div>
              <span>
                AYZO EVIDENCE BRIEF
              </span>

              <strong>
                Observation first
              </strong>
            </div>
          </div>

          <div className="mobile-evidence-primary">
            <strong>
              {primaryFinding
                ?.title ??
                "No additional evidence-backed finding"}
            </strong>

            <p>
              {primaryFinding
                ?.summary ??
                "The bounded evidence window did not produce an additional structured finding."}
            </p>
          </div>

          <div className="mobile-evidence-brief-stats">
            <div>
              <span>
                Findings
              </span>

              <strong>
                {
                  summary
                    .findings
                    .length
                }
              </strong>
            </div>

            <div>
              <span>
                Modules
              </span>

              <strong>
                {
                  summary
                    .modules
                    .length
                }
              </strong>
            </div>
          </div>

          <div className="mobile-evidence-limit">
            <strong>
              Evidence limit
            </strong>

            <span>
              {
                primaryLimitation
              }
            </span>
          </div>
        </aside>
      </section>

      <section className="mobile-activity-workspace">
        <div className="mobile-analysis-section-heading">
          <div>
            <span>
              OBSERVED ACTIVITY
            </span>

            <strong>
              Evidence timeline
            </strong>
          </div>

          <small>
            {
              workspace
                .timeline
                .length
            }{" "}
            records
          </small>
        </div>

        {workspace.timeline.length >
        0 ? (
          <div className="mobile-activity-list">
            {workspace.timeline.map(
              event => (
                <div
                  className="mobile-activity-event"
                  key={
                    event.id
                  }
                >
                  <div className="mobile-activity-marker" />

                  <div className="mobile-activity-content">
                    <div className="mobile-activity-event-heading">
                      <strong>
                        {
                          event.title
                        }
                      </strong>

                      <span>
                        {eventDirectionLabel(
                          event.direction
                        )}
                      </span>
                    </div>

                    {event.detail && (
                      <p>
                        {
                          event.detail
                        }
                      </p>
                    )}

                    <div className="mobile-activity-meta">
                      {event.timestamp && (
                        <span>
                          {
                            event
                              .timestamp
                          }
                        </span>
                      )}

                      {event.transactionRef && (
                        <span>
                          TX{" "}
                          {shortAddress(
                            event
                              .transactionRef
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="analysis-empty">
            Transaction timeline is unavailable for
            the evidence returned in this analysis.
          </div>
        )}
      </section>

      <details className="mobile-detailed-evidence">
        <summary>
          <div>
            <span>
              DETAILED EVIDENCE
            </span>

            <small>
              Compact first · full evidence preserved
            </small>
          </div>

          <b>›</b>
        </summary>

        <div className="mobile-detailed-evidence-body">
          {summary.findings.length >
            0 && (
            <div className="analysis-result-group">
              <div className="analysis-result-title">
                Findings
              </div>

              {summary.findings.map(
                finding => (
                  <div
                    className="analysis-finding"
                    key={
                      finding.id
                    }
                  >
                    <div className="analysis-finding-top">
                      <strong>
                        {
                          finding.title
                        }
                      </strong>

                      {finding.confidence && (
                        <span>
                          {
                            finding
                              .confidence
                          }
                        </span>
                      )}
                    </div>

                    {finding.summary && (
                      <p>
                        {
                          finding
                            .summary
                        }
                      </p>
                    )}

                    <div className="analysis-finding-meta">
                      {finding.category && (
                        <span>
                          {
                            finding
                              .category
                          }
                        </span>
                      )}

                      {finding.severity && (
                        <span>
                          {
                            finding
                              .severity
                          }
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {summary.modules.length >
            0 && (
            <div className="analysis-result-group">
              <div className="analysis-result-title">
                Evidence coverage
              </div>

              {summary.modules.map(
                module => (
                  <div
                    className="analysis-module-row"
                    key={
                      module.id
                    }
                  >
                    <div>
                      <strong>
                        {
                          module.label
                        }
                      </strong>

                      {module.detail && (
                        <span>
                          {
                            module.detail
                          }
                        </span>
                      )}
                    </div>

                    <span className="analysis-module-status">
                      {displayValue(
                        module.status
                      )}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          {summary.caveats.length >
            0 && (
            <div className="analysis-result-group">
              <div className="analysis-result-title">
                Coverage notes
              </div>

              {summary.caveats.map(
                (
                  caveat,
                  index
                ) => (
                  <p
                    className="analysis-caveat"
                    key={`${index}-${caveat}`}
                  >
                    {caveat}
                  </p>
                )
              )}
            </div>
          )}

          {summary.findings.length ===
            0 &&
            summary.modules.length ===
              0 && (
            <div className="analysis-empty">
              Analysis completed, but no structured
              findings or module status was returned.
            </div>
          )}
        </div>
      </details>

      <section className="mobile-research-tools-bridge">
        <div>
          <span>
            RESEARCH TOOLS
          </span>

          <strong>
            Continue the investigation
          </strong>
        </div>

        <p>
          Ask AYZO and plan-aware investigation
          tools remain available without changing
          the underlying evidence.
        </p>
      </section>

      <p className="mobile-analysis-disclaimer">
        AYZO presents observed on-chain evidence.
        Connections do not establish identity,
        common ownership, intent or control.
      </p>
    </article>
  );
}
