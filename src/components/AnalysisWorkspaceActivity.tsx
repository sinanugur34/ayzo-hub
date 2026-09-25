"use client";

import {
  useMemo,
  useState,
} from "react";

import styles from "@/components/AnalysisWorkspaceConcept.module.css";

import type {
  ActivityTimeline,
  ActivityTimelineEvent,
} from "@/lib/intelligence/activityTimeline";

function shortAddress(
  value:
    string | null
) {
  if (!value) {
    return "Unknown";
  }

  if (
    value.length <=
    18
  ) {
    return value;
  }

  return `${value.slice(
    0,
    7
  )}…${value.slice(
    -5
  )}`;
}

function numericValue(
  event:
    ActivityTimelineEvent
) {
  if (
    !event.formattedValue
  ) {
    return null;
  }

  const parsed =
    Number(
      event.formattedValue
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function eventAmount(
  event:
    ActivityTimelineEvent
) {
  if (
    !event.formattedValue
  ) {
    return "Observed";
  }

  return [
    event.formattedValue,
    event.asset,
  ]
    .filter(Boolean)
    .join(" ");
}

function eventName(
  event:
    ActivityTimelineEvent
) {
  const from =
    shortAddress(
      event.from
    );

  const to =
    shortAddress(
      event.to
    );

  if (
    event.from ||
    event.to
  ) {
    return `${from} → ${to}`;
  }

  if (
    event.direction ===
    "incoming"
  ) {
    return "Incoming evidence";
  }

  if (
    event.direction ===
    "outgoing"
  ) {
    return "Outgoing evidence";
  }

  return "Observed transaction";
}

function formattedTime(
  value:
    string | null
) {
  if (!value) {
    return "Time unavailable";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Time unavailable";
  }

  return date.toLocaleTimeString(
    "en-US",
    {
      timeZone:
        "UTC",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,
    }
  );
}

function chartTime(
  value:
    string | null
) {
  if (!value) {
    return 0;
  }

  const parsed =
    Date.parse(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function compactNumber(
  value:
    number
) {
  const abs =
    Math.abs(
      value
    );

  if (
    abs >=
    1_000_000
  ) {
    return `${(
      value /
      1_000_000
    ).toFixed(
      1
    )}m`;
  }

  if (
    abs >=
    1_000
  ) {
    return `${(
      value /
      1_000
    ).toFixed(
      1
    )}k`;
  }

  return value.toLocaleString(
    "en-US",
    {
      maximumFractionDigits:
        4,
    }
  );
}

export default function AnalysisWorkspaceActivity({
  timeline,
  subject,
  selectedEvidenceRefs,
}: {
  timeline:
    ActivityTimeline | null;

  subject:
    string;

  selectedEvidenceRefs:
    readonly string[];
}) {
  const [
    selectedHash,
    setSelectedHash,
  ] =
    useState<
      string | null
    >(
      null
    );

  const events =
    useMemo(
      () =>
        (
          timeline?.events ??
          []
        ).slice(
          0,
          5
        ),
      [
        timeline,
      ]
    );

  const selectedEvidenceHash =
    selectedEvidenceRefs.find(
      ref =>
        events.some(
          event =>
            event.transactionHash.toLowerCase() ===
            ref.toLowerCase()
        )
    ) ??
    null;

  const activeHash =
    selectedHash ??
    selectedEvidenceHash;

  function selectTransaction(
    hash:
      string
  ) {
    const next =
      activeHash?.toLowerCase() ===
      hash.toLowerCase()
        ? null
        : hash;

    setSelectedHash(
      next
    );

    window.dispatchEvent(
      new CustomEvent(
        "ayzo:evidence-selection",
        {
          detail: {
            evidenceRefs:
              next
                ? [
                    next,
                  ]
                : [],
          },
        }
      )
    );
  }

  const valuedEvents =
    events.filter(
      event =>
        numericValue(
          event
        ) !== null
    );

  const maxValue =
    Math.max(
      1,
      ...valuedEvents.map(
        event =>
          Math.abs(
            numericValue(
              event
            ) ??
            0
          )
      )
    );

  const firstValued =
    valuedEvents[0];

  const chartAsset =
    firstValued
      ?.asset ??
    null;

  const chartEvents =
    valuedEvents
      .filter(
        event =>
          event.asset ===
          chartAsset
      )
      .slice()
      .sort(
        (
          left,
          right
        ) =>
          chartTime(
            left.timestamp
          ) -
          chartTime(
            right.timestamp
          )
      );

  type FlowPoint = {
    id:
      string | null;

    hash:
      string | null;

    time:
      string;

    value:
      number;
  };

  const cumulative =
    chartEvents.reduce<
      FlowPoint[]
    >(
      (
        points,
        event
      ) => {
        const previousValue =
          points[
            points.length -
            1
          ]?.value ??
          0;

        const value =
          numericValue(
            event
          ) ??
          0;

        const nextValue =
          event.direction ===
          "incoming"
            ? previousValue +
              value
            : event.direction ===
                "outgoing"
              ? previousValue -
                value
              : previousValue;

        return [
          ...points,

          {
            id:
              event.id,

            hash:
              event.transactionHash,

            time:
              formattedTime(
                event.timestamp
              ),

            value:
              nextValue,
          },
        ];
      },
      [
        {
          id:
            null,

          hash:
            null,

          time:
            "Start",

          value:
            0,
        },
      ]
    );

  const finalFlowValue =
    cumulative[
      cumulative.length -
      1
    ]?.value ??
    0;

  const chartWidth =
    620;

  const chartHeight =
    221;

  const pad = {
    left:
      48,

    right:
      18,

    top:
      14,

    bottom:
      32,
  };

  const values =
    cumulative.map(
      point =>
        point.value
    );

  const minValue =
    Math.min(
      0,
      ...values
    );

  const maxChartValue =
    Math.max(
      0,
      ...values
    );

  const range =
    Math.max(
      1,
      maxChartValue -
      minValue
    );

  function xFor(
    index:
      number
  ) {
    if (
      cumulative.length <=
      1
    ) {
      return (
        chartWidth /
        2
      );
    }

    return (
      pad.left +
      (
        chartWidth -
        pad.left -
        pad.right
      ) *
        index /
        (
          cumulative.length -
          1
        )
    );
  }

  function yFor(
    value:
      number
  ) {
    return (
      chartHeight -
      pad.bottom -
      (
        chartHeight -
        pad.top -
        pad.bottom
      ) *
        (
          value -
          minValue
        ) /
        range
    );
  }

  const points =
    cumulative.map(
      (
        point,
        index
      ) =>
        `${xFor(
          index
        )},${yFor(
          point.value
        )}`
    ).join(
      " "
    );

  const zeroY =
    yFor(
      0
    );

  const selectedPoint =
    cumulative.find(
      point =>
        point.hash &&
        activeHash &&
        point.hash.toLowerCase() ===
          activeHash.toLowerCase()
    );

  const selectedIndex =
    selectedPoint
      ? cumulative.indexOf(
          selectedPoint
        )
      : -1;

  const selectedEvent =
    events.find(
      event =>
        activeHash &&
        event.transactionHash.toLowerCase() ===
          activeHash.toLowerCase()
    );

  return (
    <>
      <section
        id="analysis-activity"
        className={`${styles.lower} scroll-mt-24`}
      >
        <div
          className={`${styles.card} ${styles.panel}`}
        >
          <div>
            <h3 className={styles.briefTitle}>
              Incoming and outgoing funds
            </h3>

            <p className={styles.briefSub}>
              Observed transaction flows collected by AYZO.
            </p>
          </div>

          {events.length >
          0 ? (
            <div className={`mt-4 ${styles.flowRows}`}>
              {events.map(
                event => {
                  const numeric =
                    Math.abs(
                      numericValue(
                        event
                      ) ??
                      0
                    );

                  const width =
                    Math.max(
                      8,
                      Math.round(
                        numeric /
                        maxValue *
                        100
                      )
                    );

                  const selected =
                    activeHash?.toLowerCase() ===
                    event.transactionHash.toLowerCase();

                  return (
                    <button
                      key={
                        event.id
                      }
                      type="button"
                      aria-pressed={
                        selected
                      }
                      onClick={() =>
                        selectTransaction(
                          event.transactionHash
                        )
                      }
                      className={`${styles.flow} ${
                        event.direction ===
                        "outgoing"
                          ? styles.flowOutgoing
                          : ""
                      } ${
                        selected
                          ? styles.flowSelected
                          : ""
                      }`}
                    >
                      <span className={styles.flowName}>
                        {
                          eventName(
                            event
                          )
                        }
                      </span>

                      <span className={styles.flowBar}>
                        <i
                          className={styles.flowBarFill}
                          style={{
                            width:
                              `${width}%`,
                          }}
                        />
                      </span>

                      <span className={styles.flowAmount}>
                        {
                          eventAmount(
                            event
                          )
                        }
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <div className={`mt-4 ${styles.flowRows}`}>
              {[
                "Incoming evidence unavailable",
                "Outgoing evidence unavailable",
                "Additional flow evidence unavailable",
              ].map(
                label => (
                  <div
                    key={label}
                    className={`${styles.flow} ${styles.flowPlaceholder}`}
                  >
                    <span className={styles.flowName}>
                      {label}
                    </span>

                    <span className={styles.flowBar}>
                      <i
                        className={styles.flowBarFill}
                        style={{
                          width:
                            "0%",
                        }}
                      />
                    </span>

                    <span className={styles.flowAmount}>
                      —
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          <div className={styles.flowSummary}>
            <span>
              Sources → analyzed subject → recipients
            </span>

            <strong>
              Evidence only
            </strong>
          </div>
        </div>

        <div
          className={`${styles.card} ${styles.panel}`}
        >
          <div>
            <h3 className={styles.briefTitle}>
              Flow over time
            </h3>

            <p className={styles.briefSub}>
              Cumulative observed net flow for one comparable asset.
              This is not wallet balance.
            </p>
          </div>

          {chartEvents.length >
          0 ? (
            <svg
              className={styles.chartSvg}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Cumulative observed net transaction flow"
            >
              {[
                maxChartValue,
                (
                  maxChartValue +
                  minValue
                ) /
                  2,
                minValue,
              ].map(
                (
                  value,
                  index
                ) => (
                  <g
                    key={
                      `${value}:${index}`
                    }
                  >
                    <line
                      className={styles.chartGrid}
                      x1={
                        pad.left
                      }
                      x2={
                        chartWidth -
                        pad.right
                      }
                      y1={
                        yFor(
                          value
                        )
                      }
                      y2={
                        yFor(
                          value
                        )
                      }
                    />

                    <text
                      className={styles.chartAxis}
                      x="2"
                      y={
                        yFor(
                          value
                        ) +
                        4
                      }
                    >
                      {
                        compactNumber(
                          value
                        )
                      }
                    </text>
                  </g>
                )
              )}

              <polygon
                className={styles.chartArea}
                points={`${xFor(
                  0
                )},${zeroY} ${points} ${xFor(
                  cumulative.length -
                  1
                )},${zeroY}`}
              />

              <polyline
                className={styles.chartCurve}
                points={
                  points
                }
              />

              {cumulative
                .slice(
                  1
                )
                .map(
                  (
                    point,
                    index
                  ) => (
                    <text
                      key={
                        point.id
                      }
                      className={styles.chartAxis}
                      textAnchor="middle"
                      x={
                        xFor(
                          index +
                          1
                        )
                      }
                      y={
                        chartHeight -
                        9
                      }
                    >
                      {
                        point.time
                      }
                    </text>
                  )
                )}

              {selectedPoint &&
                selectedIndex >=
                  0 && (
                <>
                  <line
                    className={styles.chartPointer}
                    x1={
                      xFor(
                        selectedIndex
                      )
                    }
                    x2={
                      xFor(
                        selectedIndex
                      )
                    }
                    y1={
                      pad.top
                    }
                    y2={
                      chartHeight -
                      pad.bottom
                    }
                  />

                  <circle
                    className={styles.chartMarker}
                    cx={
                      xFor(
                        selectedIndex
                      )
                    }
                    cy={
                      yFor(
                        selectedPoint.value
                      )
                    }
                    r="6"
                  />
                </>
              )}
            </svg>
          ) : (
            <svg
              className={styles.chartSvg}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="No comparable observed flow series available"
            >
              {[46, 110, 174].map(
                y => (
                  <line
                    key={y}
                    className={styles.chartGrid}
                    x1={pad.left}
                    x2={
                      chartWidth -
                      pad.right
                    }
                    y1={y}
                    y2={y}
                  />
                )
              )}

              <text
                className={styles.chartAxis}
                x={
                  chartWidth /
                  2
                }
                y="112"
                textAnchor="middle"
              >
                No comparable value series in this bounded evidence window
              </text>
            </svg>
          )}

          <div className={styles.chartInfo}>
            <span>
              {selectedEvent
                ? eventName(
                    selectedEvent
                  )
                : chartAsset
                  ? `Observed ${chartAsset} net flow`
                  : "No comparable flow"}
            </span>

            <strong>
              {selectedPoint
                ? `${compactNumber(
                    selectedPoint.value
                  )}${chartAsset
                    ? ` ${chartAsset}`
                    : ""}`
                : chartEvents.length >
                    0
                  ? `${compactNumber(
                      finalFlowValue
                    )}${chartAsset
                      ? ` ${chartAsset}`
                      : ""}`
                  : "—"}
            </strong>
          </div>
        </div>
      </section>

      <section
        id="analysis-timeline"
        className={`${styles.card} ${styles.panel} ${styles.ledger} scroll-mt-24`}
      >
        <div className={styles.ledgerHead}>
          <div>
            <h3>
              Transaction timeline
            </h3>

            <p>
              Select an event to highlight the same evidence
              in the flow view.
            </p>
          </div>

          <span className={styles.chip}>
            {timeline?.status?.toUpperCase() ??
              "UNAVAILABLE"}
          </span>
        </div>

        {events.length >
        0 ? (
          <div className={styles.ledgerList}>
            {events.map(
              event => {
                const selected =
                  activeHash?.toLowerCase() ===
                  event.transactionHash.toLowerCase();

                return (
                  <button
                    key={
                      event.id
                    }
                    type="button"
                    aria-pressed={
                      selected
                    }
                    onClick={() =>
                      selectTransaction(
                        event.transactionHash
                      )
                    }
                    className={`${styles.event} ${
                      selected
                        ? styles.eventSelected
                        : ""
                    }`}
                  >
                    <time>
                      {
                        formattedTime(
                          event.timestamp
                        )
                      }
                    </time>

                    <strong>
                      {
                        eventName(
                          event
                        )
                      }
                    </strong>

                    <span>
                      {
                        eventAmount(
                          event
                        )
                      }
                    </span>
                  </button>
                );
              }
            )}
          </div>
        ) : (
          <div className={styles.ledgerList}>
            {Array.from(
              {
                length:
                  5,
              },
              (
                _,
                index
              ) => (
                <div
                  key={index}
                  className={`${styles.event} ${styles.eventPlaceholder}`}
                >
                  <time>
                    —
                  </time>

                  <strong>
                    No event
                  </strong>

                  <span>
                    Unavailable
                  </span>
                </div>
              )
            )}
          </div>
        )}

        <div className={styles.flowSummary}>
          <span>
            {
              timeline?.limitation ??
              "Only evidence already collected by AYZO is shown."
            }
          </span>

          <strong>
            {shortAddress(
              subject
            )}
          </strong>
        </div>
      </section>
    </>
  );
}
