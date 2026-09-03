import type {
  IntelligenceCoverage,
  IntelligenceFinding,
  IntelligenceModuleStatus,
} from "../types";

import type {
  EvmNetworkContext,
} from "./types";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

export const EVM_UNIFIED_MODULE_IDS = [
  "assetVerification",
  "holderIntelligence",
  "walletRelationships",
  "fundingProvenance",
  "deploymentIntelligence",
  "developerHistory",
  "coordinatedWalletBehavior",
  "walletGraph",
] as const;

export type EvmUnifiedModuleId =
  (typeof EVM_UNIFIED_MODULE_IDS)[number];

export type EvmUnifiedAssetKind =
  | "wallet"
  | "contract"
  | "erc20_contract";

export type EvmUnifiedModuleResult<
  TData = unknown,
> = {
  status:
    IntelligenceModuleStatus;

  data:
    TData | null;

  error:
    string | null;

  limitation:
    string | null;
};

export type EvmUnifiedModules = {
  [K in EvmUnifiedModuleId]:
    EvmUnifiedModuleResult;
};

export type EvmUnifiedModuleSummary = {
  total: number;
  complete: number;
  limited: number;
  notRun: number;
  unavailable: number;
};

export type EvmUnifiedIntelligence = {
  ok: true;

  engine: "evm";

  network: {
    id:
      EvmNetworkContext["networkId"];

    name: string;

    family: "evm";

    chainId: number;

    nativeCurrency: string;
  };

  address: string;

  assetKind:
    EvmUnifiedAssetKind;

  coverage:
    IntelligenceCoverage;

  moduleSummary:
    EvmUnifiedModuleSummary;

  modules:
    EvmUnifiedModules;

  findings:
    readonly IntelligenceFinding[];

  caveats:
    readonly string[];
};

export type BuildEvmUnifiedIntelligenceRequest = {
  network:
    EvmNetworkContext;

  address: string;

  assetKind:
    EvmUnifiedAssetKind;

  modules:
    Partial<
      Record<
        EvmUnifiedModuleId,
        EvmUnifiedModuleResult
      >
    >;

  findings?:
    readonly IntelligenceFinding[];

  caveats?:
    readonly string[];
};

function normalizeAddress(
  value: string
): string | null {
  const normalized =
    value.trim().toLowerCase();

  return EVM_ADDRESS.test(
    normalized
  )
    ? normalized
    : null;
}

function notRunModule():
  EvmUnifiedModuleResult {
  return {
    status:
      "not-run",

    data:
      null,

    error:
      null,

    limitation:
      null,
  };
}

function normalizeModule(
  module:
    EvmUnifiedModuleResult | undefined
): EvmUnifiedModuleResult {
  if (!module) {
    return notRunModule();
  }

  if (
    module.status ===
      "not-run" ||
    module.status ===
      "unavailable"
  ) {
    return {
      status:
        module.status,

      data:
        null,

      error:
        module.error,

      limitation:
        module.limitation,
    };
  }

  return {
    status:
      module.status,

    data:
      module.data,

    error:
      module.error,

    limitation:
      module.limitation,
  };
}

function summarizeModules(
  modules:
    EvmUnifiedModules
): EvmUnifiedModuleSummary {
  const summary:
    EvmUnifiedModuleSummary = {
    total:
      EVM_UNIFIED_MODULE_IDS
        .length,

    complete: 0,
    limited: 0,
    notRun: 0,
    unavailable: 0,
  };

  for (
    const moduleId of
      EVM_UNIFIED_MODULE_IDS
  ) {
    const status =
      modules[
        moduleId
      ].status;

    switch (status) {
      case "complete":
        summary.complete += 1;
        break;

      case "limited":
        summary.limited += 1;
        break;

      case "not-run":
        summary.notRun += 1;
        break;

      case "unavailable":
        summary.unavailable += 1;
        break;
    }
  }

  return summary;
}

function determineCoverage(
  summary:
    EvmUnifiedModuleSummary
): IntelligenceCoverage {
  if (
    summary.complete ===
    summary.total
  ) {
    return "full";
  }

  if (
    summary.complete +
      summary.limited >
    0
  ) {
    return "partial";
  }

  return "limited";
}

function confidenceRank(
  confidence:
    IntelligenceFinding["confidence"]
): number {
  switch (confidence) {
    case "high":
      return 0;

    case "medium":
      return 1;

    case "low":
      return 2;
  }
}

function severityRank(
  severity:
    IntelligenceFinding["severity"]
): number {
  return severity ===
    "attention"
    ? 0
    : 1;
}

function normalizeFindings(
  findings:
    readonly IntelligenceFinding[]
): readonly IntelligenceFinding[] {
  const byId =
    new Map<
      string,
      IntelligenceFinding
    >();

  for (
    const finding of
      findings
  ) {
    const id =
      finding.id.trim();

    if (
      !id ||
      byId.has(id)
    ) {
      continue;
    }

    byId.set(
      id,
      {
        ...finding,
        id,
      }
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) =>
      severityRank(
        left.severity
      ) -
        severityRank(
          right.severity
        ) ||
      confidenceRank(
        left.confidence
      ) -
        confidenceRank(
          right.confidence
        ) ||
      left.id.localeCompare(
        right.id
      )
  );
}

function normalizeCaveats(
  modules:
    EvmUnifiedModules,
  caveats:
    readonly string[]
): readonly string[] {
  const values =
    new Set<string>();

  for (
    const caveat of
      caveats
  ) {
    const normalized =
      caveat.trim();

    if (normalized) {
      values.add(
        normalized
      );
    }
  }

  for (
    const moduleId of
      EVM_UNIFIED_MODULE_IDS
  ) {
    const limitation =
      modules[
        moduleId
      ].limitation
        ?.trim();

    if (limitation) {
      values.add(
        limitation
      );
    }
  }

  return [
    ...values,
  ].sort();
}

export function buildEvmUnifiedIntelligence(
  request:
    BuildEvmUnifiedIntelligenceRequest
): EvmUnifiedIntelligence {
  const address =
    normalizeAddress(
      request.address
    );

  if (!address) {
    throw new Error(
      "Invalid EVM intelligence address."
    );
  }

  if (
    !Number.isSafeInteger(
      request.network.chainId
    ) ||
    request.network.chainId <=
      0
  ) {
    throw new Error(
      "Invalid EVM network context."
    );
  }

  const modules =
    Object.fromEntries(
      EVM_UNIFIED_MODULE_IDS.map(
        moduleId => [
          moduleId,
          normalizeModule(
            request.modules[
              moduleId
            ]
          ),
        ]
      )
    ) as EvmUnifiedModules;

  const moduleSummary =
    summarizeModules(
      modules
    );

  return {
    ok: true,

    engine:
      "evm",

    network: {
      id:
        request.network
          .networkId,

      name:
        request.network.name,

      family:
        "evm",

      chainId:
        request.network
          .chainId,

      nativeCurrency:
        request.network
          .nativeCurrency,
    },

    address,

    assetKind:
      request.assetKind,

    coverage:
      determineCoverage(
        moduleSummary
      ),

    moduleSummary,

    modules,

    findings:
      normalizeFindings(
        request.findings ??
          []
      ),

    caveats:
      normalizeCaveats(
        modules,
        request.caveats ??
          []
      ),
  };
}
