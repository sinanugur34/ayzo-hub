import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

function validHexDigest(
  value: string
) {
  return /^[a-f0-9]{64}$/i.test(
    value
  );
}

export function verifyCreemSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string;
  signature: string;
  secret: string;
}) {
  if (
    !secret ||
    !validHexDigest(
      signature
    )
  ) {
    return false;
  }

  const expected =
    createHmac(
      "sha256",
      secret
    )
      .update(
        rawBody
      )
      .digest(
        "hex"
      );

  const receivedBuffer =
    Buffer.from(
      signature,
      "hex"
    );

  const expectedBuffer =
    Buffer.from(
      expected,
      "hex"
    );

  return (
    receivedBuffer.length ===
      expectedBuffer.length &&
    timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    )
  );
}

export function hashCreemWebhook(
  rawBody: string
) {
  return createHash(
    "sha256"
  )
    .update(
      rawBody
    )
    .digest(
      "hex"
    );
}
