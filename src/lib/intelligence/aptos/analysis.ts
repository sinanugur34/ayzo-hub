import {
  normalizeAptosAddress,
} from "./address";

import type {
  AptosEvidence,
} from "./types";

export type AptosDerivedAnalysis = {
  activity: {
    observedTransactionCount:
      number;

    successfulTransactionCount:
      number;

    failedTransactionCount:
      number;
  };

  move: {
    resourceCount:
      number;

    observedModuleCount:
      number;

    observedFunctionCount:
      number;
  };

  counterparties: {
    count:
      number;

    items:
      readonly {
        address:
          string;

        observationCount:
          number;

        transactionHashes:
          readonly string[];
      }[];
  };

  assets: {
    fungibleAssetCount:
      number;
  };

  observedFunding:
    null;
};

export function buildAptosDerivedAnalysis({
  address,
  evidence,
}: {
  address:
    string;

  evidence:
    AptosEvidence;
}): AptosDerivedAnalysis {
  const root =
    normalizeAptosAddress(
      address
    );

  const counterparties =
    new Map<
      string,
      {
        address:
          string;

        hashes:
          Set<string>;
      }
    >();

  const modules =
    new Set<string>();

  const functions =
    new Set<string>();

  let successful =
    0;

  let failed =
    0;

  for (
    const tx of
    evidence.transactions
  ) {
    if (
      tx.success ===
        true
    ) {
      successful +=
        1;
    } else if (
      tx.success ===
        false
    ) {
      failed +=
        1;
    }

    if (
      tx.moduleAddress &&
      tx.moduleName
    ) {
      modules.add(
        `${tx.moduleAddress}::${tx.moduleName}`
      );
    }

    if (
      tx.moduleAddress &&
      tx.moduleName &&
      tx.functionName
    ) {
      functions.add(
        `${tx.moduleAddress}::${tx.moduleName}::${tx.functionName}`
      );
    }

    if (
      tx.sender
    ) {
      const normalized =
        normalizeAptosAddress(
          tx.sender
        );

      if (
        normalized &&
        normalized !== root
      ) {
        const item =
          counterparties.get(
            normalized
          ) ?? {
            address:
              normalized,

            hashes:
              new Set<string>(),
          };

        item.hashes.add(
          tx.transactionHash
        );

        counterparties.set(
          normalized,
          item
        );
      }
    }
  }

  return {
    activity: {
      observedTransactionCount:
        evidence
          .transactions
          .length,

      successfulTransactionCount:
        successful,

      failedTransactionCount:
        failed,
    },

    move: {
      resourceCount:
        evidence
          .resources
          .length,

      observedModuleCount:
        modules.size,

      observedFunctionCount:
        functions.size,
    },

    counterparties: {
      count:
        counterparties.size,

      items:
        [...counterparties.values()]
          .map(item => ({
            address:
              item.address,

            observationCount:
              item.hashes.size,

            transactionHashes:
              [...item.hashes],
          })),
    },

    assets: {
      fungibleAssetCount:
        evidence
          .fungibleAssets
          .length,
    },

    observedFunding:
      null,
  };
}
