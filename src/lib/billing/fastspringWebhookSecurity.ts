import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export function verifyFastSpringSignature({
  rawBody,
  signature,
  secret,
}: {
  rawBody: string;
  signature: string;
  secret: string;
}) {
  let provided:
    Buffer;

  try {
    provided =
      Buffer.from(
        signature,
        "base64"
      );
  } catch {
    return false;
  }

  const expected =
    createHmac(
      "sha256",
      secret
    )
      .update(
        rawBody,
        "utf8"
      )
      .digest();

  if (
    provided.length !==
    expected.length
  ) {
    return false;
  }

  return timingSafeEqual(
    provided,
    expected
  );
}

export function hashFastSpringEvent(
  event:
    unknown
) {
  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify(
        event
      )
    )
    .digest(
      "hex"
    );
}
