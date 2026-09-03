import type {
  EvmWalletGraphObservation,
} from "./walletGraph";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

const TX_HASH =
  /^0x[0-9a-fA-F]{64}$/;

export type EvmWalletGraphNeighbor = {
  address: string;

  evidenceObservationCount:
    number;

  evidenceTransactionCount:
    number;

  evidenceTransactionHashes:
    readonly string[];

  observedTokenAddresses:
    readonly string[];
};

type NeighborAccumulator = {
  address: string;

  observationKeys:
    Set<string>;

  transactionHashes:
    Set<string>;

  tokenAddresses:
    Set<string>;
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

function normalizeHash(
  value: string
): string | null {
  const normalized =
    value.trim().toLowerCase();

  return TX_HASH.test(
    normalized
  )
    ? normalized
    : null;
}

function evidenceKey(
  observation:
    EvmWalletGraphObservation,
  hash: string,
  from: string,
  to: string
): string {
  if (
    observation.kind ===
      "evm_transaction"
  ) {
    return [
      observation.kind,
      hash,
      from,
      to,
      observation.rawValue ??
        "",
    ].join("|");
  }

  return [
    observation.kind,
    hash,
    from,
    to,
    observation.tokenAddress
      .trim()
      .toLowerCase(),
    observation.rawValue,
  ].join("|");
}

export function rankEvmWalletGraphNeighbors(
  focalAddress: string,
  observations:
    readonly EvmWalletGraphObservation[]
): readonly EvmWalletGraphNeighbor[] {
  const focal =
    normalizeAddress(
      focalAddress
    );

  if (!focal) {
    throw new Error(
      "Invalid EVM graph focal address."
    );
  }

  const neighbors =
    new Map<
      string,
      NeighborAccumulator
    >();

  for (
    const observation of
      observations
  ) {
    const hash =
      normalizeHash(
        observation.transactionHash
      );

    const from =
      normalizeAddress(
        observation.from
      );

    const to =
      normalizeAddress(
        observation.to
      );

    if (
      !hash ||
      !from ||
      !to ||
      from === to
    ) {
      continue;
    }

    let neighbor:
      string | null = null;

    if (from === focal) {
      neighbor = to;
    } else if (
      to === focal
    ) {
      neighbor = from;
    }

    if (
      !neighbor ||
      neighbor === focal
    ) {
      continue;
    }

    const existing =
      neighbors.get(
        neighbor
      ) ?? {
        address:
          neighbor,

        observationKeys:
          new Set<string>(),

        transactionHashes:
          new Set<string>(),

        tokenAddresses:
          new Set<string>(),
      };

    existing
      .observationKeys
      .add(
        evidenceKey(
          observation,
          hash,
          from,
          to
        )
      );

    existing
      .transactionHashes
      .add(hash);

    if (
      observation.kind ===
        "erc20_transfer"
    ) {
      const tokenAddress =
        normalizeAddress(
          observation
            .tokenAddress
        );

      if (tokenAddress) {
        existing
          .tokenAddresses
          .add(
            tokenAddress
          );
      }
    }

    neighbors.set(
      neighbor,
      existing
    );
  }

  return [
    ...neighbors.values(),
  ]
    .sort(
      (left, right) =>
        right
          .observationKeys
          .size -
          left
            .observationKeys
            .size ||
        right
          .transactionHashes
          .size -
          left
            .transactionHashes
            .size ||
        left.address
          .localeCompare(
            right.address
          )
    )
    .map(
      neighbor => ({
        address:
          neighbor.address,

        evidenceObservationCount:
          neighbor
            .observationKeys
            .size,

        evidenceTransactionCount:
          neighbor
            .transactionHashes
            .size,

        evidenceTransactionHashes:
          [
            ...neighbor
              .transactionHashes,
          ].sort(),

        observedTokenAddresses:
          [
            ...neighbor
              .tokenAddresses,
          ].sort(),
      })
    );
}
