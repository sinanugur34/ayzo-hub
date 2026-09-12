import {
  getDeterministicEvmEntityLabel,
} from "@/lib/intelligence/evm/entityLabels";

type JsonRecord =
  Record<string, unknown>;

export type AyzoEntityLabelConfidence =
  | "high"
  | "medium"
  | "low";

export type AyzoEntityLabelSource =
  | "deterministic"
  | "onchain"
  | "provider"
  | "manual";

export type AyzoEntityLabel = {
  id: string;
  address: string;
  label: string;
  category: string;
  confidence:
    AyzoEntityLabelConfidence;
  source:
    AyzoEntityLabelSource;
  evidence: string;
  caveat: string | null;
};

export type AyzoEntityLabelsResult = {
  version: 1;
  network: string;
  subjectType: string;
  subjectValue: string;

  status:
    | "ready"
    | "no-evidence"
    | "unsupported";

  labels:
    readonly AyzoEntityLabel[];

  limitation: string;
};

type BuildInput = {
  network: string;
  subjectType: string;
  subjectValue: string;
  evidencePayload: unknown;
};

function record(
  value: unknown
): JsonRecord | null {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonRecord
    : null;
}

function text(
  value: unknown
): string | null {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  const clean =
    value.trim();

  return clean
    ? clean
    : null;
}

function list(
  value: unknown
): readonly unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function bool(
  value: unknown
): boolean {
  return value === true;
}

function normalizeConfidence(
  value: unknown
): AyzoEntityLabelConfidence {
  if (
    value === "high" ||
    value === "medium" ||
    value === "low"
  ) {
    return value;
  }

  return "medium";
}

function normalizeSource(
  value: unknown
): AyzoEntityLabelSource {
  if (
    value === "deterministic" ||
    value === "onchain" ||
    value === "provider" ||
    value === "manual"
  ) {
    return value;
  }

  return "onchain";
}

function createCollector() {
  const labels:
    AyzoEntityLabel[] = [];

  const seen =
    new Set<string>();

  function add(
    label: AyzoEntityLabel
  ) {
    const address =
      label.address.trim();

    const title =
      label.label.trim();

    if (
      !address ||
      !title
    ) {
      return;
    }

    const key =
      `${address.toLowerCase()}|${title.toLowerCase()}`;

    if (
      seen.has(key)
    ) {
      return;
    }

    seen.add(key);

    labels.push({
      ...label,
      address,
      label: title,
    });
  }

  return {
    labels,
    add,
  };
}

