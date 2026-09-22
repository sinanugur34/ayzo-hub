const GOOGLE_PLAY_PACKAGE =
  "io.ayzo.app";

type RecordValue =
  Record<string, unknown>;

export type GooglePlayRtdnEvent =
  | {
      kind: "subscription";
      messageId: string;
      notificationType: number;
      purchaseToken: string;
    }
  | {
      kind: "test";
      messageId: string;
    }
  | {
      kind: "ignored";
      messageId: string;
    };

function isRecord(
  value: unknown
): value is RecordValue {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function parseGooglePlayRtdnEnvelope(
  value: unknown
):
  | {
      ok: true;
      event: GooglePlayRtdnEvent;
    }
  | {
      ok: false;
    } {
  if (!isRecord(value)) {
    return { ok: false };
  }

  const message =
    value.message;

  if (!isRecord(message)) {
    return { ok: false };
  }

  const messageId =
    message.messageId;

  const data =
    message.data;

  if (
    typeof messageId !== "string" ||
    messageId.length < 1 ||
    messageId.length > 512 ||
    typeof data !== "string" ||
    data.length < 1 ||
    data.length > 262_144
  ) {
    return { ok: false };
  }

  let decoded:
    unknown;

  try {
    const json =
      Buffer.from(
        data,
        "base64"
      ).toString("utf8");

    decoded =
      JSON.parse(json);
  } catch {
    return { ok: false };
  }

  if (!isRecord(decoded)) {
    return { ok: false };
  }

  if (
    decoded.packageName !==
    GOOGLE_PLAY_PACKAGE
  ) {
    return { ok: false };
  }

  if (
    isRecord(
      decoded.testNotification
    )
  ) {
    return {
      ok: true,
      event: {
        kind: "test",
        messageId,
      },
    };
  }

  const subscription =
    decoded.subscriptionNotification;

  if (!isRecord(subscription)) {
    return {
      ok: true,
      event: {
        kind: "ignored",
        messageId,
      },
    };
  }

  const notificationType =
    subscription.notificationType;

  const purchaseToken =
    subscription.purchaseToken;

  if (
    typeof notificationType !==
      "number" ||
    !Number.isInteger(
      notificationType
    ) ||
    typeof purchaseToken !==
      "string" ||
    purchaseToken.length < 16 ||
    purchaseToken.length > 4096 ||
    purchaseToken.trim() !==
      purchaseToken
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    event: {
      kind: "subscription",
      messageId,
      notificationType,
      purchaseToken,
    },
  };
}
