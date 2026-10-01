import type {
  AnalysisDepthPlan,
} from "@/lib/analysisDepthPolicy";

export type CosmosSdkNetwork =
  | "cosmos"
  | "injective";

export type CosmosSdkCoin = {
  denom:
    string;

  amount:
    string;
};

export type CosmosSdkMessageEvidence = {
  typeUrl:
    string;

  sender:
    string | null;

  recipient:
    string | null;

  validatorAddress:
    string | null;

  sourcePort:
    string | null;

  sourceChannel:
    string | null;

  contractAddress:
    string | null;

  coins:
    readonly CosmosSdkCoin[];
};

export type CosmosSdkTransactionEvidence = {
  hash:
    string;

  height:
    number | null;

  timestamp:
    string | null;

  code:
    number | null;

  messages:
    readonly CosmosSdkMessageEvidence[];
};

export type CosmosSdkDelegationEvidence = {
  validatorAddress:
    string;

  shares:
    string | null;

  balance:
    CosmosSdkCoin | null;
};

export type CosmosSdkPolicy = {
  transactionLimit:
    number;

  balanceLimit:
    number;

  delegationLimit:
    number;

  graphMaxNodes:
    number;

  graphMaxEdges:
    number;

  timelineMaxEvents:
    number;

  providerRequestBudget:
    number;
};

export function getCosmosSdkPolicy(
  plan:
    AnalysisDepthPlan
): CosmosSdkPolicy {
  if (
    plan ===
      "advanced"
  ) {
    return {
      transactionLimit:
        180,

      balanceLimit:
        120,

      delegationLimit:
        120,

      graphMaxNodes:
        180,

      graphMaxEdges:
        360,

      timelineMaxEvents:
        240,

      providerRequestBudget:
        14,
    };
  }

  if (
    plan ===
      "pro"
  ) {
    return {
      transactionLimit:
        64,

      balanceLimit:
        48,

      delegationLimit:
        48,

      graphMaxNodes:
        72,

      graphMaxEdges:
        128,

      timelineMaxEvents:
        96,

      providerRequestBudget:
        12,
    };
  }

  return {
    transactionLimit:
      20,

    balanceLimit:
      20,

    delegationLimit:
      20,

    graphMaxNodes:
      24,

    graphMaxEdges:
      40,

    timelineMaxEvents:
      24,

    providerRequestBudget:
      10,
  };
}

type JsonRecord =
  Record<string, unknown>;

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

