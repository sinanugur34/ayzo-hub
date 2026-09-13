import {
  getNetwork,
} from "@/lib/networks/registry";

export type AskAyzoAdapterId =
  | "solana"
  | "evm"
  | "utxo"
  | "tron"
  | "generic";

export type AskAyzoCapability =
  | "summary"
  | "coverage"
  | "authorities"
  | "holders"
  | "relationships"
  | "funding"
  | "deployment"
  | "developer-history"
  | "transaction-history"
  | "canonical-transaction"
  | "transaction-value"
  | "transaction-cost"
  | "execution"
  | "resource-usage"
  | "contract-type";

const CAPABILITIES:
  Record<
    AskAyzoAdapterId,
    readonly AskAyzoCapability[]
  > = {
  solana: [
    "summary",
    "coverage",
    "authorities",
    "holders",
    "relationships",
    "funding",
  ],

  evm: [
    "summary",
    "coverage",
    "holders",
    "relationships",
    "funding",
    "deployment",
    "developer-history",
  ],

  utxo: [
    "summary",
    "coverage",
    "transaction-history",
    "canonical-transaction",
    "transaction-value",
    "transaction-cost",
  ],

  tron: [
    "summary",
    "coverage",
    "transaction-history",
    "canonical-transaction",
    "transaction-value",
    "transaction-cost",
    "execution",
    "resource-usage",
    "contract-type",
  ],

  generic: [
    "summary",
    "coverage",
  ],
};

const QUESTIONS:
  Record<
    AskAyzoAdapterId,
    readonly string[]
  > = {
  solana: [
    "What are the most important findings?",
    "Is mint authority active?",
    "Is there shared funding evidence?",
  ],

  evm: [
    "What are the most important findings?",
    "Who deployed this contract?",
    "Is there repeated funding evidence?",
  ],

  utxo: [
    "How many transactions were observed?",
    "Is the canonical transaction confirmed?",
    "What are the most important findings?",
  ],

  tron: [
    "What was the transaction fee?",
    "How much energy was used?",
    "What contract type was observed?",
  ],

  generic: [
    "What are the most important findings?",
    "What coverage is available?",
    "What can Ask AYZO explain?",
  ],
};

function adapterForFamily(
  family: string
): AskAyzoAdapterId {
  switch (family) {
    case "solana":
      return "solana";

    case "evm":
      return "evm";

    case "bitcoin":
    case "dogecoin":
      return "utxo";

    case "tron":
      return "tron";

    default:
      return "generic";
  }
}

export function getAskAyzoNetworkProfile(
  networkId: string
) {
  const network =
    getNetwork(
      networkId
    );

  if (!network) {
    return {
      networkId,
      networkName:
        networkId,
      family:
        "unknown",
      adapter:
        "generic" as const,
      capabilities:
        CAPABILITIES.generic,
      suggestedQuestions:
        QUESTIONS.generic,
    };
  }

  const adapter =
    adapterForFamily(
      network.family
    );

  return {
    networkId:
      network.id,

    networkName:
      network.name,

    family:
      network.family,

    adapter,

    capabilities:
      CAPABILITIES[
        adapter
      ],

    suggestedQuestions:
      QUESTIONS[
        adapter
      ],
  };
}

export function getAskAyzoSuggestedQuestions(
  networkId: string
) {
  return (
    getAskAyzoNetworkProfile(
      networkId
    ).suggestedQuestions
  );
}
