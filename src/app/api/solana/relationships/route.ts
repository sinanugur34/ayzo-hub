import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isAddress } from "@solana/kit";

const SIGNATURE_LIMIT = 50;
const MAX_WALLETS = 5;
const MAX_SHARED_TX_DETAILS = 25;

type SignatureInfo = {
  signature: string;
  slot: number;
  err: unknown | null;
  blockTime: number | null;
};

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

function getRpcUrl() {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error("HELIUS_API_KEY is not configured.");
  return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
}

async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);

  const data = await response.json();
  if (data.error) throw new Error(data.error.message ?? "Solana RPC error");

  return data.result;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join(":");
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
          .filter((value: unknown): value is string => typeof value === "string")
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
        { ok: false, error: `Maximum ${MAX_WALLETS} wallets per alpha analysis.` },
        { status: 400 }
      );
    }

    const invalid = addresses.find((address) => !isAddress(address));
    if (invalid) {
      return Response.json(
        { ok: false, error: "Invalid Solana wallet address.", address: invalid },
        { status: 400 }
      );
    }

    const histories = await Promise.all(
      addresses.map(async (address) => {
        const signatures = (await rpcCall("getSignaturesForAddress", [
          address,
          { commitment: "confirmed", limit: SIGNATURE_LIMIT },
        ])) as SignatureInfo[];

        return {
          address,
          signatures: signatures.filter((item) => item.err === null),
        };
      })
    );

    const signatureMap = new Map<
      string,
      { wallets: Set<string>; slot: number; blockTime: number | null }
    >();

    for (const history of histories) {
      for (const item of history.signatures) {
        const existing = signatureMap.get(item.signature);
        if (existing) {
          existing.wallets.add(history.address);
        } else {
          signatureMap.set(item.signature, {
            wallets: new Set([history.address]),
            slot: item.slot,
            blockTime: item.blockTime,
          });
        }
      }
    }

    const sharedTransactions = Array.from(signatureMap.entries())
      .filter(([, value]) => value.wallets.size >= 2)
      .map(([signature, value]) => ({
        signature,
        wallets: Array.from(value.wallets),
        slot: value.slot,
        blockTime: value.blockTime,
      }))
      .sort((a, b) => b.slot - a.slot);

    const pairMap = new Map<
      string,
      {
        walletA: string;
        walletB: string;
        sharedTransactionCount: number;
        directSolTransferCount: number;
        directSolLamports: bigint;
        directTransfers: {
          signature: string;
          source: string;
          destination: string;
          lamports: string;
          blockTime: number | null;
        }[];
        signatures: string[];
        latestBlockTime: number | null;
      }
    >();

    for (const shared of sharedTransactions) {
      for (let i = 0; i < shared.wallets.length; i++) {
        for (let j = i + 1; j < shared.wallets.length; j++) {
          const walletA = shared.wallets[i];
          const walletB = shared.wallets[j];
          const key = pairKey(walletA, walletB);
          const existing = pairMap.get(key);

          if (existing) {
            existing.sharedTransactionCount += 1;
            existing.signatures.push(shared.signature);
            if (
              shared.blockTime &&
              (!existing.latestBlockTime || shared.blockTime > existing.latestBlockTime)
            ) {
              existing.latestBlockTime = shared.blockTime;
            }
          } else {
            pairMap.set(key, {
              walletA,
              walletB,
              sharedTransactionCount: 1,
              directSolTransferCount: 0,
              directSolLamports: 0n,
              directTransfers: [],
              signatures: [shared.signature],
              latestBlockTime: shared.blockTime,
            });
          }
        }
      }
    }

    const targetWallets = new Set(addresses);

    for (const shared of sharedTransactions.slice(0, MAX_SHARED_TX_DETAILS)) {
      const transaction = await rpcCall("getTransaction", [
        shared.signature,
        {
          encoding: "jsonParsed",
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        },
      ]);

      if (!transaction) continue;

      const outer = (transaction?.transaction?.message?.instructions ?? []) as ParsedInstruction[];
      const inner = (transaction?.meta?.innerInstructions ?? []).flatMap(
        (group: { instructions?: ParsedInstruction[] }) => group.instructions ?? []
      );

      for (const instruction of [...outer, ...inner]) {
        if (
          instruction.program !== "system" ||
          instruction.parsed?.type !== "transfer"
        ) {
          continue;
        }

        const source = instruction.parsed.info?.source;
        const destination = instruction.parsed.info?.destination;
        const lamports = instruction.parsed.info?.lamports;

        if (
          !source ||
          !destination ||
          !targetWallets.has(source) ||
          !targetWallets.has(destination)
        ) {
          continue;
        }

        const relation = pairMap.get(pairKey(source, destination));
        if (!relation) continue;

        relation.directSolTransferCount += 1;

        if (typeof lamports === "number" && Number.isFinite(lamports)) {
          const normalizedLamports = BigInt(Math.trunc(lamports));

          relation.directSolLamports += normalizedLamports;

          relation.directTransfers.push({
            signature: shared.signature,
            source,
            destination,
            lamports: normalizedLamports.toString(),
            blockTime: shared.blockTime,
          });
        }
      }
    }

    const relations = Array.from(pairMap.values())
      .map((relation) => ({
        walletA: relation.walletA,
        walletB: relation.walletB,
        sharedTransactionCount: relation.sharedTransactionCount,
        directSolTransferCount: relation.directSolTransferCount,
        directSolLamports: relation.directSolLamports.toString(),
        directSol: Number(relation.directSolLamports) / 1_000_000_000,
        directTransfers: relation.directTransfers,
        latestBlockTime: relation.latestBlockTime,
        confidence:
          relation.directSolTransferCount > 0
            ? "high"
            : relation.sharedTransactionCount >= 2
              ? "medium"
              : "low",
        evidence:
          relation.directSolTransferCount > 0
            ? "Direct SOL transfer detected between wallets."
            : "Wallets appeared together in one or more recent transactions.",
        signatures: relation.signatures.slice(0, 5),
      }))
      .sort((a, b) => {
        if (a.directSolTransferCount !== b.directSolTransferCount) {
          return b.directSolTransferCount - a.directSolTransferCount;
        }
        return b.sharedTransactionCount - a.sharedTransactionCount;
      });

    return Response.json({
      ok: true,
      network: "solana-mainnet",
      walletsAnalyzed: addresses.length,
      transactionsScannedPerWallet: SIGNATURE_LIMIT,
      sharedTransactionsDetected: sharedTransactions.length,
      relationshipsDetected: relations.length,
      relations,
      methodology: {
        directSolTransfer: "High-confidence evidence of direct on-chain interaction.",
        sharedTransaction: "Co-occurrence evidence only; does not prove common ownership.",
        limitation:
          "Alpha analysis covers recent direct activity and does not yet identify original funding sources.",
      },
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Relationship analysis failed.",
      },
      { status: 500 }
    );
  }
}
