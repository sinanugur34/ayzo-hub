import { isAddress } from "@solana/kit";
import { cookies } from "next/headers";
import {
  checkRateLimit,
  getClientIp,
} from "@/lib/rateLimit";
import {
  consumeFreeAnalysis,
  FREE_DEVICE_COOKIE,
  FREE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/freeQuota";
import { getInternalApiKey } from "@/lib/apiSecurity";

type JsonObject = Record<string, unknown>;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  data: Record<string, unknown>;
};

const intelligenceCache = new Map<string, CacheEntry>();

async function postInternal(
  origin: string,
  path: string,
  body: JsonObject,
  retries = 3
) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ayzo-internal-key":
          getInternalApiKey(),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json();

    const rateLimited =
      JSON.stringify(data).includes("429") ||
      JSON.stringify(data).toLowerCase().includes("rate limit");

    if (!rateLimited) {
      return data;
    }

    if (attempt < retries - 1) {
      await sleep(1000 * 2 ** attempt);
    }
  }

  throw new Error(`Rate limit persisted for ${path}`);
}

export async function POST(request: Request) {
  const isDevelopmentTestRequest =
    process.env.NODE_ENV !== "production" &&
    request.headers.get("x-ayzo-test-request") === "smoke";

  if (!isDevelopmentTestRequest) {
    const clientIp = getClientIp(request);

    const rateLimit = await checkRateLimit({
      key: `intelligence:${clientIp}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return Response.json(
        {
          ok: false,
          error: "Too many analysis requests.",
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
    let body: JsonObject;

    try {
      body = (await request.json()) as JsonObject;
    } catch {
      return Response.json(
        {
          ok: false,
          error: "Invalid JSON body.",
        },
        { status: 400 }
      );
    }

    const address =
      typeof body?.address === "string"
        ? body.address.trim()
        : "";

    const testFailure =
      process.env.NODE_ENV !== "production" &&
      (body?.__testFailure === "relationships" ||
        body?.__testFailure === "funding")
        ? body.__testFailure
        : null;

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

    if (!isDevelopmentTestRequest) {
      const quota =
        await consumeFreeAnalysis(request);

      if (quota.deviceCookie) {
        const cookieStore = await cookies();

        cookieStore.set(
          FREE_DEVICE_COOKIE,
          quota.deviceCookie,
          {
            httpOnly: true,
            secure:
              process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: FREE_DEVICE_COOKIE_MAX_AGE,
          }
        );
      }

      if (!quota.allowed) {
        const retryAfterSeconds =
          quota.resetAt
            ? Math.max(
                1,
                Math.ceil(
                  (quota.resetAt - Date.now()) /
                    1000
                )
              )
            : 24 * 60 * 60;

        return Response.json(
          {
            ok: false,
            code: "DAILY_FREE_LIMIT",
            error:
              "Daily free analysis limit reached.",
            plan: "free",
            quota: {
              limit: quota.limit,
              remaining: 0,
              resetAt: quota.resetAt,
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                retryAfterSeconds
              ),
              "Cache-Control": "no-store",
            },
          }
        );
      }
    }

    const origin =
      process.env.NODE_ENV === "production"
        ? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://app.ayzo.io"
        : new URL(request.url).origin;
    const pipelineStartedAt = performance.now();

    const cached = testFailure
      ? undefined
      : intelligenceCache.get(address);

    if (cached && cached.expiresAt > Date.now()) {
      return Response.json({
        ...cached.data,
        cache: {
          hit: true,
          ttlMs: CACHE_TTL_MS,
        },
        performance: {
          totalMs: Math.round(performance.now() - pipelineStartedAt),
          source: "cache",
        },
      });
    }

    if (cached) {
      intelligenceCache.delete(address);
    }

    // 1. Holder data is fetched ONCE.
    const holdersStartedAt = performance.now();
    const holders = await postInternal(
      origin,
      "/api/solana/holders",
      { address }
    );

    const holdersMs = performance.now() - holdersStartedAt;

    if (!holders?.ok) {
      return Response.json(
        {
          ok: false,
          stage: "holders",
          error: holders?.error ?? "Holder analysis failed.",
        },
        { status: 502 }
      );
    }

    const wallets = Array.isArray(holders.owners)
      ? holders.owners
          .slice(0, 5)
          .map((item: { owner?: string }) => item.owner)
          .filter(
            (value: unknown): value is string =>
              typeof value === "string"
          )
      : [];

    if (wallets.length < 2) {
      const holderCoverageLimited =
        holders?.coverage === "limited";

      const findings = [
        {
          id: holderCoverageLimited
            ? "holder-coverage-limited"
            : "insufficient-holder-set",
          category: "COVERAGE",
          title: holderCoverageLimited
            ? "Holder intelligence coverage is limited"
            : "Deeper wallet analysis is unavailable",
          severity: "informational",
          confidence: "high",
          summary: holderCoverageLimited
            ? holders?.limitation?.message ??
              "Reliable top-holder ranking is unavailable under the current provider limits."
            : "AYZO could not identify enough reliable owner wallets for deeper analysis.",
          caveat: holderCoverageLimited
            ? "AYZO did not estimate holder concentration from an unsorted account sample. Relationship and funding analysis were not run without a reliable top-holder set."
            : "Relationship and funding intelligence require at least two reliably resolved owner wallets.",
        },
      ];

      const payload = {
        ok: true,
        network: "solana-mainnet",
        address,
        coverage: holderCoverageLimited
          ? "limited"
          : "partial",
        holders,
        relationships: null,
        funding: null,
        findings,
        note: holderCoverageLimited
          ? "Large-token holder coverage is limited. Deeper wallet analysis was intentionally not run."
          : "Not enough owner wallets for deeper analysis.",
        modules: {
          holders: {
            status: holderCoverageLimited
              ? "limited"
              : "complete",
          },
          relationships: {
            status: "not-run",
            error: null,
          },
          funding: {
            status: "not-run",
            error: null,
          },
        },
        pipeline: {
          holderFetches: 1,
          relationshipMode: "not-run",
          fundingMode: "not-run",
        },
        cache: {
          hit: false,
          ttlMs: CACHE_TTL_MS,
        },
        performance: {
          holdersMs: Math.round(holdersMs),
          totalMs: Math.round(
            performance.now() - pipelineStartedAt
          ),
          source: "live",
        },
      };

      if (!testFailure) {
        intelligenceCache.set(address, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          data: payload,
        });
      }

      return Response.json(payload);
    }

    // Give the provider a little breathing room.
    await sleep(400);

    // 2. Relationship analysis.
    const relationshipsStartedAt = performance.now();

    let relationships;

    if (testFailure === "relationships") {
      relationships = {
        ok: false,
        error: "Relationship analysis unavailable.",
        details: "Development failure simulation.",
      };
    } else {
      try {
        relationships = await postInternal(
          origin,
          "/api/solana/relationships",
          { addresses: wallets }
        );
      } catch {
        relationships = {
          ok: false,
          error: "Relationship analysis unavailable.",
        };
      }
    }

    const relationshipsMs =
      performance.now() - relationshipsStartedAt;

    // Avoid relationship + funding bursts overlapping.
    await sleep(400);

    // 3. Funding analysis.
    const fundingStartedAt = performance.now();

    let funding;

    if (testFailure === "funding") {
      funding = {
        ok: false,
        error: "Funding analysis unavailable.",
        details: "Development failure simulation.",
      };
    } else {
      try {
        funding = await postInternal(
          origin,
          "/api/solana/funding",
          { addresses: wallets }
        );
      } catch {
        funding = {
          ok: false,
          error: "Funding analysis unavailable.",
        };
      }
    }

    const fundingMs = performance.now() - fundingStartedAt;

    const relationshipsAvailable =
      relationships?.ok === true;

    const fundingAvailable =
      funding?.ok === true;

    const relations =
      relationshipsAvailable &&
      Array.isArray(relationships?.relations)
        ? relationships.relations
        : [];

    const directRelations = relations.filter(
      (relation: {
        directSolTransferCount?: number;
      }) => (relation.directSolTransferCount ?? 0) > 0
    );

    const totalDirectTransfers = directRelations.reduce(
      (
        total: number,
        relation: {
          directSolTransferCount?: number;
        }
      ) => total + (relation.directSolTransferCount ?? 0),
      0
    );

    const totalDirectSol = directRelations.reduce(
      (
        total: number,
        relation: {
          directSol?: number;
        }
      ) => total + (relation.directSol ?? 0),
      0
    );

    const top20 =
      typeof holders?.concentration?.top20 === "number"
        ? holders.concentration.top20
        : 0;

    const sharedFundingSources =
      fundingAvailable &&
      typeof funding?.sharedFundingSourcesDetected === "number"
        ? funding.sharedFundingSourcesDetected
        : null;

    const relationshipFinding =
      relationshipsAvailable
        ? {
            id: "wallet-interaction",
            category: "RELATIONSHIP",
            title:
              totalDirectTransfers > 0
                ? "Verified direct wallet interaction detected"
                : "No direct wallet interaction detected",
            severity:
              totalDirectTransfers > 0
                ? "attention"
                : "informational",
            confidence:
              totalDirectTransfers > 0
                ? "high"
                : "medium",
            summary:
              totalDirectTransfers > 0
                ? `${totalDirectTransfers} verified direct SOL transfer${
                    totalDirectTransfers === 1 ? "" : "s"
                  } detected between analyzed top-holder wallets, totaling ${totalDirectSol.toLocaleString(
                    "en-US"
                  )} SOL.`
                : "No direct SOL transfer was detected between the analyzed top-holder wallets in the current transaction window.",
            caveat:
              "Direct interaction does not prove common ownership, coordination or insider activity.",
          }
        : {
            id: "relationship-unavailable",
            category: "RELATIONSHIP",
            title: "Relationship analysis unavailable",
            severity: "informational",
            confidence: "high",
            summary:
              "AYZO could not complete the wallet relationship module for this analysis.",
            caveat:
              "No relationship conclusion was generated from an incomplete analysis.",
          };

    const holderFinding = {
      id: "holder-concentration",
      category: "HOLDERS",
      title: "Holder concentration requires context",
      severity: "informational",
      confidence: "high",
      summary: `The top 20 analyzed owners hold approximately ${top20.toFixed(
        2
      )}% of the token supply.`,
      caveat:
        "Concentration alone is not treated as risk. Exchange, liquidity, treasury and custody wallets are not yet entity-classified.",
    };

    const fundingFinding =
      fundingAvailable
        ? {
            id: "funding-signal",
            category: "FUNDING",
            title:
              (sharedFundingSources ?? 0) > 0
                ? "Shared recent funding source detected"
                : "No shared recent funding source detected",
            severity:
              (sharedFundingSources ?? 0) > 0
                ? "attention"
                : "informational",
            confidence: "medium",
            summary:
              (sharedFundingSources ?? 0) > 0
                ? `${sharedFundingSources} shared recent funding source${
                    sharedFundingSources === 1 ? "" : "s"
                  } detected among analyzed wallets.`
                : "No common recent direct SOL funding source was detected among the analyzed wallets.",
            caveat:
              "Recent funding evidence does not identify the original funder and does not prove common ownership or wallet independence.",
          }
        : {
            id: "funding-unavailable",
            category: "FUNDING",
            title: "Funding analysis unavailable",
            severity: "informational",
            confidence: "high",
            summary:
              "AYZO could not complete the recent funding module for this analysis.",
            caveat:
              "No funding conclusion was generated from an incomplete analysis.",
          };

    const findings = [
      relationshipFinding,
      holderFinding,
      fundingFinding,
    ];

    const payload = {
      ok: true,
      network: "solana-mainnet",
      address,
      coverage: "full",
      wallets,
      holders,
      relationships: relationshipsAvailable
        ? relationships
        : null,
      funding: fundingAvailable
        ? funding
        : null,
      findings,
      modules: {
        holders: {
          status: "complete",
        },
        relationships: {
          status: relationshipsAvailable
            ? "complete"
            : "unavailable",
          error: relationshipsAvailable
            ? null
            : relationships?.details ??
              relationships?.error ??
              "Relationship analysis unavailable.",
        },
        funding: {
          status: fundingAvailable
            ? "complete"
            : "unavailable",
          error: fundingAvailable
            ? null
            : funding?.details ??
              funding?.error ??
              "Funding analysis unavailable.",
        },
      },
      pipeline: {
        holderFetches: 1,
        relationshipMode: "sequential",
        fundingMode: "sequential",
      },
      cache: {
        hit: false,
        ttlMs: CACHE_TTL_MS,
      },
      performance: {
        holdersMs: Math.round(holdersMs),
        relationshipsMs: Math.round(relationshipsMs),
        fundingMs: Math.round(fundingMs),
        totalMs: Math.round(performance.now() - pipelineStartedAt),
        source: "live",
      },
    };

    if (!testFailure) {
      intelligenceCache.set(address, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: payload,
      });
    }

    return Response.json(payload);
  } catch {
    return Response.json(
      {
        ok: false,
        error: "AYZO Intelligence Pipeline failed.",
      },
      { status: 500 }
    );
  }
}