function solanaLabels(
  root: JsonRecord
): AyzoEntityLabel[] {
  const collector =
    createCollector();

  const verification =
    record(
      root.tokenVerification
    );

  const mint =
    record(
      verification?.mint
    );

  const mintAuthority =
    text(
      verification
        ?.mintAuthority
    ) ??
    text(
      mint?.mintAuthority
    );

  const freezeAuthority =
    text(
      verification
        ?.freezeAuthority
    ) ??
    text(
      mint?.freezeAuthority
    );

  if (mintAuthority) {
    collector.add({
      id:
        `solana-mint-authority:${mintAuthority}`,

      address:
        mintAuthority,

      label:
        "Mint authority",

      category:
        "authority",

      confidence:
        "high",

      source:
        "onchain",

      evidence:
        "The current token mint account identifies this address as the mint authority.",

      caveat:
        "Authority status is an on-chain role and does not establish legal identity or beneficial ownership.",
    });
  }

  if (freezeAuthority) {
    collector.add({
      id:
        `solana-freeze-authority:${freezeAuthority}`,

      address:
        freezeAuthority,

      label:
        "Freeze authority",

      category:
        "authority",

      confidence:
        "high",

      source:
        "onchain",

      evidence:
        "The current token mint account identifies this address as the freeze authority.",

      caveat:
        "Authority status is an on-chain role and does not establish legal identity or beneficial ownership.",
    });
  }

  const funding =
    record(
      root.funding
    );

  const perWallet =
    list(
      funding?.perWallet
    );

  const sourceMap =
    new Map<
      string,
      {
        wallets:
          Set<string>;
        transferCount:
          number;
      }
    >();

  for (
    const rawWallet of
    perWallet
  ) {
    const wallet =
      record(rawWallet);

    if (!wallet) {
      continue;
    }

    const walletAddress =
      text(
        wallet.wallet
      ) ??
      "unknown";

    const transfers =
      list(
        wallet
          .recentIncomingTransfers
      );

    for (
      const rawTransfer of
      transfers
    ) {
      const transfer =
        record(
          rawTransfer
        );

      const source =
        text(
          transfer?.source
        );

      if (!source) {
        continue;
      }

      const current =
        sourceMap.get(
          source
        ) ?? {
          wallets:
            new Set<string>(),
          transferCount:
            0,
        };

      current.wallets.add(
        walletAddress
      );

      current.transferCount +=
        1;

      sourceMap.set(
        source,
        current
      );
    }
  }

  const sharedSources =
    [...sourceMap.entries()]
      .filter(
        ([, value]) =>
          value.wallets
            .size >= 2
      )
      .sort(
        (a, b) =>
          b[1].wallets.size -
            a[1].wallets.size ||
          b[1].transferCount -
            a[1].transferCount
      )
      .slice(0, 5);

  for (
    const [
      source,
      signal,
    ] of sharedSources
  ) {
    collector.add({
      id:
        `solana-shared-funding:${source}`,

      address:
        source,

      label:
        "Shared recent funding source",

      category:
        "funding",

      confidence:
        signal.wallets.size >= 3
          ? "high"
          : "medium",

      source:
        "onchain",

      evidence:
        `Observed as a recent direct SOL funding source for ${signal.wallets.size} analyzed wallets across ${signal.transferCount} transfer(s).`,

      caveat:
        "A shared funding source does not prove common ownership, coordination or ultimate source of funds.",
    });
  }

  return collector.labels;
}

function moduleData(
  modules:
    JsonRecord | null,
  key: string
): JsonRecord | null {
  const moduleEntry =
    record(
      modules?.[key]
    );

  return record(
    moduleEntry?.data
  );
}

