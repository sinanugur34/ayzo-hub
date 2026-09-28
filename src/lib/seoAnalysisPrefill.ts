import {
  isLiveAnalysisNetworkId,
  type LiveAnalysisNetworkId,
} from "./networks/addressSelection";

import {
  isNetworkId,
} from "./networks/registry";

export type SeoAnalysisPrefill = {
  network:
    LiveAnalysisNetworkId |
    null;

  source:
    "seo";
};

export function parseSeoAnalysisPrefill(
  search: string
):
  SeoAnalysisPrefill |
  null {
  const normalized =
    search.startsWith("?")
      ? search.slice(1)
      : search;

  const params =
    new URLSearchParams(
      normalized
    );

  /*
   * Only explicit AYZO SEO handoffs
   * activate prefill behavior.
   *
   * Never accept an address, token,
   * wallet, transaction hash or other
   * analysis subject from the URL.
   */
  if (
    params.get(
      "source"
    ) !== "seo"
  ) {
    return null;
  }

  const network =
    params.get(
      "network"
    );

  if (!network) {
    return {
      network:
        null,

      source:
        "seo",
    };
  }

  if (
    !isNetworkId(
      network
    ) ||
    !isLiveAnalysisNetworkId(
      network
    )
  ) {
    return null;
  }

  return {
    network,
    source:
      "seo",
  };
}
