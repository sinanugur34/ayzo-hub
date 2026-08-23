import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isAddress } from "@solana/kit";

const MAX_WALLETS = 5;
const TX_DETAIL_LIMIT_PER_WALLET = 12;

type ParsedInstruction = {
  program?: string;
  parsed?: {
    type?: string;
    info?: {
      source?: string;
      destination?: string;
      lamports?: number;
    };
  };
};

type IncomingTransfer = {
  signature: string;
  source: string;
  destination: string;
  lamports: string;
  sol: number;
  blockTime: number | null;
};

type HistoryTransaction = {
  blockTime?: number | null;
  transaction?: {
    signatures?: string[];
    message?: {
      instructions?: ParsedInstruction[];
    };
  };
  meta?: {
    innerInstructions?: {
      instructions?: ParsedInstruction[];
    }[];
  };
};

type TransactionsForAddressResult = {
  data?: HistoryTransaction[];
};

function getRpcUrl() {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    throw new Error("HELIUS_API_KEY is not configured.");
  }

  return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function rpcCall(method: string, params: unknown[]) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(getRpcUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method,
          params,
        }),
        cache: "no-store",
      });

      if (response.status === 429 || response.status === 503) {
        await sleep(300 * 2 ** attempt);
        continue;
      }

      if (!response.ok) {
        throw new Error(`RPC HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message ?? "Solana RPC error");
      }

      return data.result;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Unknown RPC error");

      if (attempt < 2) {
        await sleep(300 * 2 ** attempt);
      }
    }
  }

  throw lastError ?? new Error("RPC request failed.");
}

export async function POST(request: Request) {
  if (!isInternalApiRequest(request)) {
    return Response.json(
      {
        ok: false,
        error: "Forbidden.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    if (!Array.isArray(body?.addresses)) {
      return Response.json(
        { ok: false, error: "Addresses must be an array." },
        { status: 400 }
      );
    }

    const addresses: string[] = Array.from(
      new Set<string>(
        body.addresses
          .filter(
            (value: unknown): value is string => typeof value === "string"
          )
          .map((value: string) => value.trim())
          .filter(Boolean)
      )
    );

    if (addresses.length < 2) {
      return Response.json(
        { ok: false, error: "At least two wallet addresses are required." },
        { status: 400 }
      );
    }

    if (addresses.length > MAX_WALLETS) {
      return Response.json(
        {
          ok: false,
          error: `Maximum ${MAX_WALLETS} wallets per alpha analysis.`,
        },
        { status: 400 }
      );
    }

    const invalid = addresses.find((address) => !isAddress(address));

    if (invalid) {
      return Response.json(
        {
          ok: false,
          error: "Invalid Solana wallet address.",
          address: invalid,
        },
        { status: 400 }
      );
    }

    const targetWallets = new Set(addresses);
    const incomingTransfers: IncomingTransfer[] = [];
    const seenTransfers = new Set<string>();

    const walletHistories = await Promise.all(
      addresses.map(async (wallet) => {
        const result = (await rpcCall(
          "getTransactionsForAddress",
          [
            wallet,
            {
              transactionDetails: "full",
              limit: TX_DETAIL_LIMIT_PER_WALLET,
              sortOrder: "desc",
              commitment: "confirmed",
              encoding: "jsonParsed",
              maxSupportedTransactionVersion: 0,
              filters: {
                status: "succeeded",
              },
            },
          ]
        )) as TransactionsForAddressResult;

        return {
          wallet,
          transactions: Array.isArray(result?.data)
            ? result.data
            : [],
        };
      })
    );

    for (const { wallet, transactions } of walletHistories) {
      for (const transaction of transactions) {
        const signature =
          transaction.transaction?.signatures?.[0];

        if (!signature) continue;

        const outer =
          transaction.transaction?.message?.instructions ?? [];

        const inner =
          transaction.meta?.innerInstructions?.flatMap(
            (group) => group.instructions ?? []
          ) ?? [];

        for (const instruction of [...outer, ...inner]) {
          if (
            instruction.program !== "system" ||
            instruction.parsed?.type !== "transfer"
          ) {
            continue;
          }

          const source = instruction.parsed.info?.source;
          const destination =
            instruction.parsed.info?.destination;
          const lamports =
            instruction.parsed.info?.lamports;

          if (
            !source ||
            !destination ||
            destination !== wallet ||
            source === destination ||
            typeof lamports !== "number" ||
            !Number.isFinite(lamports) ||
            lamports <= 0
          ) {
            continue;
          }

          const normalizedLamports = Math.trunc(lamports);

          const dedupeKey =
            `${signature}:${source}:${destination}:${normalizedLamports}`;

          if (seenTransfers.has(dedupeKey)) continue;

          seenTransfers.add(dedupeKey);

          incomingTransfers.push({
            signature,
            source,
            destination,
            lamports: String(normalizedLamports),
            sol: normalizedLamports / 1_000_000_000,
            blockTime: transaction.blockTime ?? null,
          });
        }
      }
    }

    const sourceMap = new Map<
      string,
      {
        wallets: Set<string>;
        transferCount: number;
        totalLamports: bigint;
        latestBlockTime: number | null;
        transfers: IncomingTransfer[];
      }
    >();

    for (const transfer of incomingTransfers) {
      const existing = sourceMap.get(transfer.source);
      const lamports = BigInt(transfer.lamports);

      if (existing) {
        existing.wallets.add(transfer.destination);
        existing.transferCount += 1;
        existing.totalLamports += lamports;
        existing.transfers.push(transfer);

        if (
          transfer.blockTime &&
          (!existing.latestBlockTime ||
            transfer.blockTime > existing.latestBlockTime)
        ) {
          existing.latestBlockTime = transfer.blockTime;
        }
      } else {
        sourceMap.set(transfer.source, {
          wallets: new Set([transfer.destination]),
          transferCount: 1,
          totalLamports: lamports,
          latestBlockTime: transfer.blockTime,
          transfers: [transfer],
        });
      }
    }

    const sharedSources = Array.from(sourceMap.entries())
      .filter(([, value]) => value.wallets.size >= 2)
      .map(([source, value]) => ({
        source,
        sourceIsAnalyzedWallet: targetWallets.has(source),
        walletsFunded: Array.from(value.wallets),
        walletCount: value.wallets.size,
        transferCount: value.transferCount,
        totalLamports: value.totalLamports.toString(),
        totalSol: Number(value.totalLamports) / 1_000_000_000,
        latestBlockTime: value.latestBlockTime,
        signalStrength:
          value.wallets.size >= 3 || value.transferCount >= 4
            ? "high"
            : "medium",
        transfers: value.transfers.slice(0, 10),
      }))
      .sort((a, b) => {
        if (a.walletCount !== b.walletCount) {
          return b.walletCount - a.walletCount;
        }

        return b.transferCount - a.transferCount;
      });

    const perWallet = addresses.map((wallet) => {
      const transfers = incomingTransfers
        .filter((transfer) => transfer.destination === wallet)
        .sort(
          (a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0)
        );

      return {
        wallet,
        recentIncomingTransfers: transfers.slice(0, 5),
        uniqueRecentSources: new Set(
          transfers.map((transfer) => transfer.source)
        ).size,
      };
    });

    return Response.json({
      ok: true,
      network: "solana-mainnet",
      walletsAnalyzed: addresses.length,
      historyMethod: "getTransactionsForAddress",
      historyRequests: addresses.length,
      transactionsExpandedPerWallet: TX_DETAIL_LIMIT_PER_WALLET,
      incomingTransfersDetected: incomingTransfers.length,
      sharedFundingSourcesDetected: sharedSources.length,
      sharedSources,
      perWallet,
      methodology: {
        meaning:
          "A shared source means multiple analyzed wallets recently received direct SOL transfers from the same address.",
        limitation:
          "This is a recent funding signal only. It does not identify the original funder and does not prove common ownership or coordination.",
        entityRisk:
          "Exchange, bridge, treasury, protocol and custody addresses can legitimately fund many unrelated wallets.",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "Funding analysis failed.",
        details:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}
