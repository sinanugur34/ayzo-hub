import {
  createHash,
} from "node:crypto";

export function googlePlayObfuscatedAccountId(
  userId: string
) {
  const hash =
    createHash(
      "sha256"
    );

  hash.update(
    "ayzo:google-play:account:v1\0"
  );

  hash.update(
    userId
  );

  return hash
    .digest(
      "base64url"
    );
}
