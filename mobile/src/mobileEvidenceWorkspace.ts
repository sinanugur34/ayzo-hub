type JsonRecord =
  Record<string, unknown>;

export type MobileEvidenceNodeKind =
  | "subject"
  | "wallet"
  | "funding"
  | "transaction"
  | "module";

export type MobileEvidenceNode = {
  id: string;
  label: string;
  detail: string | null;
  kind: MobileEvidenceNodeKind;
};

export type MobileEvidenceEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  direction:
    | "forward"
    | "bidirectional"
    | "observed";
};

export type MobileEvidenceEvent = {
  id: string;

  title: string;

  detail: string | null;

  timestamp: string | null;

  direction:
    | "incoming"
    | "outgoing"
    | "self"
    | "observed";

  transactionRef:
    string | null;
};

export type MobileEvidenceWorkspace = {
  nodes:
    readonly MobileEvidenceNode[];

  edges:
    readonly MobileEvidenceEdge[];

  timeline:
    readonly MobileEvidenceEvent[];

  limitation:
    string;
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

function stringValue(
  value: unknown
) {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  )
    ? value.trim()
    : null;
}

function numberValue(
  value: unknown
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(
      value
    )
  )
    ? value
    : null;
}

function recordChild(
  value: unknown,
  key: string
) {
  if (
    !isRecord(value)
  ) {
    return null;
  }

  const child =
    value[key];

  return isRecord(
    child
  )
    ? child
    : null;
}

function records(
  value: unknown
): JsonRecord[] {
  return Array.isArray(
    value
  )
    ? value.filter(
        isRecord
      )
    : [];
}

function arrayChild(
  value: unknown,
  key: string
) {
  if (
    !isRecord(value)
  ) {
    return [];
  }

  return records(
    value[key]
  );
}

