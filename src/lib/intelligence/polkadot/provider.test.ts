import assert from "node:assert/strict";
import test from "node:test";

import {
  getPolkadotEvidence,
} from "./provider";

const ADDRESS =
  "14RYaXRSqb9rPqMaAVp1UZW2czQ6dMNGMbvukwfifi6m8ZgZ";

const OTHER =
  "15oF4uVJwmo9ySm1gCBpQxkLwUDSS6hRkTfshKkL4iVkaqNB";

function json(
  body:
    unknown,
  status =
    200
) {
  return new Response(
    JSON.stringify(
      body
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
}

function sidecarResponse() {
  return {
    nonce:
      "1",

    tokenSymbol:
      "DOT",

    free:
      "10000000000",

    reserved:
      "0",

    frozen:
      "0",

    transferable:
      "10000000000",

    at: {
      height:
        33242792,

      hash:
        "0xabc",
    },
  };
}

function indexedResponse(
  pathname:
    string
) {
  if (
    pathname.includes(
      "/api/v2/scan/transfers"
    )
  ) {
    return {
      data: {
        transfers: [
          {
            from:
              OTHER,

            to:
              ADDRESS,

            amount:
              "1000000000",

            block_num:
              123,

            block_timestamp:
              1790812800,

            extrinsic_index:
              "123-1",

            hash:
              "0xtransfer",

            success:
              true,
          },
        ],
      },
    };
  }

  if (
    pathname.includes(
      "/api/v2/scan/extrinsics"
    )
  ) {
    return {
      data: {
        extrinsics: [
          {
            call_module:
              "balances",

            call_module_function:
              "transfer_keep_alive",

            block_num:
              123,

            block_timestamp:
              1790812800,

            extrinsic_index:
              "123-1",

            extrinsic_hash:
              "0xextrinsic",

            success:
              true,

            fee:
              "1000",
          },
        ],
      },
    };
  }

  if (
    pathname.includes(
      "/api/scan/staking/nominator"
    )
  ) {
    return {
      data: {
        status:
          "active",

        bonded:
          "10000000000",

        nominator_stash:
          ADDRESS,

        staking_info: {
          controller:
            ADDRESS,

          reward_account:
            ADDRESS,
        },
      },
    };
  }

  if (
    pathname.includes(
      "/api/scan/proxy/extrinsics"
    )
  ) {
    return {
      data: {
        extrinsics: [
          {
            account_display: {
              address:
                ADDRESS,
            },

            real_account_display: {
              address:
                OTHER,
            },

            call_module:
              "proxy",

            call_module_function:
              "proxy",

            extrinsic_index:
              "124-1",

            block_timestamp:
              1790812810,
          },
        ],
      },
    };
  }

  if (
    pathname.includes(
      "/api/scan/multisigs/details"
    )
  ) {
    return {
      data: {
        multisig: [
          {
            multi_id:
              "multi-1",

            account_display: {
              address:
                ADDRESS,
            },

            multi_account_display: {
              address:
                OTHER,
            },

            status:
              "executed",

            confirm_extrinsic_idx:
              "125-1",

            timestamp:
              1790812820,
          },
        ],
      },
    };
  }

  throw new Error(
    `Unexpected indexed path: ${pathname}`
  );
}

test(
  "Polkadot uses PubFi Subscan free routes with Bearer authentication",
  async () => {
    const indexedCalls:
      {
        pathname:
          string;

        authorization:
          string | null;

        subscanKey:
          string | null;

        body:
          unknown;
      }[] = [];

    const result =
      await getPolkadotEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async (
              input,
              init
            ) => {
              const url =
                new URL(
                  input
                );

              if (
                url.host ===
                  "sidecar.test"
              ) {
                return json(
                  sidecarResponse()
                );
              }

              assert.equal(
                url.host,
                "api.pubfi.test"
              );

              assert.ok(
                url.pathname.startsWith(
                  "/v1/gateway/subscan/polkadot/"
                )
              );

              assert.ok(
                url.pathname.endsWith(
                  ":free"
                )
              );

              const headers =
                new Headers(
                  init?.headers
                );

              indexedCalls.push({
                pathname:
                  url.pathname,

                authorization:
                  headers.get(
                    "Authorization"
                  ),

                subscanKey:
                  headers.get(
                    "X-API-Key"
                  ),

                body:
                  init?.body
                    ? JSON.parse(
                        String(
                          init.body
                        )
                      )
                    : null,
              });

              return json(
                indexedResponse(
                  url.pathname
                )
              );
            },

          sidecarUrl:
            "https://sidecar.test",

          pubfiUrl:
            "https://api.pubfi.test",

          pubfiApiKey:
            "test-pubfi-key",

          pubfiFreeRequestDelayMs:
            0,

          subscanUrl:
            "https://subscan.test",

          subscanApiKey:
            null,

          timeoutMs:
            2_000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    assert.equal(
      result.providerId,
      "polkadot-sidecar-pubfi"
    );

    assert.equal(
      indexedCalls.length,
      5
    );

    for (
      const call of
      indexedCalls
    ) {
      assert.equal(
        call.authorization,
        "Bearer test-pubfi-key"
      );

      assert.equal(
        call.subscanKey,
        null
      );
    }

    assert.equal(
      result.data
        .transfers
        .length,
      1
    );

    assert.equal(
      result.data
        .extrinsics
        .length,
      1
    );

    assert.ok(
      result.data.staking
    );

    assert.equal(
      result.data
        .proxies
        .length,
      1
    );

    assert.equal(
      result.data
        .multisig
        .length,
      1
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestsUsed,
      6
    );

    assert.equal(
      result.data
        .coverage
        .indexedProviderConfigured,
      true
    );

    assert.deepEqual(
      result.data
        .coverage
        .unavailableEvidence,
      []
    );
  }
);

test(
  "Polkadot preserves direct Subscan X-API-Key compatibility when PubFi is absent",
  async () => {
    const auth:
      {
        bearer:
          string | null;

        subscan:
          string | null;
      }[] = [];

    const result =
      await getPolkadotEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async (
              input,
              init
            ) => {
              const url =
                new URL(
                  input
                );

              if (
                url.host ===
                  "sidecar.test"
              ) {
                return json(
                  sidecarResponse()
                );
              }

              assert.equal(
                url.host,
                "subscan.test"
              );

              assert.equal(
                url.pathname.includes(
                  ":free"
                ),
                false
              );

              const headers =
                new Headers(
                  init?.headers
                );

              auth.push({
                bearer:
                  headers.get(
                    "Authorization"
                  ),

                subscan:
                  headers.get(
                    "X-API-Key"
                  ),
              });

              return json(
                indexedResponse(
                  url.pathname
                )
              );
            },

          sidecarUrl:
            "https://sidecar.test",

          pubfiUrl:
            "https://api.pubfi.test",

          pubfiApiKey:
            null,

          pubfiFreeRequestDelayMs:
            0,

          subscanUrl:
            "https://subscan.test",

          subscanApiKey:
            "legacy-test-key",

          timeoutMs:
            2_000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    assert.equal(
      result.providerId,
      "polkadot-sidecar-subscan"
    );

    assert.equal(
      auth.length,
      5
    );

    for (
      const headers of
      auth
    ) {
      assert.equal(
        headers.bearer,
        null
      );

      assert.equal(
        headers.subscan,
        "legacy-test-key"
      );
    }
  }
);

test(
  "Polkadot fails closed to explicit unavailable indexed modules without credentials",
  async () => {
    let requests =
      0;

    const result =
      await getPolkadotEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async input => {
              requests +=
                1;

              const url =
                new URL(
                  input
                );

              assert.equal(
                url.host,
                "sidecar.test"
              );

              return json(
                sidecarResponse()
              );
            },

          sidecarUrl:
            "https://sidecar.test",

          pubfiUrl:
            "https://api.pubfi.test",

          pubfiApiKey:
            null,

          pubfiFreeRequestDelayMs:
            0,

          subscanUrl:
            "https://subscan.test",

          subscanApiKey:
            null,

          timeoutMs:
            2_000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    assert.equal(
      requests,
      1
    );

    assert.equal(
      result.providerId,
      "polkadot-sidecar"
    );

    assert.equal(
      result.data
        .coverage
        .indexedProviderConfigured,
      false
    );

    assert.deepEqual(
      result.data
        .coverage
        .unavailableEvidence,
      [
        "indexed_transfer_history",
        "extrinsic_history",
        "staking_details",
        "proxy_evidence",
        "multisig_evidence",
      ]
    );
  }
);


test(
  "Polkadot paginates PubFi Advanced depth without exceeding the free row limit",
  async () => {
    const indexedCalls:
      {
        pathname:
          string;

        body:
          Record<
            string,
            unknown
          >;
      }[] = [];

    const result =
      await getPolkadotEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "advanced",
        },
        {
          fetchImpl:
            async (
              input,
              init
            ) => {
              const url =
                new URL(
                  input
                );

              if (
                url.host ===
                  "sidecar.test"
              ) {
                return json(
                  sidecarResponse()
                );
              }

              assert.equal(
                url.host,
                "api.pubfi.test"
              );

              const body =
                JSON.parse(
                  String(
                    init?.body ??
                    "{}"
                  )
                ) as
                  Record<
                    string,
                    unknown
                  >;

              indexedCalls.push({
                pathname:
                  url.pathname,

                body,
              });

              const indexed =
                indexedResponse(
                  url.pathname
                ) as {
                  data:
                    Record<
                      string,
                      unknown
                    >;
                };

              const data = {
                ...indexed.data,
              };

              const row =
                typeof body.row ===
                  "number"
                  ? body.row
                  : null;

              if (
                row !==
                  null
              ) {
                for (
                  const key of [
                    "transfers",
                    "extrinsics",
                    "multisig",
                  ]
                ) {
                  const source =
                    data[key];

                  if (
                    Array.isArray(
                      source
                    ) &&
                    source.length >
                      0
                  ) {
                    data[key] =
                      Array.from(
                        {
                          length:
                            row,
                        },
                        () =>
                          source[0]
                      );
                  }
                }
              }

              return json({
                code:
                  0,

                message:
                  "Success",

                data,
              });
            },

          sidecarUrl:
            "https://sidecar.test",

          pubfiUrl:
            "https://api.pubfi.test",

          pubfiApiKey:
            "test-pubfi-key",

          pubfiFreeRequestDelayMs:
            0,

          subscanUrl:
            "https://subscan.test",

          subscanApiKey:
            null,

          timeoutMs:
            2_000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    const paged =
      indexedCalls
        .filter(
          call =>
            typeof call
              .body
              .row ===
              "number"
        );

    for (
      const call of
      paged
    ) {
      assert.ok(
        (
          call.body.row as
            number
        ) <= 20
      );
    }

    const transfers =
      indexedCalls.filter(
        call =>
          call.pathname
            .includes(
              "/api/v2/scan/transfers"
            )
      );

    const extrinsics =
      indexedCalls.filter(
        call =>
          call.pathname
            .includes(
              "/api/v2/scan/extrinsics"
            )
      );

    const proxies =
      indexedCalls.filter(
        call =>
          call.pathname
            .includes(
              "/api/scan/proxy/extrinsics"
            )
      );

    const multisig =
      indexedCalls.filter(
        call =>
          call.pathname
            .includes(
              "/api/scan/multisigs/details"
            )
      );

    assert.deepEqual(
      transfers.map(
        call =>
          call.body.page
      ),
      [
        0, 1, 2, 3, 4,
        5, 6, 7, 8, 9,
      ]
    );

    assert.deepEqual(
      extrinsics.map(
        call =>
          call.body.page
      ),
      [
        0, 1, 2, 3, 4,
        5, 6, 7, 8, 9,
      ]
    );

    assert.deepEqual(
      proxies.map(
        call =>
          call.body.row
      ),
      [
        20,
        20,
        20,
        4,
      ]
    );

    assert.deepEqual(
      multisig.map(
        call =>
          call.body.row
      ),
      [
        20,
        20,
        20,
        4,
      ]
    );

    assert.equal(
      indexedCalls.length,
      29
    );

    assert.equal(
      result.data
        .transfers
        .length,
      200
    );

    assert.equal(
      result.data
        .extrinsics
        .length,
      200
    );

    assert.equal(
      result.data
        .proxies
        .length,
      64
    );

    assert.equal(
      result.data
        .multisig
        .length,
      64
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestsUsed,
      30
    );

    assert.equal(
      result.data
        .coverage
        .providerRequestBudget,
      32
    );

    assert.deepEqual(
      result.data
        .coverage
        .unavailableEvidence,
      []
    );

    assert.equal(
      result.data
        .coverage
        .coverage,
      "complete"
    );
  }
);

test(
  "Polkadot fails closed on HTTP 200 Subscan logical errors",
  async () => {
    const result =
      await getPolkadotEvidence(
        {
          address:
            ADDRESS,

          analysisPlan:
            "free",
        },
        {
          fetchImpl:
            async (
              input
            ) => {
              const url =
                new URL(
                  input
                );

              if (
                url.host ===
                  "sidecar.test"
              ) {
                return json(
                  sidecarResponse()
                );
              }

              if (
                url.pathname
                  .includes(
                    "/api/v2/scan/transfers"
                  )
              ) {
                return json({
                  code:
                    403,

                  message:
                    "row_limit_exceeded",

                  data:
                    null,
                });
              }

              const indexed =
                indexedResponse(
                  url.pathname
                ) as {
                  data:
                    Record<
                      string,
                      unknown
                    >;
                };

              return json({
                code:
                  0,

                message:
                  "Success",

                data:
                  indexed.data,
              });
            },

          sidecarUrl:
            "https://sidecar.test",

          pubfiUrl:
            "https://api.pubfi.test",

          pubfiApiKey:
            "test-pubfi-key",

          pubfiFreeRequestDelayMs:
            0,

          subscanUrl:
            "https://subscan.test",

          subscanApiKey:
            null,

          timeoutMs:
            2_000,
        }
      );

    assert.equal(
      result.ok,
      true
    );

    if (!result.ok) {
      return;
    }

    assert.equal(
      result.data
        .transfers
        .length,
      0
    );

    assert.ok(
      result.data
        .coverage
        .unavailableEvidence
        .includes(
          "indexed_transfer_history"
        )
    );

    assert.equal(
      result.data
        .coverage
        .coverage,
      "partial"
    );
  }
);
