export const MAX_PUBLIC_JSON_BODY_BYTES =
  16 * 1024;

type JsonBodyResult =
  | {
      ok: true;
      body: Record<string, unknown>;
    }
  | {
      ok: false;
      response: Response;
    };

function invalidJson(): JsonBodyResult {
  return {
    ok: false,
    response: Response.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    ),
  };
}

function payloadTooLarge(): JsonBodyResult {
  return {
    ok: false,
    response: Response.json(
      {
        ok: false,
        error: "Request body is too large.",
      },
      { status: 413 }
    ),
  };
}

export async function readJsonObjectBody(
  request: Request,
  maxBytes = MAX_PUBLIC_JSON_BODY_BYTES
): Promise<JsonBodyResult> {
  const contentLength =
    request.headers.get("content-length");

  if (contentLength) {
    const declaredBytes = Number(contentLength);

    if (
      Number.isFinite(declaredBytes) &&
      declaredBytes > maxBytes
    ) {
      return payloadTooLarge();
    }
  }

  const contentType =
    request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

  const isJsonContentType =
    contentType === "application/json" ||
    contentType?.endsWith("+json") === true;

  if (!isJsonContentType) {
    return {
      ok: false,
      response: Response.json(
        {
          ok: false,
          error: "Content-Type must be application/json.",
        },
        { status: 415 }
      ),
    };
  }

  if (!request.body) {
    return invalidJson();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } =
        await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > maxBytes) {
        await reader.cancel();
        return payloadTooLarge();
      }

      chunks.push(value);
    }
  } catch {
    return invalidJson();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(
      new TextDecoder().decode(bytes)
    );
  } catch {
    return invalidJson();
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return invalidJson();
  }

  return {
    ok: true,
    body: parsed as Record<string, unknown>,
  };
}
