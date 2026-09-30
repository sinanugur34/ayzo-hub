export type HederaMirrorProviderConfig = {
  id:
    | "hedera-mirror-public"
    | "hedera-hgraph";

  baseUrl:
    string;

  apiKey:
    string | null;

  independent:
    boolean;
};

const PUBLIC_MIRROR =
  "https://mainnet-public.mirrornode.hedera.com/api/v1";

const HGRAPH_MIRROR =
  "https://hedera.hgraph.com/api/v1";

function normalized(
  value:
    string | undefined
) {
  const result =
    value?.trim();

  return result
    ? result
    : null;
}

export function getHederaPrimaryProvider():
  HederaMirrorProviderConfig {
  return {
    id:
      "hedera-mirror-public",

    baseUrl:
      normalized(
        process.env
          .HEDERA_MIRROR_URL
      ) ??
      PUBLIC_MIRROR,

    apiKey:
      null,

    independent:
      false,
  };
}

export function getHederaFallbackProvider():
  HederaMirrorProviderConfig | null {
  const apiKey =
    normalized(
      process.env
        .HGRAPH_API_KEY
    );

  if (!apiKey) {
    return null;
  }

  return {
    id:
      "hedera-hgraph",

    baseUrl:
      normalized(
        process.env
          .HEDERA_MIRROR_FALLBACK_URL
      ) ??
      HGRAPH_MIRROR,

    apiKey,

    independent:
      true,
  };
}

export function hasHederaIndependentProductionProvider() {
  return (
    getHederaFallbackProvider() !==
    null
  );
}