function integer(
  value:
    unknown
) {
  if (
    typeof value ===
      "number" &&
    Number.isSafeInteger(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    /^\d+$/.test(
      value
    )
  ) {
    const parsed =
      Number(value);

    return Number.isSafeInteger(
      parsed
    )
      ? parsed
      : null;
  }

  return null;
}

function coin(
  value:
    unknown
): CosmosSdkCoin | null {
  const row =
    record(
      value
    );

  const denom =
    text(
      row?.denom
    );

  const amount =
    text(
      row?.amount
    );

  if (
    !denom ||
    !amount ||
    !/^-?\d+(?:\.\d+)?$/.test(
      amount
    )
  ) {
    return null;
  }

  return {
    denom,
    amount,
  };
}

function coins(
  value:
    unknown
): CosmosSdkCoin[] {
  if (
    Array.isArray(
      value
    )
  ) {
    return value
      .map(
        coin
      )
      .filter(
        (
          item
        ): item is CosmosSdkCoin =>
          item !== null
      );
  }

  const single =
    coin(
      value
    );

  return single
    ? [
        single,
      ]
    : [];
}

function nestedText(
  value:
    unknown,
  keys:
    readonly string[],
  depth =
    0
): string | null {
  if (
    depth >
      6
  ) {
    return null;
  }

  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  for (
    const key of
    keys
  ) {
    const direct =
      text(
        row[key]
      );

    if (direct) {
      return direct;
    }
  }

  for (
    const child of
    Object.values(
      row
    )
  ) {
    const found =
      nestedText(
        child,
        keys,
        depth +
          1
      );

    if (found) {
      return found;
    }
  }

  return null;
}

function parseMessage(
  value:
    unknown
): CosmosSdkMessageEvidence | null {
  const row =
    record(
      value
    );

  if (!row) {
    return null;
  }

  const typeUrl =
    text(
      row["@type"]
    ) ??
    text(
      row.type
    );

  if (!typeUrl) {
    return null;
  }

  const token =
    record(
      row.token
    );

  const messageCoins =
    coins(
      row.amount
    );

  if (
    messageCoins.length ===
      0 &&
    token
  ) {
    const parsed =
      coin(
        token
      );

    if (parsed) {
      messageCoins.push(
        parsed
      );
    }
  }

  return {
    typeUrl,

    sender:
      text(
        row.from_address
      ) ??
      text(
        row.sender
      ) ??
      text(
        row.delegator_address
      ) ??
      text(
        row.creator
      ),

    recipient:
      text(
        row.to_address
      ) ??
      text(
        row.receiver
      ) ??
      text(
        row.recipient
      ),

    validatorAddress:
      text(
        row.validator_address
      ) ??
      text(
        row.validator_src_address
      ) ??
      text(
        row.validator_dst_address
      ),

    sourcePort:
      text(
        row.source_port
      ),

    sourceChannel:
      text(
        row.source_channel
      ),

    contractAddress:
      text(
        row.contract
      ) ??
      text(
        row.contract_address
      ),

    coins:
      messageCoins,
  };
}

function parseTransactions(
  payload:
    JsonRecord
): CosmosSdkTransactionEvidence[] {
  const txs =
    array(
      payload.txs
    );

  const responses =
    array(
      payload
        .tx_responses
    );

  const count =
    Math.max(
      txs.length,
      responses.length
    );

  const result:
    CosmosSdkTransactionEvidence[] =
      [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const tx =
      record(
        txs[index]
      );

    const response =
      record(
        responses[
          index
        ]
      );

    const body =
      record(
        tx?.body
      );

    const hash =
      text(
        response?.txhash
      );

    if (!hash) {
      continue;
    }

    result.push({
      hash,

      height:
        integer(
          response?.height
        ),

      timestamp:
        text(
          response?.timestamp
        ),

      code:
        integer(
          response?.code
        ),

      messages:
        array(
          body?.messages
        )
          .map(
            parseMessage
          )
          .filter(
            (
              item
            ): item is CosmosSdkMessageEvidence =>
              item !== null
          ),
    });
  }

  return result;
}

export type CosmosSdkEvidence = {
  network:
    CosmosSdkNetwork;

  address:
    string;

  analysisPlan:
    AnalysisDepthPlan;

  accountNumber:
    string | null;

  sequence:
    string | null;

  balances:
    readonly CosmosSdkCoin[];

  delegations:
    readonly CosmosSdkDelegationEvidence[];

  rewards:
    readonly CosmosSdkCoin[];

  transactions:
    readonly CosmosSdkTransactionEvidence[];

  coverage: {
    plan:
      AnalysisDepthPlan;

    transactionLimit:
      number;

    balanceLimit:
      number;

    delegationLimit:
      number;

    providerRequestBudget:
      number;

    providerRequestsUsed:
      number;

    transportFailoverUsed:
      boolean;

    unavailableEvidence:
      readonly string[];

    coverage:
      "complete" |
      "partial";
  };
};

export type CosmosSdkProviderResult =
  | {
      ok:
        true;

      providerId:
        string;

      latencyMs:
        number;

      data:
        CosmosSdkEvidence;
    }
  | {
      ok:
        false;

      providerId:
        string;

      latencyMs:
        number | null;

      code:
        | "INVALID_ADDRESS"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "TIMEOUT"
        | "UPSTREAM_ERROR"
        | "MALFORMED_RESPONSE";

      error:
        string;
    };

type FetchLike =
  (
    input:
      string,
    init?:
      RequestInit
  ) => Promise<{
    ok:
      boolean;

    status:
      number;

    json():
      Promise<unknown>;
  }>;

export async function loadCosmosSdkEvidence(
  {
    network,
    address,
    analysisPlan,
    validator,
    providerId,
    baseUrls,
    includeTransactionHistory =
      true,
  }: {
    network:
      CosmosSdkNetwork;

    address:
      string;

    analysisPlan:
      AnalysisDepthPlan;

    validator(
      value:
        string
    ):
      string | null;

    providerId:
      string;

    baseUrls:
      readonly string[];

    includeTransactionHistory?:
      boolean;
  },
  deps: {
    fetchImpl?:
      FetchLike;

    timeoutMs?:
      number;
  } = {}
): Promise<
  CosmosSdkProviderResult
> {
  const started =
    Date.now();

  const normalized =
    validator(
      address
    );

  if (!normalized) {
    return {
      ok:
        false,

      providerId,

      latencyMs:
        0,

      code:
        "INVALID_ADDRESS",

      error:
        `Invalid ${network} account address.`,
    };
  }

  const policy =
    getCosmosSdkPolicy(
      analysisPlan
    );

  const fetchImpl =
    deps.fetchImpl ??
    fetch;

  const timeoutMs =
    deps.timeoutMs ??
    12_000;

  let requestsUsed =
    0;

  const usedBases =
    new Set<string>();

  const unavailable:
    string[] = [];

  const request =
    async (
      path:
        string
    ): Promise<
      | {
          ok:
            true;

          data:
            JsonRecord;

          baseUrl:
            string;
        }
      | {
          ok:
            false;

          code:
            "NOT_FOUND" |
            "RATE_LIMITED" |
            "TIMEOUT" |
            "UPSTREAM_ERROR" |
            "MALFORMED_RESPONSE";

          error:
            string;
        }
    > => {
      let last:
        | {
            ok:
              false;

            code:
              "NOT_FOUND" |
              "RATE_LIMITED" |
              "TIMEOUT" |
              "UPSTREAM_ERROR" |
              "MALFORMED_RESPONSE";

            error:
              string;
          }
        | null =
          null;

      for (
        const rawBase of
        baseUrls
      ) {
        if (
          requestsUsed >=
            policy
              .providerRequestBudget
        ) {
          break;
        }

        const base =
          rawBase.replace(
            /\/+$/,
            ""
          );

        if (!base) {
          continue;
        }

        requestsUsed +=
          1;

        const controller =
          new AbortController();

        const timer =
          setTimeout(
            () =>
              controller.abort(),
            timeoutMs
          );

        try {
          const response =
            await fetchImpl(
              `${base}${path}`,
              {
                method:
                  "GET",

                headers: {
                  Accept:
                    "application/json",

                  "User-Agent":
                    "AYZO/1.0 (+https://ayzo.io)",
                },

                cache:
                  "no-store",

                signal:
                  controller
                    .signal,
              }
            );

          if (!response.ok) {
            last = {
              ok:
                false,

              code:
                response.status ===
                  404
                  ? "NOT_FOUND"
                  : (
                      response.status ===
                        402 ||
                      response.status ===
                        403 ||
                      response.status ===
                        429
                    )
                    ? "RATE_LIMITED"
                    : "UPSTREAM_ERROR",

              error:
                `${providerId} HTTP ${response.status}.`,
            };

            continue;
          }

          const raw =
            await response.json();

          const data =
            record(
              raw
            );

          if (!data) {
            last = {
              ok:
                false,

              code:
                "MALFORMED_RESPONSE",

              error:
                `${providerId} returned malformed JSON.`,
            };

            continue;
          }

          usedBases.add(
            base
          );

          return {
            ok:
              true,

            data,

            baseUrl:
              base,
          };
        } catch (
          error
        ) {
          last = {
            ok:
              false,

            code:
              error instanceof
                  Error &&
                error.name ===
                  "AbortError"
                ? "TIMEOUT"
                : "UPSTREAM_ERROR",

            error:
              error instanceof
                  Error &&
                error.name ===
                  "AbortError"
                ? `${providerId} timed out.`
                : `${providerId} request failed.`,
          };
        } finally {
          clearTimeout(
            timer
          );
        }
      }

      return last ?? {
        ok:
          false,

        code:
          "UPSTREAM_ERROR",

        error:
          `${providerId} request budget exhausted.`,
      };
    };

  const encoded =
    encodeURIComponent(
      normalized
    );

  const accountResult =
    await request(
      `/cosmos/auth/v1beta1/accounts/${encoded}`
    );

  if (!accountResult.ok) {
    return {
      ok:
        false,

      providerId,

      latencyMs:
        Date.now() -
        started,

      code:
        accountResult.code,

      error:
        accountResult.error,
    };
  }

  const balanceResult =
    await request(
      `/cosmos/bank/v1beta1/balances/${encoded}?pagination.limit=${policy.balanceLimit}`
    );

  const delegationResult =
    await request(
      `/cosmos/staking/v1beta1/delegations/${encoded}?pagination.limit=${policy.delegationLimit}`
    );

  const rewardResult =
    await request(
      `/cosmos/distribution/v1beta1/delegators/${encoded}/rewards`
    );

  const historyResults:
    Array<
      Awaited<
        ReturnType<
          typeof request
        >
      >
    > =
      [];

  if (
    includeTransactionHistory
  ) {
    const senderParams =
      new URLSearchParams();

    senderParams.set(
      "query",
      `message.sender='${normalized}'`
    );

    senderParams.set(
      "page",
      "1"
    );

    senderParams.set(
      "limit",
      String(
        Math.max(
          1,
          Math.ceil(
            policy
              .transactionLimit /
              2
          )
        )
      )
    );

    senderParams.set(
      "order_by",
      "ORDER_BY_DESC"
    );

    const recipientParams =
      new URLSearchParams();

    recipientParams.set(
      "query",
      `transfer.recipient='${normalized}'`
    );

    recipientParams.set(
      "page",
      "1"
    );

    recipientParams.set(
      "limit",
      String(
        Math.max(
          1,
          Math.ceil(
            policy
              .transactionLimit /
              2
          )
        )
      )
    );

    recipientParams.set(
      "order_by",
      "ORDER_BY_DESC"
    );

    historyResults.push(
      await request(
        `/cosmos/tx/v1beta1/txs?${senderParams.toString()}`
      ),

      await request(
        `/cosmos/tx/v1beta1/txs?${recipientParams.toString()}`
      )
    );
  }

  const balances =
    balanceResult.ok
      ? array(
          balanceResult
            .data.balances
        )
          .map(
            coin
          )
          .filter(
            (
              item
            ): item is CosmosSdkCoin =>
              item !== null
          )
          .slice(
            0,
            policy
              .balanceLimit
          )
      : [];

  if (
    !balanceResult.ok
  ) {
    unavailable.push(
      "balances"
    );
  }

  const delegations =
    delegationResult.ok
      ? array(
          delegationResult
            .data[
            "delegation_responses"
          ]
        )
          .map(
            item => {
              const row =
                record(
                  item
                );

              const delegation =
                record(
                  row?.delegation
                );

              const validatorAddress =
                text(
                  delegation
                    ?.validator_address
                );

              if (
                !validatorAddress
              ) {
                return null;
              }

              return {
                validatorAddress,

                shares:
                  text(
                    delegation
                      ?.shares
                  ),

                balance:
                  coin(
                    row?.balance
                  ),
              };
            }
          )
          .filter(
            (
              item
            ): item is CosmosSdkDelegationEvidence =>
              item !== null
          )
          .slice(
            0,
            policy
              .delegationLimit
          )
      : [];

  if (
    !delegationResult.ok
  ) {
    unavailable.push(
      "delegations"
    );
  }

  const rewards =
    rewardResult.ok
      ? coins(
          rewardResult
            .data.total
        )
      : [];

  if (
    !rewardResult.ok
  ) {
    unavailable.push(
      "staking_rewards"
    );
  }

  const txMap =
    new Map<
      string,
      CosmosSdkTransactionEvidence
    >();

  for (
    const result of
    historyResults
  ) {
    if (!result.ok) {
      unavailable.push(
        "transaction_history"
      );

      continue;
    }

    for (
      const tx of
      parseTransactions(
        result.data
      )
    ) {
      if (
        !txMap.has(
          tx.hash
        )
      ) {
        txMap.set(
          tx.hash,
          tx
        );
      }
    }
  }

  const transactions =
    [...txMap.values()]
      .sort(
        (
          left,
          right
        ) =>
          (
            right.timestamp ??
            ""
          ).localeCompare(
            left.timestamp ??
            ""
          )
      )
      .slice(
        0,
        policy
          .transactionLimit
      );

  const account =
    accountResult
      .data.account;

  const primary =
    baseUrls[0]
      ?.replace(
        /\/+$/,
        ""
      ) ??
    "";

  const failover =
    [...usedBases]
      .some(
        base =>
          base !==
            primary
      );

  return {
    ok:
      true,

    providerId,

    latencyMs:
      Date.now() -
      started,

    data: {
      network,
      address:
        normalized,
      analysisPlan,

      accountNumber:
        nestedText(
          account,
          [
            "account_number",
          ]
        ),

      sequence:
        nestedText(
          account,
          [
            "sequence",
          ]
        ),

      balances,
      delegations,
      rewards,
      transactions,

      coverage: {
        plan:
          analysisPlan,

        transactionLimit:
          policy
            .transactionLimit,

        balanceLimit:
          policy
            .balanceLimit,

        delegationLimit:
          policy
            .delegationLimit,

        providerRequestBudget:
          policy
            .providerRequestBudget,

        providerRequestsUsed:
          requestsUsed,

        transportFailoverUsed:
          failover,

        unavailableEvidence:
          [
            ...new Set(
              unavailable
            ),
          ],

        coverage:
          unavailable
            .length >
            0
            ? "partial"
            : "complete",
      },
    },
  };
}

export type CosmosSdkDerivedAnalysis = {
  flow: {
    incomingCount:
      number;

    outgoingCount:
      number;

    transfers:
      readonly {
        direction:
          "incoming" |
          "outgoing";

        kind:
          "bank" |
          "ibc";

        counterparty:
          string;

        denom:
          string;

        amount:
          string;

        transactionHash:
          string;

        timestamp:
          string | null;
      }[];
  };

  counterparties: {
    count:
      number;

    items:
      readonly {
        address:
          string;

        incomingCount:
          number;

        outgoingCount:
          number;

        observationCount:
          number;

        transactionHashes:
          readonly string[];
      }[];
  };

  observedFunding:
    | {
        sourceAddress:
          string;

        denom:
          string;

        amount:
          string;

        transactionHash:
          string;

        timestamp:
          string | null;
      }
    | null;

  staking: {
    delegationCount:
      number;

    validatorAddresses:
      readonly string[];
  };

  ibc: {
    transferMessageCount:
      number;

    channels:
      readonly string[];
  };

  modules: {
    exchangeMessageCount:
      number;

    wasmMessageCount:
      number;

    tokenFactoryMessageCount:
      number;
  };

  timeline: {
    events:
      readonly {
        id:
          string;

        timestamp:
          string | null;

        direction:
          "incoming" |
          "outgoing";

        kind:
          "bank" |
          "ibc";

        counterparty:
          string;

        denom:
          string;

        amount:
          string;

        transactionHash:
          string;
      }[];
  };

  graph: {
    nodes:
      readonly {
        id:
          string;

        kind:
          "root" |
          "counterparty" |
          "validator";

        label:
          string;
      }[];

    edges:
      readonly {
        id:
          string;

        source:
          string;

        target:
          string;

        kind:
          "transfer" |
          "delegation";

        evidenceCount:
          number;
      }[];
  };
};

export function buildCosmosSdkDerivedAnalysis(
  {
    evidence,
    nativeDenom,
  }: {
    evidence:
      CosmosSdkEvidence;

    nativeDenom:
      string;
  }
): CosmosSdkDerivedAnalysis {
  const policy =
    getCosmosSdkPolicy(
      evidence
        .analysisPlan
    );

  const transfers:
    CosmosSdkDerivedAnalysis[
      "flow"
    ][
      "transfers"
    ] extends
      readonly (
        infer T
      )[]
      ? T[]
      : never =
      [];

  const peerMap =
    new Map<
      string,
      {
        incoming:
          number;

        outgoing:
          number;

        hashes:
          Set<string>;
      }
    >();

  const channels =
    new Set<string>();

  let ibcTransferMessageCount =
    0;

  let exchangeMessageCount =
    0;

  let wasmMessageCount =
    0;

  let tokenFactoryMessageCount =
    0;

  for (
    const tx of
    evidence.transactions
  ) {
    for (
      const message of
      tx.messages
    ) {
      const type =
        message.typeUrl
          .toLowerCase();

      if (
        type.includes(
          "exchange"
        )
      ) {
        exchangeMessageCount +=
          1;
      }

      if (
        type.includes(
          "wasm"
        )
      ) {
        wasmMessageCount +=
          1;
      }

      if (
        type.includes(
          "tokenfactory"
        )
      ) {
        tokenFactoryMessageCount +=
          1;
      }

      const isIbc =
        type.endsWith(
          "msgtransfer"
        ) &&
        Boolean(
          message
            .sourceChannel
        );

      const isBank =
        type.endsWith(
          "msgsend"
        );

      if (
        !isIbc &&
        !isBank
      ) {
        continue;
      }

      if (
        isIbc
      ) {
        ibcTransferMessageCount +=
          1;

        if (
          message
            .sourceChannel
        ) {
          channels.add(
            message
              .sourceChannel
          );
        }
      }

      let direction:
        "incoming" |
        "outgoing" |
        null =
          null;

      let counterparty:
        string | null =
          null;

      if (
        message.sender ===
          evidence.address &&
        message.recipient &&
        message.recipient !==
          evidence.address
      ) {
        direction =
          "outgoing";

        counterparty =
          message.recipient;
      } else if (
        message.recipient ===
          evidence.address &&
        message.sender &&
        message.sender !==
          evidence.address
      ) {
        direction =
          "incoming";

        counterparty =
          message.sender;
      }

      if (
        !direction ||
        !counterparty
      ) {
        continue;
      }

      for (
        const observedCoin of
        message.coins
      ) {
        transfers.push({
          direction,

          kind:
            isIbc
              ? "ibc"
              : "bank",

          counterparty,

          denom:
            observedCoin
              .denom,

          amount:
            observedCoin
              .amount,

          transactionHash:
            tx.hash,

          timestamp:
            tx.timestamp,
        });
      }

      const peer =
        peerMap.get(
          counterparty
        ) ?? {
          incoming:
            0,

          outgoing:
            0,

          hashes:
            new Set<string>(),
        };

      if (
        direction ===
          "incoming"
      ) {
        peer.incoming +=
          1;
      } else {
        peer.outgoing +=
          1;
      }

      peer.hashes.add(
        tx.hash
      );

      peerMap.set(
        counterparty,
        peer
      );
    }
  }

  const counterparties =
    [...peerMap.entries()]
      .map(
        (
          [
            address,
            state,
          ]
        ) => ({
          address,

          incomingCount:
            state.incoming,

          outgoingCount:
            state.outgoing,

          observationCount:
            state.incoming +
            state.outgoing,

          transactionHashes:
            [...state.hashes],
        })
      )
      .sort(
        (
          left,
          right
        ) =>
          right
            .observationCount -
          left
            .observationCount
      );

  const funding =
    [...transfers]
      .filter(
        item =>
          item.direction ===
            "incoming" &&
          item.denom ===
            nativeDenom
      )
      .sort(
        (
          left,
          right
        ) =>
          (
            left.timestamp ??
            ""
          ).localeCompare(
            right.timestamp ??
            ""
          )
      )[0] ??
    null;

  const rootId =
    `${evidence.network}:${evidence.address}`;

  const peerSlice =
    counterparties.slice(
      0,
      Math.max(
        0,
        policy
          .graphMaxNodes -
          1
      )
    );

  const nodes:
    CosmosSdkDerivedAnalysis[
      "graph"
    ][
      "nodes"
    ] extends
      readonly (
        infer T
      )[]
      ? T[]
      : never =
      [
        {
          id:
            rootId,

          kind:
            "root",

          label:
            evidence.address,
        },
      ];

  for (
    const peer of
    peerSlice
  ) {
    nodes.push({
      id:
        `${evidence.network}:${peer.address}`,

      kind:
        "counterparty",

      label:
        peer.address,
    });
  }

  for (
    const delegation of
    evidence.delegations
  ) {
    if (
      nodes.length >=
        policy
          .graphMaxNodes
    ) {
      break;
    }

    nodes.push({
      id:
        `${evidence.network}:validator:${delegation.validatorAddress}`,

      kind:
        "validator",

      label:
        delegation
          .validatorAddress,
    });
  }

  const edges:
    CosmosSdkDerivedAnalysis[
      "graph"
    ][
      "edges"
    ] extends
      readonly (
        infer T
      )[]
      ? T[]
      : never =
      [];

  for (
    const peer of
    peerSlice
  ) {
    if (
      edges.length >=
        policy
          .graphMaxEdges
    ) {
      break;
    }

    edges.push({
      id:
        `${evidence.network}:transfer:${peer.address}`,

      source:
        rootId,

      target:
        `${evidence.network}:${peer.address}`,

      kind:
        "transfer",

      evidenceCount:
        peer
          .observationCount,
    });
  }

  for (
    const delegation of
    evidence.delegations
  ) {
    if (
      edges.length >=
        policy
          .graphMaxEdges
    ) {
      break;
    }

    edges.push({
      id:
        `${evidence.network}:delegation:${delegation.validatorAddress}`,

      source:
        rootId,

      target:
        `${evidence.network}:validator:${delegation.validatorAddress}`,

      kind:
        "delegation",

      evidenceCount:
        1,
    });
  }

  return {
    flow: {
      incomingCount:
        transfers.filter(
          item =>
            item.direction ===
              "incoming"
        ).length,

      outgoingCount:
        transfers.filter(
          item =>
            item.direction ===
              "outgoing"
        ).length,

      transfers,
    },

    counterparties: {
      count:
        counterparties
          .length,

      items:
        counterparties,
    },

    observedFunding:
      funding
        ? {
            sourceAddress:
              funding.counterparty,

            denom:
              funding.denom,

            amount:
              funding.amount,

            transactionHash:
              funding
                .transactionHash,

            timestamp:
              funding.timestamp,
          }
        : null,

    staking: {
      delegationCount:
        evidence
          .delegations
          .length,

      validatorAddresses:
        evidence
          .delegations
          .map(
            item =>
              item.validatorAddress
          ),
    },

    ibc: {
      transferMessageCount:
        ibcTransferMessageCount,

      channels:
        [...channels],
    },

    modules: {
      exchangeMessageCount,
      wasmMessageCount,
      tokenFactoryMessageCount,
    },

    timeline: {
      events:
        transfers
          .slice(
            0,
            policy
              .timelineMaxEvents
          )
          .map(
            (
              item,
              index
            ) => ({
              id:
                `${evidence.network}:${item.transactionHash}:${index}`,

              timestamp:
                item.timestamp,

              direction:
                item.direction,

              kind:
                item.kind,

              counterparty:
                item.counterparty,

              denom:
                item.denom,

              amount:
                item.amount,

              transactionHash:
                item
                  .transactionHash,
            })
          ),
    },

    graph: {
      nodes,
      edges,
    },
  };
}
