import type {
  NetworkId,
} from "../../src/lib/networks/registry";

const STORAGE_KEY =
  "ayzo:mobile-analysis-history:v1";

const REPLAY_KEY =
  "ayzo:mobile-analysis-replay:v1";

const MAX_ITEMS =
  20;

export type MobileHistoryItem = {
  networkId: NetworkId;
  address: string;
  analyzedAt: number;
};

function isHistoryItem(
  value: unknown
): value is MobileHistoryItem {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const item =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof item.networkId ===
      "string" &&
    typeof item.address ===
      "string" &&
    item.address.trim().length >
      0 &&
    typeof item.analyzedAt ===
      "number" &&
    Number.isFinite(
      item.analyzedAt
    )
  );
}

export function readMobileHistory():
  MobileHistoryItem[] {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isHistoryItem)
      .slice(
        0,
        MAX_ITEMS
      );
  } catch {
    return [];
  }
}

export function recordMobileHistory(
  item: MobileHistoryItem
) {
  const normalizedAddress =
    item.address.trim();

  const current =
    readMobileHistory()
      .filter(
        entry =>
          !(
            entry.networkId ===
              item.networkId &&
            entry.address
              .toLowerCase() ===
              normalizedAddress
                .toLowerCase()
          )
      );

  const next = [
    {
      ...item,
      address:
        normalizedAddress,
    },
    ...current,
  ].slice(
    0,
    MAX_ITEMS
  );

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(next)
  );
}

export function clearMobileHistory() {
  localStorage.removeItem(
    STORAGE_KEY
  );
}

export function setHistoryReplay(
  item: MobileHistoryItem
) {
  localStorage.setItem(
    REPLAY_KEY,
    JSON.stringify(item)
  );
}

export function consumeHistoryReplay():
  MobileHistoryItem | null {
  try {
    const raw =
      localStorage.getItem(
        REPLAY_KEY
      );

    localStorage.removeItem(
      REPLAY_KEY
    );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    return isHistoryItem(
      parsed
    )
      ? parsed
      : null;
  } catch {
    localStorage.removeItem(
      REPLAY_KEY
    );

    return null;
  }
}
