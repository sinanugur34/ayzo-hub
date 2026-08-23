import { isInternalApiRequest } from "@/lib/apiSecurity";
import { isAddress } from "@solana/kit";

function getRpcUrl() {
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey) {
    throw new Error("HELIUS_API_KEY is not configured.");
  }

  return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(apiKey)}`;
}

type LargestAccount = {
  address: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
};

type ParsedTokenAccount = {
  owner: string;
  mint: string;
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
  };
};

async function rpcCall(method: string, params: unknown[]) {
  const response = await fetch(getRpcUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message ?? "Solana RPC error");
  }

  return data.result;
}

function percent(amount: bigint, supply: bigint) {
  if (supply === BigInt(0)) return 0;

  const scaled = (amount * BigInt(1000000)) / supply;

  return Number(scaled) / 10_000;
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

    const address =
      typeof body?.address === "string" ? body.address.trim() : "";

    if (!address) {
      return Response.json(
        {
          ok: false,
          error: "Token address is required.",
        },
        { status: 400 }
      );
    }

    if (!isAddress(address)) {
      return Response.json(
        {
          ok: false,
          error: "Invalid Solana address.",
        },
        { status: 400 }
      );
    }

    /*
     * 1. Total token supply
     */
    const supplyResult = await rpcCall("getTokenSupply", [
      address,
      {
        commitment: "confirmed",
      },
    ]);

    const rawSupply = supplyResult?.value?.amount;

    if (!rawSupply) {
      return Response.json(
        {
          ok: false,
          error: "Unable to determine token supply.",
        },
        { status: 502 }
      );
    }

    const supply = BigInt(rawSupply);

    /*
     * 2. Largest 20 token accounts
     *
     * Very large tokens can exceed the RPC provider's account-scan limit.
     * AYZO does not substitute an unsorted account sample and present it as
     * "top holders". In that case we explicitly return limited coverage.
     */
    let largestResult;

    try {
      largestResult = await rpcCall("getTokenLargestAccounts", [
        address,
        {
          commitment: "confirmed",
        },
      ]);
    } catch (error) {
      const details =
        error instanceof Error
          ? error.message
          : "Unknown RPC error.";

      const largeTokenProviderLimit =
        /too many accounts requested/i.test(details);

      if (!largeTokenProviderLimit) {
        throw error;
      }

      return Response.json({
        ok: true,
        network: "solana-mainnet",
        address,
        slot: supplyResult?.context?.slot ?? null,
        totalSupply: rawSupply,

        coverage: "limited",
        holderMethod: "provider-limited",

        tokenAccountsAnalyzed: 0,
        uniqueOwners: 0,
        unresolvedAccounts: 0,

        concentration: {
          top1: null,
          top5: null,
          top10: null,
          top20: null,
        },

        owners: [],

        limitation: {
          code: "LARGE_TOKEN_PROVIDER_LIMIT",
          message:
            "Reliable top-holder ranking is unavailable for this large token under the current RPC provider limits.",
          methodology:
            "AYZO does not estimate top-holder concentration from unsorted token-account samples.",
        },
      });
    }

    const largestAccounts = (largestResult?.value ?? []) as LargestAccount[];

    if (!largestAccounts.length) {
      return Response.json({
        ok: true,
        address,
        slot: largestResult?.context?.slot ?? null,
        totalSupply: rawSupply,
        coverage: "full",
        holderMethod: "largest-accounts",
        tokenAccountsAnalyzed: 0,
        uniqueOwners: 0,
        unresolvedAccounts: 0,
        concentration: {
          top1: 0,
          top5: 0,
          top10: 0,
          top20: 0,
        },
        owners: [],
      });
    }

    /*
     * 3. Resolve token accounts -> real wallet owners
     */
    const tokenAccountAddresses = largestAccounts.map(
      (account) => account.address
    );

    const multipleAccountsResult = await rpcCall("getMultipleAccounts", [
      tokenAccountAddresses,
      {
        encoding: "jsonParsed",
        commitment: "confirmed",
      },
    ]);

    const accountInfos = multipleAccountsResult?.value ?? [];

    const ownerBalances = new Map<
      string,
      {
        amount: bigint;
        tokenAccounts: string[];
      }
    >();

    let unresolvedAccounts = 0;

    for (let index = 0; index < largestAccounts.length; index++) {
      const largest = largestAccounts[index];
      const accountInfo = accountInfos[index];

      const parsedInfo = accountInfo?.data?.parsed?.info as
        | ParsedTokenAccount
        | undefined;

      const owner = parsedInfo?.owner;

      if (!owner) {
        unresolvedAccounts++;
        continue;
      }

      const amount = BigInt(largest.amount);

      const existing = ownerBalances.get(owner);

      if (existing) {
        existing.amount += amount;
        existing.tokenAccounts.push(largest.address);
      } else {
        ownerBalances.set(owner, {
          amount,
          tokenAccounts: [largest.address],
        });
      }
    }

    /*
     * 4. Aggregate by owner wallet
     */
    const owners = Array.from(ownerBalances.entries())
      .map(([owner, data]) => ({
        owner,
        amount: data.amount,
        tokenAccounts: data.tokenAccounts,
      }))
      .sort((a, b) => {
        if (a.amount === b.amount) return 0;
        return a.amount > b.amount ? -1 : 1;
      });

    function sumTop(count: number) {
      return owners
        .slice(0, count)
        .reduce((sum, item) => sum + item.amount, BigInt(0));
    }

    const resultOwners = owners.map((item, index) => ({
      rank: index + 1,
      owner: item.owner,
      amount: item.amount.toString(),
      percentage: percent(item.amount, supply),
      tokenAccountCount: item.tokenAccounts.length,
      tokenAccounts: item.tokenAccounts,
    }));

    return Response.json({
      ok: true,
      network: "solana-mainnet",
      address,

      slot:
        multipleAccountsResult?.context?.slot ??
        largestResult?.context?.slot ??
        null,

      totalSupply: rawSupply,

      coverage: "full",
      holderMethod: "largest-accounts",

      tokenAccountsAnalyzed: largestAccounts.length,
      uniqueOwners: owners.length,
      unresolvedAccounts,

      concentration: {
        top1: percent(sumTop(1), supply),
        top5: percent(sumTop(5), supply),
        top10: percent(sumTop(10), supply),
        top20: percent(sumTop(20), supply),
      },

      owners: resultOwners,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "Holder analysis failed.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}
