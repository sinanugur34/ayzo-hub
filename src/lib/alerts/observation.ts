import type {
  AlertEvidenceRef,
} from "@/lib/alerts/detection";


type RecordValue =
  Record<
    string,
    unknown
  >;


export type ActivityEvidenceExtraction = {
  available:
    boolean;

  evidence:
    readonly AlertEvidenceRef[];
};


function asRecord(
  value:
    unknown
): RecordValue | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as
        RecordValue
    : null;
}


function readHash(
  value:
    RecordValue
) {
  for (
    const key of [
      "transactionHash",
      "txid",
      "hash",
    ]
  ) {
    const raw =
      value[key];

    if (
      typeof raw ===
        "string" &&
      raw.trim()
    ) {
      return raw
        .trim()
        .toLowerCase();
    }
  }

  return null;
}


function readTimestamp(
  value:
    RecordValue
) {
  for (
    const key of [
      "occurredAt",
      "timestamp",
      "observedAt",
      "blockTimestamp",
    ]
  ) {
    const raw =
      value[key];

    if (
      typeof raw ===
        "string" &&
      Number.isFinite(
        Date.parse(raw)
      )
    ) {
      return raw;
    }
  }

  return null;
}


function explicitlyUnsupported(
  value:
    RecordValue
) {
  const state =
    value.evidenceState;

  if (
    typeof state ===
      "string" &&
    state !==
      "SUPPORTED"
  ) {
    return true;
  }

  return false;
}


function dedupe(
  values:
    readonly AlertEvidenceRef[]
) {
  const map =
    new Map<
      string,
      AlertEvidenceRef
    >();

  for (
    const value of values
  ) {
    const key =
      JSON.stringify([
        value.category,
        value.network,
        value.reference,
      ]);

    if (!map.has(key)) {
      map.set(
        key,
        value
      );
    }
  }

  return Array.from(
    map.values()
  );
}


function timelineRows(
  timeline:
    RecordValue
):
  | readonly unknown[]
  | null {
  if (
    Array.isArray(
      timeline.events
    )
  ) {
    return timeline.events;
  }

  if (
    Array.isArray(
      timeline.items
    )
  ) {
    return timeline.items;
  }

  return null;
}


export function extractEvmActivityEvidence({
  data,
  network,
}: {
  data:
    unknown;

  network:
    string;
}): ActivityEvidenceExtraction {
  const root =
    asRecord(data);

  if (!root) {
    return {
      available:
        false,

      evidence:
        [],
    };
  }

  const timeline =
    asRecord(
      root.activityTimeline
    );

  if (!timeline) {
    return {
      available:
        false,

      evidence:
        [],
    };
  }

  const rows =
    timelineRows(
      timeline
    );

  if (!rows) {
    return {
      available:
        false,

      evidence:
        [],
    };
  }

  const evidence:
    AlertEvidenceRef[] =
      [];

  for (
    const raw of rows
  ) {
    const row =
      asRecord(raw);

    if (
      !row ||
      explicitlyUnsupported(
        row
      )
    ) {
      continue;
    }

    const hash =
      readHash(row);

    if (!hash) {
      continue;
    }

    evidence.push({
      category:
        "activity",

      reference:
        `evm-tx:${hash}`,

      network,

      occurredAt:
        readTimestamp(row),

      evidenceState:
        "SUPPORTED",
    });
  }

  return {
    available:
      true,

    evidence:
      dedupe(evidence),
  };
}


export function extractBitcoinActivityEvidence({
  data,
}: {
  data:
    unknown;
}): ActivityEvidenceExtraction {
  const root =
    asRecord(data);

  if (!root) {
    return {
      available:
        false,

      evidence:
        [],
    };
  }

  /*
   * Prefer AYZO Activity Timeline when
   * present.
   */
  const timeline =
    asRecord(
      root.activityTimeline
    );

  if (timeline) {
    const rows =
      timelineRows(
        timeline
      );

    if (rows) {
      const evidence:
        AlertEvidenceRef[] =
          [];

      for (
        const raw of rows
      ) {
        const row =
          asRecord(raw);

        if (!row) {
          continue;
        }

        const hash =
          readHash(row);

        if (!hash) {
          continue;
        }

        evidence.push({
          category:
            "activity",

          reference:
            `bitcoin-tx:${hash}`,

          network:
            "bitcoin",

          occurredAt:
            readTimestamp(row),

          evidenceState:
            "SUPPORTED",
        });
      }

      return {
        available:
          true,

        evidence:
          dedupe(evidence),
      };
    }
  }

  /*
   * Bitcoin engine canonical history
   * is directly observed transaction
   * evidence, not ownership inference.
   */
  const history =
    asRecord(
      root.history
    );

  if (!history) {
    return {
      available:
        false,

      evidence:
        [],
    };
  }

  const rows =
    Array.isArray(
      history.transactions
    )
      ? history.transactions
      : Array.isArray(
          history.items
        )
        ? history.items
        : null;

  if (!rows) {
    return {
      available:
        false,

      evidence:
        [],
    };
  }

  const evidence:
    AlertEvidenceRef[] =
      [];

  for (
    const raw of rows
  ) {
    const row =
      asRecord(raw);

    if (!row) {
      continue;
    }

    const hash =
      readHash(row);

    if (!hash) {
      continue;
    }

    evidence.push({
      category:
        "activity",

      reference:
        `bitcoin-tx:${hash}`,

      network:
        "bitcoin",

      occurredAt:
        readTimestamp(row),

      evidenceState:
        "SUPPORTED",
    });
  }

  return {
    available:
      true,

    evidence:
      dedupe(evidence),
  };
}
