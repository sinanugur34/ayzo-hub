import { isAddress } from "@solana/kit";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import { readJsonObjectBody } from "@/lib/requestBody";
import {
  solanaRpcCall,
} from "@/lib/intelligence/solana/rpcTransport";

type RpcMintInfo = {
  mintAuthority: string | null;
  supply: string;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority: string | null;
};

type RpcAccountData = {
  program?: string;
  parsed?: {
    type?: string;
    info?: RpcMintInfo;
  };
  space?: number;
};

export async function POST(request: Request) {
  const isDevelopmentTestRequest =
    process.env.NODE_ENV !== "production" &&
    request.headers.get("x-ayzo-test-request") === "smoke";

  if (!isDevelopmentTestRequest) {
    const clientIp = getClientIp(request);

    const rateLimit = await checkRateLimit({
      key: `token:${clientIp}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return Response.json(
        {
          ok: false,
          error: "Too many verification requests.",
          retryAfterSeconds:
            rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimit.retryAfterSeconds
            ),
          },
        }
      );
    }
  }

  try {
    const parsedBody =
      await readJsonObjectBody(request);

    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.body;

    const address =
      typeof body?.address === "string" ? body.address.trim() : "";

    if (!address) {
      return Response.json(
        { ok: false, error: "Token address is required." },
        { status: 400 }
      );
    }

    if (!isAddress(address)) {
      return Response.json(
        { ok: false, error: "Invalid Solana address." },
        { status: 400 }
      );
    }

    const accountResult =
      await solanaRpcCall(
        "getAccountInfo",

        [
          address,

          {
            encoding:
              "jsonParsed",

            commitment:
              "confirmed",
          },
        ]
      );

    const account =
      accountResult?.value;

    if (!account) {
      return Response.json(
        {
          ok: false,
          error: "No on-chain account was found at this address.",
        },
        { status: 404 }
      );
    }

    const data = account.data as RpcAccountData;
    const parsed = data?.parsed;

    if (!parsed || parsed.type !== "mint" || !parsed.info) {
      return Response.json(
        {
          ok: false,
          error: "This Solana address exists, but it is not a token mint.",
          accountOwner: account.owner ?? null,
        },
        { status: 422 }
      );
    }

    const info = parsed.info;

    return Response.json({
      ok: true,
      network: "solana-mainnet",
      address,
      isTokenMint: true,
      tokenProgram: data.program ?? "unknown",
      accountOwner: account.owner ?? null,
      executable: account.executable ?? false,
      lamports: account.lamports ?? null,
      mint: {
        supply: info.supply,
        decimals: info.decimals,
        mintAuthority: info.mintAuthority,
        freezeAuthority: info.freezeAuthority,
        isInitialized: info.isInitialized,
      },
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
