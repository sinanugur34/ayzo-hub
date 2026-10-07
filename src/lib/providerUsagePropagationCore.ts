import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  ProviderUsageContext,
} from "./providerUsageTelemetryCore";

import {
  normalizeProviderUsageContext,
} from "./providerUsageTelemetryCore";

export const
  PROVIDER_USAGE_CONTEXT_HEADER =
    "x-ayzo-provider-usage-context";

export const
  PROVIDER_USAGE_SIGNATURE_HEADER =
    "x-ayzo-provider-usage-signature";

const PROPAGATION_VERSION =
  1;

const DEFAULT_MAX_AGE_MS =
  2 * 60 * 1000;

const MAX_FUTURE_SKEW_MS =
  30 * 1000;

const MAX_CONTEXT_HEADER_LENGTH =
  2048;

type PropagationEnvelope = {
  version:
    1;

  issuedAt:
    number;

  context:
    ProviderUsageContext;
};

export type ProviderUsagePropagationHeaders = {
  contextHeader:
    string;

  signatureHeader:
    string;
};

function signingPayload(
  encoded:
    string
): string {
  return (
    "ayzo-provider-usage-context:v1:" +
    encoded
  );
}

function signatureFor(
  encoded:
    string,

  secret:
    string
): string {
  return createHmac(
    "sha256",
    secret
  )
    .update(
      signingPayload(
        encoded
      )
    )
    .digest(
      "hex"
    );
}

function safeSignatureEqual(
  left:
    string,

  right:
    string
): boolean {
  if (
    !/^[a-f0-9]{64}$/i.test(
      left
    ) ||
    !/^[a-f0-9]{64}$/i.test(
      right
    )
  ) {
    return false;
  }

  const leftBuffer =
    Buffer.from(
      left,
      "hex"
    );

  const rightBuffer =
    Buffer.from(
      right,
      "hex"
    );

  if (
    leftBuffer.length !==
      rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

export function encodeProviderUsagePropagation(
  context:
    ProviderUsageContext,

  secret:
    string,

  nowMs =
    Date.now()
): ProviderUsagePropagationHeaders {
  const normalized =
    normalizeProviderUsageContext(
      context
    );

  const boundedSecret =
    secret.trim();

  if (
    boundedSecret.length <
      16
  ) {
    throw new Error(
      "Provider telemetry propagation secret is unavailable."
    );
  }

  const envelope:
    PropagationEnvelope = {
      version:
        PROPAGATION_VERSION,

      issuedAt:
        Math.trunc(
          nowMs
        ),

      context:
        normalized,
    };

  const encoded =
    Buffer.from(
      JSON.stringify(
        envelope
      ),
      "utf8"
    ).toString(
      "base64url"
    );

  if (
    encoded.length >
      MAX_CONTEXT_HEADER_LENGTH
  ) {
    throw new Error(
      "Provider telemetry propagation context is too large."
    );
  }

  return {
    contextHeader:
      encoded,

    signatureHeader:
      signatureFor(
        encoded,
        boundedSecret
      ),
  };
}

export function decodeProviderUsagePropagation(
  input: {
    contextHeader:
      string;

    signatureHeader:
      string;
  },

  secret:
    string,

  options?: {
    nowMs?:
      number;

    maxAgeMs?:
      number;
  }
): ProviderUsageContext | null {
  const encoded =
    input.contextHeader
      .trim();

  const providedSignature =
    input.signatureHeader
      .trim();

  const boundedSecret =
    secret.trim();

  if (
    !encoded ||
    encoded.length >
      MAX_CONTEXT_HEADER_LENGTH ||
    boundedSecret.length <
      16
  ) {
    return null;
  }

  const expectedSignature =
    signatureFor(
      encoded,
      boundedSecret
    );

  if (
    !safeSignatureEqual(
      providedSignature,
      expectedSignature
    )
  ) {
    return null;
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        Buffer.from(
          encoded,
          "base64url"
        ).toString(
          "utf8"
        )
      );
  } catch {
    return null;
  }

  if (
    !parsed ||
    typeof parsed !==
      "object"
  ) {
    return null;
  }

  const envelope =
    parsed as
      Partial<
        PropagationEnvelope
      >;

  if (
    envelope.version !==
      PROPAGATION_VERSION ||
    !Number.isFinite(
      envelope.issuedAt
    ) ||
    !envelope.context
  ) {
    return null;
  }

  const nowMs =
    options?.nowMs ??
    Date.now();

  const maxAgeMs =
    options?.maxAgeMs ??
    DEFAULT_MAX_AGE_MS;

  const ageMs =
    nowMs -
    Number(
      envelope.issuedAt
    );

  if (
    ageMs >
      maxAgeMs ||
    ageMs <
      -MAX_FUTURE_SKEW_MS
  ) {
    return null;
  }

  try {
    return normalizeProviderUsageContext(
      envelope.context
    );
  } catch {
    return null;
  }
}
