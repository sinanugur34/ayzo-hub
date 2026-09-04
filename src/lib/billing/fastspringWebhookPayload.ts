export type FastSpringWebhookEvent = {
  id:
    string;

  type:
    string;

  live:
    boolean;

  created:
    number | null;

  data:
    Record<
      string,
      unknown
    >;
};

export type FastSpringWebhookPayload = {
  events:
    FastSpringWebhookEvent[];
};

function isRecord(
  value:
    unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}

function parseEvent(
  value:
    unknown
):
  FastSpringWebhookEvent |
  null {
  if (
    !isRecord(
      value
    )
  ) {
    return null;
  }

  const id =
    typeof value.id ===
      "string"
      ? value.id.trim()
      : "";

  const type =
    typeof value.type ===
      "string"
      ? value.type.trim()
      : "";

  if (
    !id ||
    !type ||
    typeof value.live !==
      "boolean" ||
    !isRecord(
      value.data
    )
  ) {
    return null;
  }

  const created =
    typeof value.created ===
      "number" &&
    Number.isFinite(
      value.created
    )
      ? value.created
      : null;

  return {
    id,
    type,
    live:
      value.live,
    created,
    data:
      value.data,
  };
}

export function parseFastSpringWebhookPayload(
  rawBody:
    string
):
  | {
      ok: true;
      payload:
        FastSpringWebhookPayload;
    }
  | {
      ok: false;
    } {
  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        rawBody
      );
  } catch {
    return {
      ok:
        false,
    };
  }

  if (
    !isRecord(
      parsed
    ) ||
    !Array.isArray(
      parsed.events
    ) ||
    parsed.events.length ===
      0
  ) {
    return {
      ok:
        false,
    };
  }

  const events =
    parsed.events.map(
      parseEvent
    );

  if (
    events.some(
      event =>
        event ===
        null
    )
  ) {
    return {
      ok:
        false,
    };
  }

  return {
    ok:
      true,

    payload: {
      events:
        events as
          FastSpringWebhookEvent[],
    },
  };
}
