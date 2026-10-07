import {
  providerUsageFetch,
} from "@/lib/providerUsageHttpCore";

import {
  runWithProviderUsageHintsCore,
} from "@/lib/providerUsageScopeCore";

type SolanaRpcProvider = {
  id:
    "alchemy" |
    "helius";

  url:
    string;
};

type SolanaRpcOptions = {
  attemptsPerProvider?:
    number;
};

class NonRetryableSolanaRpcError
  extends Error {
  constructor(
    message:
      string
  ) {
    super(
      message
    );

    this.name =
      "NonRetryableSolanaRpcError";
  }
}

function boundedAttempts(
  value:
    number |
    undefined
): number {
  if (
    !Number.isInteger(
      value
    )
  ) {
    return 1;
  }

  return Math.min(
    3,
    Math.max(
      1,
      Number(
        value
      )
    )
  );
}

function configuredProviders():
  SolanaRpcProvider[] {
  const providers:
    SolanaRpcProvider[] =
      [];

  /*
   * PRIMARY:
   * AYZO Free Alchemy account.
   */
  const alchemyKey =
    process.env
      .ALCHEMY_API_KEY
      ?.trim();

  if (alchemyKey) {
    providers.push({
      id:
        "alchemy",

      url:
        "https://solana-mainnet.g.alchemy.com/v2/" +
        encodeURIComponent(
          alchemyKey
        ),
    });
  }

  /*
   * EMERGENCY FALLBACK:
   *
   * Keep Helius independent so an Alchemy
   * outage / rate limit does not disable
   * Solana intelligence.
   *
   * Normal traffic never reaches Helius
   * when Alchemy succeeds.
   */
  const heliusKey =
    process.env
      .HELIUS_API_KEY
      ?.trim();

  if (heliusKey) {
    providers.push({
      id:
        "helius",

      url:
        "https://mainnet.helius-rpc.com/?api-key=" +
        encodeURIComponent(
          heliusKey
        ),
    });
  }

  return providers;
}

async function sleep(
  milliseconds:
    number
) {
  await new Promise<void>(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

function retryableStatus(
  status:
    number
): boolean {
  return (
    status ===
      429 ||
    status ===
      502 ||
    status ===
      503 ||
    status ===
      504
  );
}

export async function solanaRpcCall(
  method:
    string,

  params:
    unknown[],

  options:
    SolanaRpcOptions =
      {}
) {
  const providers =
    configuredProviders();

  if (
    providers.length ===
      0
  ) {
    throw new Error(
      "No Solana RPC provider is configured."
    );
  }

  const attempts =
    boundedAttempts(
      options
        .attemptsPerProvider
    );

  let lastError:
    Error | null =
      null;

  for (
    let providerIndex =
      0;
    providerIndex <
      providers.length;
    providerIndex +=
      1
  ) {
    const provider =
      providers[
        providerIndex
      ];

    for (
      let attempt =
        1;
      attempt <=
        attempts;
      attempt +=
        1
    ) {
      try {
        const response =
          await runWithProviderUsageHintsCore(
            {
              fallbackUsed:
                providerIndex >
                0,
            },

            () =>
              providerUsageFetch(
                {
                  provider:
                    provider.id,

                  operation:
                    `solana.rpc.${method}`,

                  attempt,
                },

                provider.url,

                () =>
                  fetch(
                    provider.url,
                    {
                      method:
                        "POST",

                      headers: {
                        "Content-Type":
                          "application/json",
                      },

                      body:
                        JSON.stringify({
                          jsonrpc:
                            "2.0",

                          id:
                            crypto.randomUUID(),

                          method,

                          params,
                        }),

                      cache:
                        "no-store",

                      signal:
                        AbortSignal.timeout(
                          15_000
                        ),
                    }
                  )
              )
          );

        if (
          !response.ok
        ) {
          lastError =
            new Error(
              `${provider.id} Solana RPC HTTP ${response.status}`
            );

          if (
            retryableStatus(
              response.status
            ) &&
            attempt <
              attempts
          ) {
            await sleep(
              250 *
                (
                  2 **
                  (
                    attempt -
                    1
                  )
                )
            );

            continue;
          }

          break;
        }

        const payload =
          await response
            .json();

        if (
          payload?.error
        ) {
          const message =
            typeof payload
              .error
              ?.message ===
              "string"
              ? payload
                  .error
                  .message
              : `${provider.id} Solana RPC error`;

          /*
           * Invalid JSON-RPC parameters indicate
           * an AYZO request bug.
           *
           * Never hide this behind another
           * provider's potentially different
           * behavior.
           */
          if (
            payload
              .error
              ?.code ===
              -32602
          ) {
            throw new NonRetryableSolanaRpcError(
              message
            );
          }

          lastError =
            new Error(
              message
            );

          break;
        }

        return payload
          ?.result;
      } catch (
        error
      ) {
        if (
          error instanceof
            NonRetryableSolanaRpcError
        ) {
          throw error;
        }

        lastError =
          error instanceof Error
            ? error
            : new Error(
                "Unknown Solana RPC error."
              );

        if (
          attempt <
            attempts
        ) {
          await sleep(
            250 *
              (
                2 **
                (
                  attempt -
                  1
                )
              )
          );

          continue;
        }

        break;
      }
    }
  }

  throw (
    lastError ??
    new Error(
      "Solana RPC request failed."
    )
  );
}
