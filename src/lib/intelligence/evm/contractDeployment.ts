export function parseEvmHexQuantity(
  value: unknown
): number | null {
  if (
    typeof value !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(value)
  ) {
    return null;
  }

  try {
    const parsed =
      Number(BigInt(value));

    return (
      Number.isSafeInteger(parsed) &&
      parsed >= 0
    )
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function toEvmBlockTag(
  blockNumber: number
): string {
  if (
    !Number.isSafeInteger(blockNumber) ||
    blockNumber < 0
  ) {
    throw new Error(
      "Invalid EVM block number."
    );
  }

  return `0x${blockNumber.toString(16)}`;
}

export function hasEvmRuntimeCode(
  value: unknown
): boolean {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  const normalized =
    value.trim().toLowerCase();

  return (
    /^0x[0-9a-f]*$/.test(
      normalized
    ) &&
    normalized !== "0x" &&
    normalized !== "0x0" &&
    !/^0x0+$/.test(normalized)
  );
}

export async function findFirstContractCodeBlock(
  latestBlock: number,
  hasCodeAtBlock:
    (
      blockNumber: number
    ) => Promise<boolean>
): Promise<number | null> {
  if (
    !Number.isSafeInteger(latestBlock) ||
    latestBlock < 0
  ) {
    throw new Error(
      "Invalid latest block number."
    );
  }

  if (
    !await hasCodeAtBlock(
      latestBlock
    )
  ) {
    return null;
  }

  let low = 0;
  let high =
    latestBlock;

  while (low < high) {
    const middle =
      low +
      Math.floor(
        (high - low) / 2
      );

    if (
      await hasCodeAtBlock(
        middle
      )
    ) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
}
