export type EvmWalletGraphPresentationCoverage = {
  maxHops: number;
  maxNodes: number;
  maxEdges: number;
};

export type EvmWalletGraphPresentation = {
  advancedDepth: boolean;

  nodePreviewLimit: number;

  visualMaxNodes: number;
  visualMaxEdges: number;

  capabilityLabel: string;
};

const STANDARD_PRESENTATION:
  EvmWalletGraphPresentation = {
    advancedDepth: false,

    nodePreviewLimit: 6,

    visualMaxNodes: 8,
    visualMaxEdges: 12,

    capabilityLabel:
      "BOUNDED GRAPH",
  };

const ADVANCED_PRESENTATION:
  EvmWalletGraphPresentation = {
    advancedDepth: true,

    /*
     * The investigation engine can collect a larger graph,
     * while the visual evidence map intentionally remains
     * curated for readability.
     */
    nodePreviewLimit: 12,

    visualMaxNodes: 12,
    visualMaxEdges: 20,

    capabilityLabel:
      "ADVANCED MULTI-HOP",
  };

export function getEvmWalletGraphPresentation(
  coverage:
    EvmWalletGraphPresentationCoverage
): EvmWalletGraphPresentation {
  /*
   * UI capability follows the graph coverage returned by
   * the server. It does not guess entitlement client-side.
   *
   * Free and Pro currently use two-hop coverage.
   * Advanced exposes deeper bounded graph traversal.
   */
  return coverage.maxHops > 2
    ? ADVANCED_PRESENTATION
    : STANDARD_PRESENTATION;
}
