export type Wave30BProviderReadiness = {
  near: {
    configured:
      boolean;

    reason:
      string;
  };

  hedera: {
    configured:
      boolean;

    reason:
      string;
  };
};

function hasValue(
  value:
    string | undefined
) {
  return Boolean(
    value?.trim()
  );
}

export function getWave30BProviderReadiness():
  Wave30BProviderReadiness {
  const nearConfigured =
    hasValue(
      process.env
        .NEARBLOCKS_API_KEY
    );

  const hederaConfigured =
    hasValue(
      process.env
        .HGRAPH_API_KEY
    );

  return {
    near: {
      configured:
        nearConfigured,

      reason:
        nearConfigured
          ? "Commercial indexed NEAR provider credential configured."
          : "NEARBLOCKS_API_KEY is required before commercial production promotion.",
    },

    hedera: {
      configured:
        hederaConfigured,

      reason:
        hederaConfigured
          ? "Independent Hedera mirror credential configured."
          : "HGRAPH_API_KEY is required before Hedera production promotion.",
    },
  };
}
