import "server-only";

import type {
  BasicAlertRuleType,
} from "@/lib/account/alertRules";

import {
  buildHistoricalSnapshot,
} from "@/lib/account/historicalSnapshot";

import {
  buildSmartAlertObservation,
} from "@/lib/alerts/smartEvidence";

import {
  isBitcoinMainnetAddress,
} from "@/lib/intelligence/bitcoin/address";

import {
  runBitcoinIntelligence,
} from "@/lib/intelligence/bitcoin/engine";

import {
  runEvmUnifiedIntelligence,
} from "@/lib/intelligence/evm/unifiedOrchestrator";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  extractBitcoinActivityEvidence,
  extractEvmActivityEvidence,
} from "@/lib/alerts/observation";

import type {
  AlertObservation,
} from "@/lib/alerts/detection";

import type {
  AlertEvaluationTarget,
} from "@/lib/alerts/evaluator";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

export type MonitoringObservationResult =
  | {
      status:
        "observed";

      providerCalled:
        true;

      observation:
        AlertObservation;
    }
  | {
      status:
        "unsupported" |
        "invalid";

      providerCalled:
        false;

      reason:
        string;
    }
  | {
      status:
        "unavailable";

      providerCalled:
        true;

      reason:
        string;
    };

function snapshotObservation({
  network,
  value,
  ruleType,
}: {
  network:
    string;

  value:
    unknown;

  ruleType:
    Exclude<
      BasicAlertRuleType,
      "new_activity"
    >;
}) {
  const snapshot =
    buildHistoricalSnapshot(
      network,
      value
    );

  if (!snapshot) {
    return null;
  }

  return buildSmartAlertObservation({
    snapshot,
    ruleType,
  });
}

export async function observeMonitoringTarget({
  target,
  ruleType,
}: {
  target:
    AlertEvaluationTarget;

  ruleType:
    BasicAlertRuleType;
}): Promise<
  MonitoringObservationResult
> {
  const resolution =
    resolveIntelligenceNetwork(
      target.network
    );

  if (!resolution.ok) {
    return {
      status:
        "unsupported",

      providerCalled:
        false,

      reason:
        "network_not_available",
    };
  }

  /*
   * Smart Alerts 2.0 live monitoring
   * is intentionally bounded to the
   * adapters with established scheduled
   * monitoring support.
   */
  if (
    resolution.engine !==
      "bitcoin" &&
    resolution.engine !==
      "evm"
  ) {
    return {
      status:
        "unsupported",

      providerCalled:
        false,

      reason:
        "monitoring_adapter_not_live",
    };
  }

  if (
    resolution.engine ===
      "evm"
  ) {
    if (
      target.subjectType !==
        "wallet" &&
      target.subjectType !==
        "token"
    ) {
      return {
        status:
          "unsupported",

        providerCalled:
          false,

        reason:
          "subject_type_not_supported",
      };
    }

    if (
      !EVM_ADDRESS.test(
        target.subjectValue
      )
    ) {
      return {
        status:
          "invalid",

        providerCalled:
          false,

        reason:
          "invalid_evm_address",
      };
    }

    try {
      /*
       * Direct engine invocation:
       * user analysis quota is not consumed.
       */
      const result =
        await runEvmUnifiedIntelligence({
          networkId:
            resolution.networkId,

          address:
            target.subjectValue,
        });

      if (
        result.status !==
          200
      ) {
        return {
          status:
            "unavailable",

          providerCalled:
            true,

          reason:
            "evm_intelligence_unavailable",
        };
      }

      if (
        ruleType ===
          "new_activity"
      ) {
        const extraction =
          extractEvmActivityEvidence({
            data:
              result.data,

            network:
              resolution.networkId,
          });

        if (
          !extraction.available
        ) {
          return {
            status:
              "unavailable",

            providerCalled:
              true,

            reason:
              "evm_activity_evidence_unavailable",
          };
        }

        return {
          status:
            "observed",

          providerCalled:
            true,

          observation: {
            observedAt:
              new Date()
                .toISOString(),

            evidence:
              extraction.evidence,
          },
        };
      }

      const observation =
        snapshotObservation({
          network:
            resolution.networkId,

          value:
            result.data,

          ruleType,
        });

      if (!observation) {
        return {
          status:
            "unavailable",

          providerCalled:
            true,

          reason:
            "evm_snapshot_unavailable",
        };
      }

      return {
        status:
          "observed",

        providerCalled:
          true,

        observation,
      };
    } catch {
      return {
        status:
          "unavailable",

        providerCalled:
          true,

        reason:
          "evm_intelligence_failed",
      };
    }
  }

  if (
    target.subjectType !==
      "wallet"
  ) {
    return {
      status:
        "unsupported",

      providerCalled:
        false,

      reason:
        "subject_type_not_supported",
    };
  }

  if (
    ruleType ===
      "contract_activity"
  ) {
    return {
      status:
        "unsupported",

      providerCalled:
        false,

      reason:
        "rule_type_not_supported",
    };
  }

  if (
    !isBitcoinMainnetAddress(
      target.subjectValue
    )
  ) {
    return {
      status:
        "invalid",

      providerCalled:
        false,

      reason:
        "invalid_bitcoin_address",
    };
  }

  try {
    const result =
      await runBitcoinIntelligence({
        address:
          target.subjectValue,
      });

    if (
      result.status !==
        200
    ) {
      return {
        status:
          "unavailable",

        providerCalled:
          true,

        reason:
          "bitcoin_intelligence_unavailable",
      };
    }

    if (
      ruleType ===
        "new_activity"
    ) {
      const extraction =
        extractBitcoinActivityEvidence({
          data:
            result.data,
        });

      if (
        !extraction.available
      ) {
        return {
          status:
            "unavailable",

          providerCalled:
            true,

          reason:
            "bitcoin_activity_evidence_unavailable",
        };
      }

      return {
        status:
          "observed",

        providerCalled:
          true,

        observation: {
          observedAt:
            new Date()
              .toISOString(),

          evidence:
            extraction.evidence,
        },
      };
    }

    const observation =
      snapshotObservation({
        network:
          resolution.networkId,

        value:
          result.data,

        ruleType,
      });

    if (!observation) {
      return {
        status:
          "unavailable",

        providerCalled:
          true,

        reason:
          "bitcoin_snapshot_unavailable",
      };
    }

    return {
      status:
        "observed",

      providerCalled:
        true,

      observation,
    };
  } catch {
    return {
      status:
        "unavailable",

      providerCalled:
        true,

      reason:
        "bitcoin_intelligence_failed",
    };
  }
}
