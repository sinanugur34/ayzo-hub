import {
  getNetwork,
} from "@/lib/networks/registry";

export type AskAyzoAdapterId =
  | "solana"
  | "evm"
  | "utxo"
  | "sui"
  | "ton"
  | "stellar"
  | "cardano"
  | "aptos"
  | "near"
  | "hedera"
  | "zcash"
  | "algorand"
  | "polkadot"
  | "cosmos"
  | "injective"
  | "hyperliquid"
  | "tron"
  | "xrpl"
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

  sui: [
    "summary",
    "coverage",
    "relationships",
    "funding",
    "transaction-history",
  ],

  ton: [
    "summary",
    "coverage",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "transaction-cost",
  ],

  hyperliquid: [
    "summary",
    "coverage",
    "transaction-history",
    "transaction-value",
    "transaction-cost",
  ],

  stellar: [
    "summary",
    "coverage",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "transaction-cost",
  ],

  cardano: [
    "summary",
    "coverage",
    "relationships",
    "funding",
    "transaction-history",
    "canonical-transaction",
    "transaction-value",
    "transaction-cost",
  ],

  aptos: [
    "summary",
    "coverage",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "execution",
    "resource-usage",
  ],

  near: [
    "summary",
    "coverage",
    "authorities",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "execution",
  ],

  hedera: [
    "summary",
    "coverage",
    "authorities",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "resource-usage",
  ],

  zcash: [
    "summary",
    "coverage",
    "relationships",
    "funding",
    "transaction-history",
    "canonical-transaction",
    "transaction-value",
    "transaction-cost",
  ],

  algorand: [
    "summary",
    "coverage",
    "authorities",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "execution",
    "resource-usage",
  ],

  polkadot: [
    "summary",
    "coverage",
    "authorities",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "execution",
  ],

  cosmos: [
    "summary",
    "coverage",
    "authorities",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "execution",
  ],

  injective: [
    "summary",
    "coverage",
    "authorities",
    "relationships",
    "funding",
    "transaction-history",
    "transaction-value",
    "execution",
    "contract-type",
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

  xrpl: [
    "summary",
    "coverage",
    "transaction-history",
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

  sui: [
    "What are the most important Sui findings?",
    "What coin balances were observed?",
    "What funding and relationship evidence was observed?",
  ],

  ton: [
    "What are the most important TON findings?",
    "What direct funding and relationship evidence was observed?",
    "What Jetton holdings and transfers were observed?",
  ],

  hyperliquid: [
    "What are the most important Hyperliquid findings?",
    "What positions, spot balances and fills were observed on HyperCore?",
    "How do HyperCore and HyperEVM evidence differ?",
    "What perpetual funding payments were observed, without treating them as wallet funding provenance?",
  ],

  stellar: [
    "What are the most important Stellar findings?",
    "What trustlines and issuers were observed?",
    "What direct payment and funding relationships were observed?",
  ],

  cardano: [
    "What are the most important Cardano findings?",
    "What native assets and staking evidence were observed?",
    "What explicit counterparties and funding evidence were observed?",
  ],

  aptos: [
    "What are the most important Aptos findings?",
    "What Move resources, Fungible Assets and objects were observed?",
    "What explicit transfer counterparties and funding evidence were observed?",
  ],

  near: [
    "What are the most important NEAR findings?",
    "What actions, receipts and contract methods were observed?",
    "What access-key permissions were observed?",
    "What explicit counterparties and inbound funding evidence were observed?",
  ],

  hedera: [
    "What are the most important Hedera findings?",
    "What HBAR transfer counterparties were observed?",
    "What token relationships and explicit token control keys were observed?",
    "What staking and reward evidence was observed?",
  ],

  zcash: [
    "What are the most important Zcash transparent findings?",
    "What explicit transparent counterparties and funding evidence were observed?",
    "What canonical transparent transaction evidence was verified?",
    "What evidence remains unavailable because of privacy boundaries?",
  ],

  algorand: [
    "What are the most important Algorand findings?",
    "What ALGO and ASA transfer evidence was observed?",
    "What rekey, asset authority and application evidence was observed?",
    "What explicit counterparties and bounded funding evidence were observed?",
  ],

  polkadot: [
    "What are the most important Polkadot findings?",
    "What DOT transfer and extrinsic evidence was observed?",
    "What staking, proxy and multisig evidence was observed?",
    "What explicit counterparties and bounded funding evidence were observed?",
  ],

  cosmos: [
    "What are the most important Cosmos Hub findings?",
    "What ATOM balances, delegations and rewards were observed?",
    "What bank and IBC transfer evidence was observed?",
    "What explicit counterparties and bounded funding evidence were observed?",
  ],

  injective: [
    "What are the most important Injective findings?",
    "What INJ balances and staking evidence were observed?",
    "What exchange, CosmWasm or token-factory module activity was observed?",
    "What bank, IBC, counterparty and bounded funding evidence was observed?",
  ],

  tron: [
    "What was the transaction fee?",
    "How much energy was used?",
    "What contract type was observed?",
  ],

  xrpl: [
    "What are the most important findings?",
    "How many transactions were observed?",
    "What coverage is available?",
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
    case "litecoin":
      return "utxo";

    case "sui":
      return "sui";

    case "ton":
      return "ton";

    case "hyperliquid":
      return "hyperliquid";

    case "stellar":
      return "stellar";

    case "cardano":
      return "cardano";

    case "aptos":
      return "aptos";

    case "near":
      return "near";

    case "hedera":
      return "hedera";

    case "zcash":
      return "zcash";

    case "algorand":
      return "algorand";

    case "polkadot":
      return "polkadot";

    case "cosmos":
      return "cosmos";

    case "injective":
      return "injective";

    case "tron":
      return "tron";

    case "xrpl":
      return "xrpl";

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
