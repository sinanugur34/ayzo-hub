import {
  basicAlertRuleTypes,
  type BasicAlertRuleType,
} from "@/lib/account/alertRules";

import {
  NETWORK_IDS,
  getNetwork,
} from "@/lib/networks/registry";

export type SmartAlertRuntimeStatus =
  | "live"
  | "definition_only"
  | "unsupported";

export type SmartAlertNetworkOption = {
  id:
    string;

  name:
    string;

  family:
    "bitcoin" |
    "evm";
};

const EVM_RULE_TYPES:
  readonly BasicAlertRuleType[] = [
    "new_activity",
    "funding_movement",
    "relationship_change",
    "contract_activity",
  ];

const BITCOIN_RULE_TYPES:
  readonly BasicAlertRuleType[] = [
    "new_activity",
    "funding_movement",
    "relationship_change",
  ];

export const SMART_ALERT_NETWORK_OPTIONS:
  readonly SmartAlertNetworkOption[] =
    NETWORK_IDS.flatMap(
      id => {
        const network =
          getNetwork(
            id
          );

        if (
          !network ||
          network.status !==
            "live" ||
          (
            network.family !==
              "bitcoin" &&
            network.family !==
              "evm"
          )
        ) {
          return [];
        }

        return [
          {
            id:
              network.id,

            name:
              network.name,

            family:
              network.family,
          },
        ];
      }
    );

export function getLiveSmartAlertRuleTypes(
  networkId:
    string | null,
  subjectType:
    string | null
):
  readonly BasicAlertRuleType[] {
  if (
    !networkId ||
    !subjectType
  ) {
    return [];
  }

  const network =
    getNetwork(
      networkId
        .trim()
        .toLowerCase()
    );

  if (
    !network ||
    network.status !==
      "live"
  ) {
    return [];
  }

  if (
    network.family ===
      "evm" &&
    (
      subjectType ===
        "wallet" ||
      subjectType ===
        "token"
    )
  ) {
    return EVM_RULE_TYPES;
  }

  if (
    network.family ===
      "bitcoin" &&
    subjectType ===
      "wallet"
  ) {
    return BITCOIN_RULE_TYPES;
  }

  return [];
}

export function classifySmartAlertRuntime({
  watchlistId,
  network,
  subjectType,
  ruleType,
}: {
  watchlistId:
    string | null;

  network:
    string | null;

  subjectType:
    string | null;

  ruleType:
    string;
}): SmartAlertRuntimeStatus {
  /*
   * Legacy watchlist alert definitions
   * are preserved, but watchlist-wide
   * scheduled evaluation is not live yet.
   */
  if (watchlistId) {
    return "definition_only";
  }

  if (
    !basicAlertRuleTypes.includes(
      ruleType as
        BasicAlertRuleType
    )
  ) {
    return "unsupported";
  }

  const supported =
    getLiveSmartAlertRuleTypes(
      network,
      subjectType
    );

  return supported.includes(
    ruleType as
      BasicAlertRuleType
  )
    ? "live"
    : "unsupported";
}
