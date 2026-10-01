import {
  Buffer,
} from "node:buffer";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {
  normalizeInjectiveAddress,
} from "./address";

import type {
  InjectiveQuickNodeRawResult,
} from "./indexer";

/*
 * Minimal pinned reflection schema for the single
 * production RPC AYZO consumes.
 *
 * Wire field numbers match Injective Explorer:
 * injective_explorer_rpc.InjectiveExplorerRPC/GetAccountTxsV2
 *
 * Unknown protobuf response fields are safely ignored.
 */
const QUICKNODE_SCHEMA = {
  nested: {
    injective_explorer_rpc: {
      nested: {
        InjectiveExplorerRPC: {
          methods: {
            GetAccountTxsV2: {
              requestType:
                "GetAccountTxsV2Request",

              responseType:
                "GetAccountTxsV2Response",
            },
          },
        },

        GetAccountTxsV2Request: {
          fields: {
            address: {
              type:
                "string",

              id:
                1,
            },

            type: {
              type:
                "string",

              id:
                2,
            },

            startTime: {
              type:
                "sint64",

              id:
                3,
            },

            endTime: {
              type:
                "sint64",

              id:
                4,
            },

            perPage: {
              type:
                "sint32",

              id:
                5,
            },

            token: {
              type:
                "string",

              id:
                6,
            },
          },
        },

        GetAccountTxsV2Response: {
          fields: {
            paging: {
              type:
                "Cursor",

              id:
                1,
            },

            data: {
              rule:
                "repeated",

              type:
                "TxDetailData",

              id:
                2,
            },
          },
        },

        Cursor: {
          fields: {
            next: {
              rule:
                "repeated",

              type:
                "string",

              id:
                1,
            },
          },
        },

        /*
         * AYZO deliberately declares only fields it
         * consumes. Protobuf unknown fields are ignored.
         */
        TxDetailData: {
          fields: {
            blockNumber: {
              type:
                "uint64",

              id:
                2,
            },

            blockTimestamp: {
              type:
                "string",

              id:
                3,
            },

            hash: {
              type:
                "string",

              id:
                4,
            },

            code: {
              type:
                "uint32",

              id:
                5,
            },

            messages: {
              type:
                "bytes",

              id:
                15,
            },

            blockUnixTimestamp: {
              type:
                "uint64",

              id:
                19,
            },
          },
        },
      },
    },
  },
} as const;

type JsonRecord =
  Record<string, unknown>;

type AccountTxsMethod =
  (
    request:
      Record<string, unknown>,

    metadata:
      grpc.Metadata,

    options:
      grpc.CallOptions,

    callback:
      (
        error:
          grpc.ServiceError |
          null,

        response?:
          unknown
      ) => void
  ) => grpc.ClientUnaryCall;

type ExplorerClient =
  grpc.Client & {
    GetAccountTxsV2?:
      AccountTxsMethod;

    getAccountTxsV2?:
      AccountTxsMethod;
  };

type ExplorerClientConstructor =
  new (
    address:
      string,

    credentials:
      grpc.ChannelCredentials
  ) => ExplorerClient;

export type InjectiveQuickNodeRpcCall =
  (
    input: {
      grpcEndpoint:
        string;

      token:
        string;

      address:
        string;

      limit:
        number;

      timeoutMs:
        number;
    }
  ) => Promise<unknown>;

export type InjectiveQuickNodeDependencies = {
  rpcCall?:
    InjectiveQuickNodeRpcCall;
};

let clientConstructor:
  ExplorerClientConstructor |
  null =
    null;

function record(
  value:
    unknown
): JsonRecord | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  )
    ? value as
        JsonRecord
    : null;
}

function array(
  value:
    unknown
) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function text(
  value:
    unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function getClientConstructor():
  ExplorerClientConstructor {
  if (clientConstructor) {
    return clientConstructor;
  }

  const definition =
    protoLoader.fromJSON(
      QUICKNODE_SCHEMA as unknown as
        Parameters<
          typeof protoLoader.fromJSON
        >[0],
      {
        longs:
          String,

        defaults:
          true,

        arrays:
          true,

        objects:
          true,
      }
    );

  const loaded =
    grpc.loadPackageDefinition(
      definition
    ) as unknown as
      Record<
        string,
        unknown
      >;

  const namespace =
    record(
      loaded
        .injective_explorer_rpc
    );

  const constructor =
    namespace
      ?.InjectiveExplorerRPC;

  if (
    typeof constructor !==
      "function"
  ) {
    throw new Error(
      "Injective QuickNode Explorer gRPC service is unavailable."
    );
  }

  clientConstructor =
    constructor as unknown as
      ExplorerClientConstructor;

  return clientConstructor;
}

function decodeMessages(
  value:
    unknown
): unknown[] {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return [];
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  let raw:
    string;

  if (
    Buffer.isBuffer(
      value
    )
  ) {
    raw =
      value.toString(
        "utf8"
      );
  } else if (
    value instanceof
      Uint8Array
  ) {
    raw =
      Buffer
        .from(
          value
        )
        .toString(
          "utf8"
        );
  } else if (
    typeof value ===
      "string"
  ) {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed =
        JSON.parse(
          trimmed
        );

      if (
        Array.isArray(
          parsed
        )
      ) {
        return parsed;
      }
    } catch {
      // Try protobuf bytes rendered as Base64.
    }

    raw =
      Buffer
        .from(
          trimmed,
          "base64"
        )
        .toString(
          "utf8"
        );
  } else {
    throw new Error(
      "Unsupported Injective QuickNode messages representation."
    );
  }

  const normalized =
    raw.trim();

  if (!normalized) {
    return [];
  }

  const parsed =
    JSON.parse(
      normalized
    );

  if (
    !Array.isArray(
      parsed
    )
  ) {
    throw new Error(
      "Injective QuickNode messages bytes did not decode to an array."
    );
  }

  return parsed;
}

