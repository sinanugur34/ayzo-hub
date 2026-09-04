import type {
  ActivityTimeline as ActivityTimelineData,
  ActivityTimelineDirection,
  ActivityTimelineEvent,
} from "@/lib/intelligence/activityTimeline";

function short(
  value:
    string | null
) {
  if (!value) {
    return "—";
  }

  if (
    value.length <=
    18
  ) {
    return value;
  }

  return (
    `${value.slice(0, 8)}` +
    `...` +
    `${value.slice(-6)}`
  );
}

function formatTimestamp(
  value:
    string | null
) {
  if (!value) {
    return "Timestamp unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Timestamp unavailable";
  }

  return (
    date.toLocaleString(
      "en-US",
      {
        timeZone:
          "UTC",

        month:
          "short",

        day:
          "numeric",

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false,
      }
    ) +
    " UTC"
  );
}

function directionIcon(
  direction:
    ActivityTimelineDirection
) {
  switch (direction) {
    case "incoming":
      return "↓";

    case "outgoing":
      return "↑";

    case "self":
      return "↻";

    case "observed":
      return "↔";
  }
}

function directionClass(
  direction:
    ActivityTimelineDirection
) {
  switch (direction) {
    case "incoming":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    case "outgoing":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300";

    case "self":
      return "border-zinc-700 bg-zinc-900 text-zinc-400";

    case "observed":
      return "border-violet-500/20 bg-violet-500/10 text-violet-300";
  }
}

function eventTitle(
  event:
    ActivityTimelineEvent
) {
  const prefix =
    event.direction ===
      "incoming"
      ? "Incoming"
      : event.direction ===
          "outgoing"
        ? "Outgoing"
        : event.direction ===
            "self"
          ? "Self"
          : "Observed";

  switch (event.kind) {
    case "native_transfer":
      return `${prefix} native transfer`;

    case "token_transfer":
      return `${prefix} token transfer`;

    case "transaction":
      return `${prefix} transaction`;
  }
}

function amountLabel(
  event:
    ActivityTimelineEvent
) {
  if (
    !event.rawValue ||
    !event.asset
  ) {
    return null;
  }

  return `${
    event.formattedValue ??
    event.rawValue
  } ${event.asset}`;
}

function statusLabel(
  status:
    ActivityTimelineData["status"]
) {
  switch (status) {
    case "complete":
      return "SUPPORTED";

    case "limited":
      return "BOUNDED";

    case "unavailable":
      return "UNAVAILABLE";
  }
}

function statusClass(
  status:
    ActivityTimelineData["status"]
) {
  switch (status) {
    case "complete":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    case "limited":
      return "border-violet-500/20 bg-violet-500/10 text-violet-300";

    case "unavailable":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }
}

export default function ActivityTimeline({
  timeline,
}: {
  timeline:
    ActivityTimelineData;
}) {
  return (
    <section className="rounded-3xl border border-zinc-900 bg-black/20 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
            ACTIVITY TIMELINE
          </div>

          <h3 className="mt-2 text-lg font-semibold text-zinc-100">
            Recent evidence-backed activity
          </h3>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            A bounded chronological view built only from activity evidence already collected by AYZO.
          </p>
        </div>

        <span
          className={`rounded-full border px-2.5 py-1 text-[9px] font-medium tracking-[0.12em] ${statusClass(
            timeline.status
          )}`}
        >
          {statusLabel(
            timeline.status
          )}
        </span>
      </div>

      {timeline.status ===
      "unavailable" ? (
        <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4 text-xs leading-5 text-zinc-600">
          Activity timeline evidence is currently unavailable.
        </div>
      ) : timeline.events.length ===
        0 ? (
        <div className="mt-5 rounded-2xl border border-zinc-900 bg-black/20 p-4 text-xs leading-5 text-zinc-600">
          No activity events were observed in the bounded evidence window.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {timeline.events.map(
            event => {
              const amount =
                amountLabel(
                  event
                );

              return (
                <article
                  key={
                    event.id
                  }
                  className="relative rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base ${directionClass(
                        event.direction
                      )}`}
                    >
                      {directionIcon(
                        event.direction
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-medium text-zinc-200">
                          {eventTitle(
                            event
                          )}
                        </div>

                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 text-[9px] font-medium tracking-[0.1em] text-emerald-300">
                          {
                            event.evidenceState
                          }
                        </span>
                      </div>

                      <div className="mt-1 text-[10px] text-zinc-600">
                        {formatTimestamp(
                          event.timestamp
                        )}

                        {event.blockNumber !==
                          null &&
                          ` · Block ${event.blockNumber.toLocaleString(
                            "en-US"
                          )}`}
                      </div>

                      {(
                        event.from ||
                        event.to
                      ) && (
                        <div className="mt-3 font-mono text-[11px] text-zinc-500">
                          {short(
                            event.from
                          )}{" "}
                          <span className="text-zinc-700">
                            →
                          </span>{" "}
                          {short(
                            event.to
                          )}
                        </div>
                      )}

                      {amount && (
                        <div className="mt-3 text-sm font-semibold text-zinc-200">
                          {amount}
                        </div>
                      )}

                      <p className="mt-3 text-xs leading-5 text-zinc-500">
                        {
                          event.whyItMatters
                        }
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-zinc-700">
                        <span>
                          Tx{" "}
                          <span className="font-mono text-zinc-500">
                            {short(
                              event.transactionHash
                            )}
                          </span>
                        </span>

                        {event.counterparty && (
                          <span>
                            Counterparty{" "}
                            <span className="font-mono text-zinc-500">
                              {short(
                                event.counterparty
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}

      {timeline.limitation && (
        <p className="mt-4 border-t border-zinc-900 pt-4 text-[10px] leading-5 text-zinc-700">
          {timeline.limitation}
        </p>
      )}

      <div className="mt-4 text-[10px] text-zinc-700">
        Evidence window:{" "}
        {timeline.evidenceWindow.transactionCount} transaction(s)
        {" · "}
        {timeline.evidenceWindow.transferCount} token transfer(s)
        {" · "}
        showing up to{" "}
        {timeline.evidenceWindow.maxEvents} event(s)
      </div>
    </section>
  );
}
