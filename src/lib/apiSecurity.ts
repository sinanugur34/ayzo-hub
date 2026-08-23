export function isInternalApiRequest(request: Request) {
  const expected = process.env.AYZO_INTERNAL_API_KEY;

  if (!expected) {
    return false;
  }

  const provided = request.headers.get("x-ayzo-internal-key");

  return (
    typeof provided === "string" &&
    provided.length > 0 &&
    provided === expected
  );
}

export function getInternalApiKey() {
  const key = process.env.AYZO_INTERNAL_API_KEY;

  if (!key) {
    throw new Error("AYZO_INTERNAL_API_KEY is not configured.");
  }

  return key;
}
