import {
  isLiveAnalysisNetworkId,
  type LiveAnalysisNetworkId,
} from "./networks/addressSelection";

export type SeoAnalysisPrefill = {
  network:
    LiveAnalysisNetworkId;

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

  if (
    !network ||
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
