export const CHAINLINK_INTELLIGENCE_CONTRACT = {
  id:
    "chainlink",

  name:
    "Chainlink / LINK",

  kind:
    "protocol-intelligence",

  status:
    "development",

  countsAsNetwork:
    false,

  initialSurfaces: [
    "link-token",
    "ccip",
    "data-feeds",
  ],

  evidenceRules: [
    "LINK token evidence remains scoped to its underlying blockchain.",
    "CCIP evidence preserves explicit source and destination network identities.",
    "Data Feed evidence reports explicit on-chain contracts and observations only.",
    "Chainlink intelligence does not create a synthetic blockchain network.",
    "Observed protocol interaction is not evidence of ownership or common control.",
  ],
} as const;

export type ChainlinkIntelligenceSurface =
  (
    typeof CHAINLINK_INTELLIGENCE_CONTRACT
  )["initialSurfaces"][number];
