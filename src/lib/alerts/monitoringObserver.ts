import "server-only";

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


export async function observeMonitoringTarget({
  target,
}: {
  target:
    AlertEvaluationTarget;
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

  if (
    resolution.engine ===
    "solana"
  ) {
    return {
      status:
        "unsupported",

      providerCalled:
        false,

      reason:
        "solana_activity_adapter_not_live",
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
       * Direct engine invocation.
       *
       * /api/intelligence is NOT used,
       * therefore normal user analysis
       * quota is not consumed here.
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