function evmLabels(
  root: JsonRecord,
  subjectValue: string
): AyzoEntityLabel[] {
  const collector =
    createCollector();

  const deterministic =
    getDeterministicEvmEntityLabel(
      subjectValue
    );

  if (deterministic) {
    collector.add({
      id:
        `evm-deterministic:${deterministic.address}`,

      address:
        deterministic.address,

      label:
        deterministic.label ??
        deterministic.category,

      category:
        deterministic.category,

      confidence:
        deterministic.confidence,

      source:
        deterministic.source,

      evidence:
        "AYZO deterministically classified this address from its canonical on-chain address value.",

      caveat:
        null,
    });
  }

  const modules =
    record(
      root.modules
    );

  const deployment =
    moduleData(
      modules,
      "deploymentIntelligence"
    );

  const deploymentEvidence =
    record(
      deployment
        ?.deployment
    );

  const deployer =
    text(
      deploymentEvidence
        ?.deployerAddress
    );

  if (deployer) {
    collector.add({
      id:
        `evm-contract-deployer:${deployer}`,

      address:
        deployer,

      label:
        "Contract deployer",

      category:
        "deployer",

      confidence:
        "high",

      source:
        "onchain",

      evidence:
        "AYZO verified this address as the top-level contract deployer from transaction receipt evidence.",

      caveat:
        "A deployer role does not establish current ownership, control, intent or affiliation.",
    });
  }

  const holderData =
    moduleData(
      modules,
      "holderIntelligence"
    );

  const exclusions =
    list(
      holderData
        ?.exclusions
    );

  for (
    const rawExclusion of
    exclusions
  ) {
    const exclusion =
      record(
        rawExclusion
      );

    const address =
      text(
        exclusion?.address
      );

    const category =
      text(
        exclusion?.category
      );

    if (
      !address ||
      !category
    ) {
      continue;
    }

    collector.add({
      id:
        `evm-holder-label:${address}:${category}`,

      address,

      label:
        text(
          exclusion?.label
        ) ??
        (
          category ===
          "burn"
            ? "Burn address"
            : category
        ),

      category,

      confidence:
        normalizeConfidence(
          exclusion
            ?.confidence
        ),

      source:
        normalizeSource(
          exclusion?.source
        ),

      evidence:
        "AYZO attached this entity attribution while calculating evidence-backed holder intelligence.",

      caveat:
        "Raw on-chain concentration remains unchanged; entity attribution only affects adjusted interpretation where policy permits.",
    });
  }

  const funding =
    moduleData(
      modules,
      "fundingProvenance"
    );

  const sources =
    list(
      funding?.sources
    )
      .slice(0, 8);

  for (
    const rawSource of
    sources
  ) {
    const fundingSource =
      record(
        rawSource
      );

    const address =
      text(
        fundingSource
          ?.sourceAddress
      );

    if (!address) {
      continue;
    }

    const attribution =
      record(
        fundingSource
          ?.attribution
      );

    const attributedLabel =
      record(
        attribution?.label
      );

    if (attributedLabel) {
      const category =
        text(
          attributedLabel
            .category
        ) ??
        "entity";

      collector.add({
        id:
          `evm-attribution:${address}:${category}`,

        address,

        label:
          text(
            attributedLabel
              .label
          ) ??
          category,

        category,

        confidence:
          normalizeConfidence(
            attributedLabel
              .confidence
          ),

        source:
          normalizeSource(
            attributedLabel
              .source
          ),

        evidence:
          "AYZO resolved this attribution from the evidence attached to the observed funding source.",

        caveat:
          "Funding-source attribution does not establish ownership, intent or ultimate origin of funds.",
      });

      continue;
    }

    if (
      bool(
        fundingSource
          ?.repeatedFundingSource
      )
    ) {
      collector.add({
        id:
          `evm-repeated-funding:${address}`,

        address,

        label:
          "Repeated funding source",

        category:
          "funding",

        confidence:
          "medium",

        source:
          "onchain",

        evidence:
          "This address appears repeatedly in the bounded funding evidence analyzed by AYZO.",

        caveat:
          "Observed funding does not establish identity, ownership or ultimate origin.",
      });
    }
  }

  return collector.labels;
}

function confidenceRank(
  confidence:
    AyzoEntityLabelConfidence
) {
  switch (confidence) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

export function buildAyzoEntityLabels({
  network,
  subjectType,
  subjectValue,
  evidencePayload,
}: BuildInput):
  AyzoEntityLabelsResult {
  const root =
    record(
      evidencePayload
    );

  const normalizedNetwork =
    network
      .trim()
      .toLowerCase();

  const limitation =
    "AYZO Entity Labels describe evidence-backed on-chain roles or deterministic address classes. They do not establish legal identity, beneficial ownership, intent, control or affiliation.";

  if (!root) {
    return {
      version: 1,
      network,
      subjectType,
      subjectValue,
      status:
        "no-evidence",
      labels: [],
      limitation,
    };
  }

  let labels:
    AyzoEntityLabel[];

  if (
    normalizedNetwork
      .includes(
        "solana"
      )
  ) {
    labels =
      solanaLabels(
        root
      );
  } else if (
    /^0x[0-9a-fA-F]{40}$/.test(
      subjectValue.trim()
    )
  ) {
    labels =
      evmLabels(
        root,
        subjectValue
      );
  } else {
    return {
      version: 1,
      network,
      subjectType,
      subjectValue,
      status:
        "unsupported",
      labels: [],
      limitation:
        `${limitation} V1 currently resolves Solana and EVM entity evidence.`,
    };
  }

  labels =
    [...labels]
      .sort(
        (a, b) =>
          confidenceRank(
            b.confidence
          ) -
          confidenceRank(
            a.confidence
          )
      )
      .slice(0, 12);

  return {
    version: 1,
    network,
    subjectType,
    subjectValue,

    status:
      labels.length > 0
        ? "ready"
        : "no-evidence",

    labels,
    limitation,
  };
}