function normalized(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function short(
  value: string
) {
  if (
    value.length <=
    22
  ) {
    return value;
  }

  return (
    `${value.slice(
      0,
      8
    )}` +
    "..." +
    `${value.slice(
      -6
    )}`
  );
}

function directionFor({
  address,
  source,
  destination,
}: {
  address: string;
  source: string | null;
  destination: string | null;
}):
  | "incoming"
  | "outgoing"
  | "self"
  | "observed" {
  const root =
    normalized(
      address
    );

  const from =
    source
      ? normalized(
          source
        )
      : null;

  const to =
    destination
      ? normalized(
          destination
        )
      : null;

  if (
    from === root &&
    to === root
  ) {
    return "self";
  }

  if (
    to === root
  ) {
    return "incoming";
  }

  if (
    from === root
  ) {
    return "outgoing";
  }

  return "observed";
}

function isEvmNetwork(
  networkId: string
) {
  return [
    "ethereum",
    "base",
    "bnb",
    "arbitrum",
    "polygon",
    "optimism",
    "avalanche",
    "linea",
    "scroll",
    "mantle",
    "sonic",
    "monad",
  ].includes(
    networkId
  );
}

export function buildMobileEvidenceWorkspace({
  networkId,
  address,
  data,
}: {
  networkId: string;
  address: string;
  data: unknown;
}): MobileEvidenceWorkspace {
  const root =
    isRecord(data)
      ? data
      : {};

  const nodes:
    MobileEvidenceNode[] = [];

  const edges:
    MobileEvidenceEdge[] = [];

  const timeline:
    MobileEvidenceEvent[] = [];

  const nodeByKey =
    new Map<
      string,
      string
    >();

  const eventIds =
    new Set<string>();

  const rootId =
    "subject";

  function addNode({
    label,
    detail =
      null,
    kind,
  }: {
    label: string;
    detail?: string | null;
    kind:
      MobileEvidenceNodeKind;
  }) {
    const key =
      `${kind}:${normalized(
        label
      )}`;

    const existing =
      nodeByKey.get(
        key
      );

    if (existing) {
      return existing;
    }

    if (
      nodes.length >=
      10
    ) {
      return null;
    }

    const id =
      kind ===
        "subject"
        ? rootId
        : `${kind}:${nodes.length}`;

    nodes.push({
      id,
      label,
      detail,
      kind,
    });

    nodeByKey.set(
      key,
      id
    );

    return id;
  }

  addNode({
    label:
      address,
    detail:
      "Analyzed subject",
    kind:
      "subject",
  });

  function findAddressNode(
    value: string
  ) {
    const key =
      normalized(
        value
      );

    if (
      key ===
      normalized(
        address
      )
    ) {
      return rootId;
    }

    for (
      const node of
      nodes
    ) {
      if (
        normalized(
          node.label
        ) === key
      ) {
        return node.id;
      }
    }

    return null;
  }

  function addWallet(
    value: string,
    detail:
      string | null =
        null,
    kind:
      MobileEvidenceNodeKind =
        "wallet"
  ) {
    const existing =
      findAddressNode(
        value
      );

    if (existing) {
      return existing;
    }

    return addNode({
      label:
        value,
      detail,
      kind,
    });
  }

  function addEdge({
    id,
    source,
    target,
    label,
    direction,
  }: MobileEvidenceEdge) {
    if (
      edges.length >=
      14 ||
      edges.some(
        edge =>
          edge.id ===
          id
      )
    ) {
      return;
    }

    if (
      !nodes.some(
        node =>
          node.id ===
          source
      ) ||
      !nodes.some(
        node =>
          node.id ===
          target
      )
    ) {
      return;
    }

    edges.push({
      id,
      source,
      target,
      label,
      direction,
    });
  }

  function addEvent(
    event:
      MobileEvidenceEvent
  ) {
    if (
      timeline.length >=
        8 ||
      eventIds.has(
        event.id
      )
    ) {
      return;
    }

    eventIds.add(
      event.id
    );

    timeline.push(
      event
    );
  }

  /*
   * EVM:
   * explicit walletGraph + fundingProvenance
   * + normalized activityTimeline only.
   */
  if (
    isEvmNetwork(
      networkId
    )
  ) {
    const modules =
      recordChild(
        root,
        "modules"
      );

    const graphModule =
      recordChild(
        modules,
        "walletGraph"
      );

    const graph =
      recordChild(
        graphModule,
        "data"
      );

    for (
      const graphNode of
      arrayChild(
        graph,
        "nodes"
      )
    ) {
      const wallet =
        stringValue(
          graphNode.address
        );

      if (!wallet) {
        continue;
      }

      const interactionCount =
        numberValue(
          graphNode
            .interactionCount
        );

      const depth =
        numberValue(
          graphNode.depth
        );

      addWallet(
        wallet,
        [
          interactionCount !==
            null
            ? `${interactionCount} interaction(s)`
            : null,

          depth !== null
            ? `depth ${depth}`
            : null,
        ]
          .filter(
            Boolean
          )
          .join(
            " · "
          ) ||
          "Observed wallet graph node"
      );
    }

    for (
      const graphEdge of
      arrayChild(
        graph,
        "edges"
      )
    ) {
      const addressA =
        stringValue(
          graphEdge.addressA
        );

      const addressB =
        stringValue(
          graphEdge.addressB
        );

      if (
        !addressA ||
        !addressB
      ) {
        continue;
      }

      const left =
        addWallet(
          addressA
        );

      const right =
        addWallet(
          addressB
        );

      if (
        !left ||
        !right
      ) {
        continue;
      }

      const rawDirection =
        stringValue(
          graphEdge.direction
        );

      let source =
        left;

      let target =
        right;

      if (
        rawDirection ===
        "b_to_a"
      ) {
        source =
          right;

        target =
          left;
      }

      const count =
        numberValue(
          graphEdge
            .interactionCount
        ) ??
        numberValue(
          graphEdge
            .transactionCount
        ) ??
        1;

      addEdge({
        id:
          `evm:${source}:${target}`,
        source,
        target,
        label:
          `${count} observed interaction(s)`,
        direction:
          rawDirection ===
          "bidirectional"
            ? "bidirectional"
            : "forward",
      });
    }

    const fundingModule =
      recordChild(
        modules,
        "fundingProvenance"
      );

    const funding =
      recordChild(
        fundingModule,
        "data"
      );

    for (
      const item of
      arrayChild(
        funding,
        "sources"
      )
    ) {
      const sourceAddress =
        stringValue(
          item.sourceAddress
        );

      if (
        !sourceAddress
      ) {
        continue;
      }

      const sourceId =
        addWallet(
          sourceAddress,
          "Observed funding source",
          "funding"
        );

      if (!sourceId) {
        continue;
      }

      const count =
        numberValue(
          item
            .fundingObservationCount
        ) ??
        1;

      addEdge({
        id:
          `evm-funding:${sourceId}`,
        source:
          sourceId,
        target:
          rootId,
        label:
          `${count} funding observation(s)`,
        direction:
          "forward",
      });
    }

    const activityTimeline =
      recordChild(
        root,
        "activityTimeline"
      );

    for (
      const [
        index,
        item,
      ] of arrayChild(
        activityTimeline,
        "events"
      ).entries()
    ) {
      const hash =
        stringValue(
          item.transactionHash
        );

      const rawDirection =
        stringValue(
          item.direction
        );

      const direction =
        rawDirection ===
          "incoming" ||
        rawDirection ===
          "outgoing" ||
        rawDirection ===
          "self"
          ? rawDirection
          : "observed";

      const from =
        stringValue(
          item.from
        );

      const to =
        stringValue(
          item.to
        );

      const asset =
        stringValue(
          item.asset
        );

      const value =
        stringValue(
          item.formattedValue
        );

      addEvent({
        id:
          hash
            ? `evm:${hash}`
            : `evm-event:${index}`,

        title:
          direction ===
            "incoming"
            ? "Incoming activity"
            : direction ===
                "outgoing"
              ? "Outgoing activity"
              : direction ===
                  "self"
                ? "Self-directed activity"
                : "Observed activity",

        detail:
          [
            value,
            asset,
            from
              ? `from ${short(
                  from
                )}`
              : null,
            to
              ? `to ${short(
                  to
                )}`
              : null,
          ]
            .filter(
              Boolean
            )
            .join(
              " · "
            ) ||
          null,

        timestamp:
          stringValue(
            item.timestamp
          ),

        direction,

        transactionRef:
          hash,
      });
    }
  }

  /*
   * Solana:
   * top holder positions, explicit wallet
   * relationships and observed recent SOL funding.
   */
  if (
    networkId ===
    "solana"
  ) {
    const holders =
      recordChild(
        root,
        "holders"
      );

    for (
      const item of
      arrayChild(
        holders,
        "owners"
      ).slice(
        0,
        4
      )
    ) {
      const wallet =
        stringValue(
          item.owner
        );

      if (!wallet) {
        continue;
      }

      const rank =
        numberValue(
          item.rank
        );

      const percentage =
        numberValue(
          item.percentage
        );

      const walletId =
        addWallet(
          wallet,
          [
            rank !== null
              ? `Holder #${rank}`
              : "Observed holder",
            percentage !==
              null
              ? `${percentage.toFixed(
                  2
                )}%`
              : null,
          ]
            .filter(
              Boolean
            )
            .join(
              " · "
            )
        );

      if (!walletId) {
        continue;
      }

      addEdge({
        id:
          `sol-holder:${walletId}`,
        source:
          rootId,
        target:
          walletId,
        label:
          "Observed holder position",
        direction:
          "observed",
      });
    }

    const relationships =
      recordChild(
        root,
        "relationships"
      );

    for (
      const item of
      arrayChild(
        relationships,
        "relations"
      )
    ) {
      const walletA =
        stringValue(
          item.walletA
        );

      const walletB =
        stringValue(
          item.walletB
        );

      if (
        !walletA ||
        !walletB
      ) {
        continue;
      }

      const left =
        addWallet(
          walletA
        );

      const right =
        addWallet(
          walletB
        );

      if (
        !left ||
        !right
      ) {
        continue;
      }

      const direct =
        numberValue(
          item
            .directSolTransferCount
        ) ??
        0;

      const shared =
        numberValue(
          item
            .sharedTransactionCount
        ) ??
        0;

      addEdge({
        id:
          `sol:${left}:${right}`,
        source:
          left,
        target:
          right,
        label:
          direct > 0
            ? `${direct} direct SOL transfer(s)`
            : `${shared} shared transaction(s)`,
        direction:
          "observed",
      });
    }

    const funding =
      recordChild(
        root,
        "funding"
      );

    for (
      const wallet of
      arrayChild(
        funding,
        "perWallet"
      )
    ) {
      const destination =
        stringValue(
          wallet.wallet
        );

      if (
        !destination
      ) {
        continue;
      }

      const destinationId =
        addWallet(
          destination
        );

      for (
        const transfer of
        arrayChild(
          wallet,
          "recentIncomingTransfers"
        )
      ) {
        const source =
          stringValue(
            transfer.source
          );

        if (!source) {
          continue;
        }

        const sourceId =
          addWallet(
            source,
            "Observed SOL funding source",
            "funding"
          );

        if (
          sourceId &&
          destinationId
        ) {
          addEdge({
            id:
              `sol-funding:${sourceId}:${destinationId}`,
            source:
              sourceId,
            target:
              destinationId,
            label:
              "Observed SOL funding",
            direction:
              "forward",
          });
        }

        const signature =
          stringValue(
            transfer.signature
          );

        const sol =
          numberValue(
            transfer.sol
          );

        addEvent({
          id:
            signature
              ? `sol:${signature}`
              : `sol:${source}:${destination}`,

          title:
            "Incoming funding",

          detail:
            [
              sol !== null
                ? `${sol} SOL`
                : null,
              `from ${short(
                source
              )}`,
              `to ${short(
                destination
              )}`,
            ]
              .filter(
                Boolean
              )
              .join(
                " · "
              ),

          timestamp:
            null,

          direction:
            "incoming",

          transactionRef:
            signature,
        });
      }
    }
  }

  /*
   * Bitcoin:
   * bounded address-history transaction evidence.
   */
  if (
    networkId ===
    "bitcoin"
  ) {
    const history =
      recordChild(
        root,
        "history"
      );

    for (
      const item of
      arrayChild(
        history,
        "transactions"
      ).slice(
        0,
        8
      )
    ) {
      const hash =
        stringValue(
          item
            .transactionHash
        );

      if (!hash) {
        continue;
      }

      const transactionId =
        addNode({
          label:
            hash,
          detail:
            "Observed Bitcoin transaction",
          kind:
            "transaction",
        });

      if (transactionId) {
        addEdge({
          id:
            `btc:${hash}`,
          source:
            rootId,
          target:
            transactionId,
          label:
            "Address history evidence",
          direction:
            "observed",
        });
      }

      const height =
        numberValue(
          item.blockHeight
        );

      addEvent({
        id:
          `btc-event:${hash}`,

        title:
          "Bitcoin transaction",

        detail:
          height !==
          null
            ? `Block ${height}`
            : null,

        timestamp:
          stringValue(
            item.timestamp
          ),

        direction:
          "observed",

        transactionRef:
          hash,
      });
    }
  }

  /*
   * Dogecoin:
   * explicit canonical counterparty evidence only.
   */
  if (
    networkId ===
    "dogecoin"
  ) {
    const derived =
      recordChild(
        root,
        "derived"
      );

    const counterparties =
      recordChild(
        derived,
        "counterparties"
      );

    for (
      const item of
      arrayChild(
        counterparties,
        "items"
      )
    ) {
      const wallet =
        stringValue(
          item.address
        );

      if (!wallet) {
        continue;
      }

      const walletId =
        addWallet(
          wallet,
          `${
            numberValue(
              item.observationCount
            ) ??
            1
          } observed relationship signal(s)`
        );

      if (!walletId) {
        continue;
      }

      const incoming =
        numberValue(
          item.incomingCount
        ) ??
        0;

      const outgoing =
        numberValue(
          item.outgoingCount
        ) ??
        0;

      addEdge({
        id:
          `doge:${walletId}`,

        source:
          incoming > 0 &&
          outgoing === 0
            ? walletId
            : rootId,

        target:
          incoming > 0 &&
          outgoing === 0
            ? rootId
            : walletId,

        label:
          "Observed Dogecoin relationship",

        direction:
          incoming > 0 &&
          outgoing > 0
            ? "bidirectional"
            : "forward",
      });
    }

    const funding =
      recordChild(
        derived,
        "observedFunding"
      );

    const source =
      stringValue(
        funding
          ?.sourceAddress
      );

    if (source) {
      const sourceId =
        addWallet(
          source,
          "Observed Dogecoin funding source",
          "funding"
        );

      if (sourceId) {
        addEdge({
          id:
            `doge-funding:${sourceId}`,
          source:
            sourceId,
          target:
            rootId,
          label:
            "Observed funding",
          direction:
            "forward",
        });
      }
    }
  }

  /*
   * Litecoin:
   * explicit canonical counterparty evidence only.
   */
  if (
    networkId ===
    "litecoin"
  ) {
    const derived =
      recordChild(
        root,
        "derived"
      );

    const counterparties =
      recordChild(
        derived,
        "counterparties"
      );

    for (
      const item of
      arrayChild(
        counterparties,
        "items"
      )
    ) {
      const wallet =
        stringValue(
          item.address
        );

      if (!wallet) {
        continue;
      }

      const walletId =
        addWallet(
          wallet,
          `${
            numberValue(
              item.observationCount
            ) ??
            1
          } observed relationship signal(s)`
        );

      if (!walletId) {
        continue;
      }

      const incoming =
        numberValue(
          item.incomingCount
        ) ??
        0;

      const outgoing =
        numberValue(
          item.outgoingCount
        ) ??
        0;

      addEdge({
        id:
          `ltc:${walletId}`,

        source:
          incoming > 0 &&
          outgoing === 0
            ? walletId
            : rootId,

        target:
          incoming > 0 &&
          outgoing === 0
            ? rootId
            : walletId,

        label:
          "Observed Litecoin relationship",

        direction:
          incoming > 0 &&
          outgoing > 0
            ? "bidirectional"
            : "forward",
      });
    }

    const funding =
      recordChild(
        derived,
        "observedFunding"
      );

    const source =
      stringValue(
        funding
          ?.sourceAddress
      );

    if (source) {
      const sourceId =
        addWallet(
          source,
          "Observed Litecoin funding source",
          "funding"
        );

      if (sourceId) {
        addEdge({
          id:
            `ltc-funding:${sourceId}`,
          source:
            sourceId,
          target:
            rootId,
          label:
            "Observed funding",
          direction:
            "forward",
        });
      }
    }
  }

  /*
   * Sui:
   * Use only explicit affected-address relationship and
   * bounded observed inbound-SUI sender evidence already
   * returned by the AYZO backend.
   */
  if (
    networkId ===
    "sui"
  ) {
    const derived =
      recordChild(
        root,
        "derived"
      );

    const counterparties =
      recordChild(
        derived,
        "counterparties"
      );

    for (
      const item of
      arrayChild(
        counterparties,
        "items"
      )
    ) {
      const counterparty =
        stringValue(
          item.address
        );

      if (!counterparty) {
        continue;
      }

      const counterpartyId =
        addWallet(
          counterparty,
          `${
            numberValue(
              item
                .interactionCount
            ) ??
            1
          } affected-address signal(s)`
        );

      if (!counterpartyId) {
        continue;
      }

      addEdge({
        id:
          `sui:${counterpartyId}`,

        source:
          rootId,

        target:
          counterpartyId,

        label:
          "Observed Sui relationship",

        direction:
          "observed",
      });
    }

    const funding =
      recordChild(
        derived,
        "observedFunding"
      );

    const sender =
      stringValue(
        funding
          ?.observedSender
      );

    if (sender) {
      const senderId =
        addWallet(
          sender,
          "Observed sender on bounded inbound SUI evidence",
          "funding"
        );

      if (senderId) {
        addEdge({
          id:
            `sui-funding:${senderId}`,

          source:
            senderId,

          target:
            rootId,

          label:
            "Observed inbound SUI",

          direction:
            "forward",
        });
      }
    }
  }

  /*
   * TRON:
   * explicit canonical owner/destination
   * relationships and observed inbound funding.
   */
  if (
    networkId ===
    "tron"
  ) {
    const derived =
      recordChild(
        root,
        "derived"
      );

    const counterparties =
      recordChild(
        derived,
        "counterparties"
      );

    for (
      const item of
      arrayChild(
        counterparties,
        "items"
      )
    ) {
      const wallet =
        stringValue(
          item.addressHex
        );

      if (!wallet) {
        continue;
      }

      const walletId =
        addWallet(
          wallet,
          `${
            numberValue(
              item.observationCount
            ) ??
            1
          } explicit relationship observation(s)`
        );

      if (!walletId) {
        continue;
      }

      const incoming =
        numberValue(
          item.incomingCount
        ) ??
        0;

      const outgoing =
        numberValue(
          item.outgoingCount
        ) ??
        0;

      addEdge({
        id:
          `tron:${walletId}`,

        source:
          incoming > 0 &&
          outgoing === 0
            ? walletId
            : rootId,

        target:
          incoming > 0 &&
          outgoing === 0
            ? rootId
            : walletId,

        label:
          "Explicit TRON relationship",

        direction:
          incoming > 0 &&
          outgoing > 0
            ? "bidirectional"
            : "forward",
      });
    }

    const funding =
      recordChild(
        derived,
        "observedFunding"
      );

    const source =
      stringValue(
        funding
          ?.sourceAddressHex
      );

    if (source) {
      const sourceId =
        addWallet(
          source,
          "Observed inbound TRX funding",
          "funding"
        );

      if (sourceId) {
        addEdge({
          id:
            `tron-funding:${sourceId}`,
          source:
            sourceId,
          target:
            rootId,
          label:
            "Observed inbound TRX funding",
          direction:
            "forward",
        });
      }
    }
  }

  /*
   * XRP Ledger:
   * transaction / trust-line counterparties
   * and explicit first observed funding.
   */
  if (
    networkId ===
    "xrp"
  ) {
    const derived =
      recordChild(
        root,
        "derived"
      );

    const counterparties =
      recordChild(
        derived,
        "counterparties"
      );

    for (
      const item of
      arrayChild(
        counterparties,
        "counterparties"
      )
    ) {
      const wallet =
        stringValue(
          item.address
        );

      if (!wallet) {
        continue;
      }

      const walletId =
        addWallet(
          wallet,
          `${
            numberValue(
              item.interactionCount
            ) ??
            1
          } observed relationship signal(s)`
        );

      if (!walletId) {
        continue;
      }

      const incoming =
        numberValue(
          item.incomingCount
        ) ??
        0;

      const outgoing =
        numberValue(
          item.outgoingCount
        ) ??
        0;

      const trustLines =
        numberValue(
          item.trustLineCount
        ) ??
        0;

      addEdge({
        id:
          `xrpl:${walletId}`,
        source:
          rootId,
        target:
          walletId,
        label:
          trustLines > 0
            ? "Transaction / trust-line relationship"
            : "Observed transaction relationship",
        direction:
          incoming > 0 &&
          outgoing > 0
            ? "bidirectional"
            : "observed",
      });
    }

    const funding =
      recordChild(
        root,
        "firstObservedFunding"
      );

    const source =
      stringValue(
        funding
          ?.source
      );

    if (source) {
      const sourceId =
        addWallet(
          source,
          "Observed early inbound funding source",
          "funding"
        );

      if (sourceId) {
        addEdge({
          id:
            `xrpl-funding:${sourceId}`,
          source:
            sourceId,
          target:
            rootId,
          label:
            "Observed inbound funding",
          direction:
            "forward",
        });
      }
    }
  }

  /*
   * Network-neutral bounded timeline fallback.
   */
  if (
    timeline.length ===
    0
  ) {
    const history =
      recordChild(
        root,
        "history"
      );

    const historyTransactions =
      arrayChild(
        history,
        "transactions"
      );

    const canonicalTransactions =
      arrayChild(
        root,
        "canonicalTransactions"
      );

    const sourceTransactions =
      historyTransactions.length >
      0
        ? historyTransactions
        : canonicalTransactions;

    for (
      const [
        index,
        item,
      ] of sourceTransactions
        .slice(
          0,
          8
        )
        .entries()
    ) {
      const hash =
        stringValue(
          item
            .transactionHash
        );

      const source =
        stringValue(
          item.source
        );

      const destination =
        stringValue(
          item.destination
        );

      const direction =
        directionFor({
          address,
          source,
          destination,
        });

      const blockHeight =
        numberValue(
          item.blockHeight
        );

      const ledgerIndex =
        numberValue(
          item.ledgerIndex
        );

      addEvent({
        id:
          hash
            ? `history:${hash}`
            : `history:${index}`,

        title:
          direction ===
            "incoming"
            ? "Incoming transaction"
            : direction ===
                "outgoing"
              ? "Outgoing transaction"
              : direction ===
                  "self"
                ? "Self-directed transaction"
                : "Observed transaction",

        detail:
          [
            source
              ? `from ${short(
                  source
                )}`
              : null,

            destination
              ? `to ${short(
                  destination
                )}`
              : null,

            blockHeight !==
              null
              ? `block ${blockHeight}`
              : ledgerIndex !==
                  null
                ? `ledger ${ledgerIndex}`
                : null,
          ]
            .filter(
              Boolean
            )
            .join(
              " · "
            ) ||
          null,

        timestamp:
          stringValue(
            item.timestamp
          ),

        direction,

        transactionRef:
          hash,
      });
    }
  }

  /*
   * Truthful fallback: evidence-module topology,
   * never invented wallet/entity relationships.
   */
  if (
    edges.length ===
    0
  ) {
    const modules =
      recordChild(
        root,
        "modules"
      );

    if (modules) {
      for (
        const [
          key,
          value,
        ] of Object.entries(
          modules
        )
      ) {
        if (
          nodes.length >=
          8
        ) {
          break;
        }

        if (
          !isRecord(
            value
          )
        ) {
          continue;
        }

        const status =
          stringValue(
            value.status
          );

        if (!status) {
          continue;
        }

        const label =
          key
            .replace(
              /([A-Z])/g,
              " $1"
            )
            .replace(
              /^./,
              letter =>
                letter
                  .toUpperCase()
            );

        const moduleId =
          addNode({
            label,
            detail:
              status,
            kind:
              "module",
          });

        if (!moduleId) {
          continue;
        }

        addEdge({
          id:
            `module:${key}`,
          source:
            rootId,
          target:
            moduleId,
          label:
            "Evidence module",
          direction:
            "observed",
        });
      }
    }
  }

  return {
    nodes,
    edges,
    timeline,

    limitation:
      "Mobile graph and timeline use only evidence already returned by AYZO. Visual proximity does not establish identity, common ownership, intent or control.",
  };
}