function normalizeResponse(
  value:
    unknown
): JsonRecord {
  const root =
    record(
      value
    );

  if (
    !root ||
    !Array.isArray(
      root.data
    )
  ) {
    throw new Error(
      "Injective QuickNode returned malformed account history."
    );
  }

  const paging =
    record(
      root.paging
    );

  const next =
    array(
      paging?.next
    )
      .map(
        text
      )
      .filter(
        (
          item
        ): item is string =>
          item !== null
      );

  const data:
    JsonRecord[] =
      [];

  for (
    const item of
    root.data
  ) {
    const row =
      record(
        item
      );

    if (!row) {
      continue;
    }

    data.push({
      block_number:
        row.blockNumber ??
        row.block_number ??
        null,

      block_timestamp:
        row.blockTimestamp ??
        row.block_timestamp ??
        null,

      block_unix_timestamp:
        row.blockUnixTimestamp ??
        row.block_unix_timestamp ??
        null,

      hash:
        row.hash ??
        null,

      code:
        row.code ??
        null,

      messages:
        decodeMessages(
          row.messages
        ),
    });
  }

  return {
    paging: {
      next,
    },

    data,
  };
}

function mapGrpcCode(
  error:
    unknown
):
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UPSTREAM_ERROR" {
  const code =
    (
      typeof error ===
        "object" &&
      error !== null &&
      "code" in error
    )
      ? (
          error as {
            code?:
              unknown;
          }
        ).code
      : null;

  if (
    code ===
      grpc.status
        .DEADLINE_EXCEEDED
  ) {
    return "TIMEOUT";
  }

  if (
    code ===
      grpc.status
        .NOT_FOUND
  ) {
    return "NOT_FOUND";
  }

  if (
    code ===
      grpc.status
        .RESOURCE_EXHAUSTED
  ) {
    return "RATE_LIMITED";
  }

  return "UPSTREAM_ERROR";
}

async function callQuickNode(
  {
    grpcEndpoint,
    token,
    address,
    limit,
    timeoutMs,
  }: {
    grpcEndpoint:
      string;

    token:
      string;

    address:
      string;

    limit:
      number;

    timeoutMs:
      number;
  }
): Promise<unknown> {
  const Constructor =
    getClientConstructor();

  const client =
    new Constructor(
      grpcEndpoint,
      grpc.credentials
        .createSsl()
    );

  const metadata =
    new grpc.Metadata();

  metadata.add(
    "x-token",
    token
  );

  try {
    const method =
      client
        .GetAccountTxsV2 ??
      client
        .getAccountTxsV2;

    if (!method) {
      throw new Error(
        "GetAccountTxsV2 method is unavailable."
      );
    }

    return await new Promise<
      unknown
    >(
      (
        resolve,
        reject
      ) => {
        method.call(
          client,
          {
            address,

            perPage:
              limit,
          },
          metadata,
          {
            deadline:
              new Date(
                Date.now() +
                timeoutMs
              ),
          },
          (
            error,
            response
          ) => {
            if (error) {
              reject(
                error
              );

              return;
            }

            resolve(
              response
            );
          }
        );
      }
    );
  } finally {
    client.close();
  }
}

export async function getInjectiveQuickNodeRawHistory(
  {
    grpcEndpoint,
    token,
    address,
    limit,
    timeoutMs,
  }: {
    grpcEndpoint:
      string;

    token:
      string;

    address:
      string;

    limit:
      number;

    timeoutMs:
      number;
  },
  deps:
    InjectiveQuickNodeDependencies =
      {}
): Promise<
  InjectiveQuickNodeRawResult
> {
  const normalized =
    normalizeInjectiveAddress(
      address
    );

  if (!normalized) {
    return {
      ok:
        false,

      code:
        "INVALID_ADDRESS",

      error:
        "Invalid Injective mainnet account address.",
    };
  }

  if (
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.injective-mainnet\.quiknode\.pro:443$/i
      .test(
        grpcEndpoint
      )
  ) {
    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "Injective QuickNode gRPC endpoint is not a trusted Mainnet endpoint.",
    };
  }

  if (!token.trim()) {
    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "Injective QuickNode token is not configured.",
    };
  }

  if (
    !Number.isSafeInteger(
      limit
    ) ||
    limit < 1 ||
    limit > 200
  ) {
    return {
      ok:
        false,

      code:
        "UPSTREAM_ERROR",

      error:
        "Injective QuickNode history limit is invalid.",
    };
  }

  try {
    const response =
      await (
        deps.rpcCall ??
        callQuickNode
      )({
        grpcEndpoint,
        token,
        address:
          normalized,
        limit,
        timeoutMs,
      });

    try {
      return {
        ok:
          true,

        data:
          normalizeResponse(
            response
          ),
      };
    } catch {
      return {
        ok:
          false,

        code:
          "MALFORMED_RESPONSE",

        error:
          "Injective QuickNode returned malformed indexed history.",
      };
    }
  } catch (
    error
  ) {
    return {
      ok:
        false,

      code:
        mapGrpcCode(
          error
        ),

      error:
        mapGrpcCode(
          error
        ) ===
          "TIMEOUT"
          ? "Injective QuickNode indexed-history request timed out."
          : "Injective QuickNode indexed-history request failed.",
    };
  }
}
