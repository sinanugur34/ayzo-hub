"use client";

import {
  useSyncExternalStore,
} from "react";

function subscribe() {
  return () => {};
}

function formatLocalDateTime(
  value:
    string |
    number |
    null |
    undefined
) {
  if (!value) {
    return "—";
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
    return "—";
  }

  const formatter =
    new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    );

  const timeZone =
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone;

  const formatted =
    formatter.format(
      date
    );

  return timeZone
    ? `${formatted} · ${timeZone}`
    : formatted;
}

export default function AdminLocalDateTime({
  value,
}: {
  value:
    string |
    number |
    null |
    undefined;
}) {
  const text =
    useSyncExternalStore(
      subscribe,

      () =>
        formatLocalDateTime(
          value
        ),

      () =>
        "—"
    );

  return (
    <span>
      {text}
    </span>
  );
}
