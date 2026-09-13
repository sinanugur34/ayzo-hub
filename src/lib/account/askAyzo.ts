type JsonRecord =
  Record<string, unknown>;

export type AskAyzoIntent =
  | "summary"
  | "authorities"
  | "holders"
  | "relationships"
  | "funding"
  | "deployment"
  | "developer-history"
  | "coverage"
  | "transaction-history"
  | "canonical-transaction"
  | "transaction-value"
  | "transaction-cost"
  | "execution"
  | "resource-usage"
  | "contract-type"
  | "financial-advice"
  | "unknown";

export type AskAyzoStatus =
  | "answered"
  | "insufficient-evidence"
  | "unsupported-question";

export type AskAyzoConfidence =
  | "high"
  | "medium"
  | "low";

export type AskAyzoResult = {
  version: 1;
  status:
    AskAyzoStatus;
  intent:
    AskAyzoIntent;
  answer: string;
  confidence:
    AskAyzoConfidence;
  evidence:
    readonly string[];
  caveats:
    readonly string[];
  limitation: string;
};

type BuildInput = {
  network: string;
  subjectType: string;
  subjectValue: string;
  question: string;
  evidencePayload: unknown;
};

function record(
  value: unknown
): JsonRecord | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as JsonRecord
    : null;
}

function text(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

function numberValue(
  value: unknown
) {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value)
  )
    ? value
    : null;
}

function array(
  value: unknown
) {
  return Array.isArray(value)
    ? value
    : [];
}

function pct(
  value: number
) {
  return `${value.toFixed(2)}%`;
}

function short(
  value: string
) {
  if (value.length <= 20) {
    return value;
  }

  return (
    `${value.slice(0, 8)}` +
    "..." +
    `${value.slice(-6)}`
  );
}

function normalizedQuestion(
  question: string
) {
  return question
    .toLocaleLowerCase("en-US")
    .replace(/[?!.:,;()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(
  value: string,
  terms:
    readonly string[]
) {
  return terms.some(
    term =>
      value.includes(term)
  );
}

function detectIntent(
  question: string
): AskAyzoIntent {
  const q =
    normalizedQuestion(
      question
    );

  if (
    includesAny(
      q,
      [
        "should i buy",
        "should i sell",
        "should i invest",
        "worth buying",
        "price prediction",
        "financial advice",
        "yatırım yapmalı",
        "almalı mıyım",
        "satmalı mıyım",
      ]
    )
  ) {
    return "financial-advice";
  }

  if (
    includesAny(
      q,
      [
        "mint authority",
        "freeze authority",
        "authority",
        "yetki",
      ]
    )
  ) {
    return "authorities";
  }

  if (
    includesAny(
      q,
      [
        "deployer",
        "deployed",
        "deployment",
        "created contract",
        "who created",
        "kim deploy",
        "kim oluşturdu",
      ]
    )
  ) {
    return "deployment";
  }

  if (
    includesAny(
      q,
      [
        "developer history",
        "developer",
        "other deployment",
        "other contract",
        "geliştirici",
      ]
    )
  ) {
    return "developer-history";
  }

  if (
    includesAny(
      q,
      [
        "holder",
        "concentration",
        "top 10",
        "top10",
        "top 20",
        "top20",
        "holders",
        "yoğunlaşma",
      ]
    )
  ) {
    return "holders";
  }

  if (
    includesAny(
      q,
      [
        "relationship",
        "connected",
        "connection",
        "interact",
        "wallets related",
        "wallet relation",
        "bağlantı",
        "ilişki",
      ]
    )
  ) {
    return "relationships";
  }

  if (
    includesAny(
      q,
      [
        "funding",
        "funder",
        "funded",
        "fund source",
        "shared funding",
        "fonlama",
        "fon kaynağı",
      ]
    )
  ) {
    return "funding";
  }

  if (
    includesAny(
      q,
      [
        "contract type",
        "contract türü",
        "sözleşme türü",
      ]
    )
  ) {
    return "contract-type";
  }

  if (
    includesAny(
      q,
      [
        "energy usage",
        "energy used",
        "energy was used",
        "how much energy",
        "energy total",
        "net usage",
        "bandwidth usage",
        "enerji kullanımı",
        "enerji kullanıldı",
        "ne kadar enerji",
      ]
    )
  ) {
    return "resource-usage";
  }

  if (
    includesAny(
      q,
      [
        "transaction fee",
        "transaction fees",
        "fee sun",
        "fees koinu",
        "işlem ücreti",
        "işlem masrafı",
      ]
    )
  ) {
    return "transaction-cost";
  }

  if (
    includesAny(
      q,
      [
        "execution result",
        "execution status",
        "transaction result",
        "işlem sonucu",
        "execution",
      ]
    )
  ) {
    return "execution";
  }

  if (
    includesAny(
      q,
      [
        "transaction value",
        "value transferred",
        "doge value",
        "value koinu",
        "işlem değeri",
        "transfer değeri",
      ]
    )
  ) {
    return "transaction-value";
  }

  if (
    includesAny(
      q,
      [
        "canonical transaction",
        "canonical tx",
        "is it confirmed",
        "transaction confirmed",
        "confirmations",
        "how many inputs",
        "how many outputs",
        "prevout",
        "onaylı mı",
        "onay sayısı",
      ]
    )
  ) {
    return "canonical-transaction";
  }

  if (
    includesAny(
      q,
      [
        "transaction history",
        "address history",
        "transaction count",
        "how many transactions",
        "transactions observed",
        "observed transactions",
        "kaç işlem",
        "işlem sayısı",
      ]
    )
  ) {
    return "transaction-history";
  }

  if (
    includesAny(
      q,
      [
        "coverage",
        "complete",
        "limited",
        "module",
        "data quality",
        "kapsam",
      ]
    )
  ) {
    return "coverage";
  }

  if (
    includesAny(
      q,
      [
        "summary",
        "summarize",
        "what did you find",
        "main finding",
        "main findings",
        "what does evidence show",
        "safe",
        "scam",
        "rug",
        "risk",
        "özet",
        "ne buldun",
        "güvenli",
      ]
    )
  ) {
    return "summary";
  }

  return "unknown";
}

function baseResult(
  intent:
    AskAyzoIntent,
  status:
    AskAyzoStatus,
  answer: string,
  confidence:
    AskAyzoConfidence,
  evidence:
    readonly string[],
  caveats:
    readonly string[]
): AskAyzoResult {
  return {
    version: 1,
    status,
    intent,
    answer,
    confidence,
    evidence,
    caveats,
    limitation:
      "Ask AYZO answers only from evidence already collected by AYZO for the current analysis. It does not infer legal identity, beneficial ownership, intent, affiliation or investment suitability.",
  };
}

function findingsFrom(
  root: JsonRecord
) {
  return array(
    root.findings
  )
    .slice(0, 12)
    .map(item => {
      const row =
        record(item);

      if (!row) {
        return null;
      }

      const title =
        text(row.title);

      const summary =
        text(row.summary);

      const confidence =
        text(
          row.confidence
        );

      const caveat =
        text(row.caveat);

      if (
        !title ||
        !summary
      ) {
        return null;
      }

      return {
        title,
        summary,
        confidence,
        caveat,
      };
    })
    .filter(
      (
        item
      ): item is {
        title: string;
        summary: string;
        confidence:
          string | null;
        caveat:
          string | null;
      } =>
        item !== null
    );
}

function moduleResult(
  root: JsonRecord,
  name: string
) {
  const modules =
    record(
      root.modules
    );

  return record(
    modules?.[name]
  );
}

function moduleData(
  root: JsonRecord,
  name: string
) {
  return record(
    moduleResult(
      root,
      name
    )?.data
  );
}

function answerSummary(
  root: JsonRecord
) {
  const findings =
    findingsFrom(root);

  if (
    findings.length === 0
  ) {
    const coverage =
      text(root.coverage);

    if (coverage) {
      return baseResult(
        "summary",
        "insufficient-evidence",
        `AYZO completed the current analysis with ${coverage} coverage, but no bounded finding is available for a stronger summary.`,
        "medium",
        [
          `Analysis coverage: ${coverage}.`,
        ],
        [
          "Absence of a finding is not evidence that the subject is safe or risk-free.",
        ]
      );
    }

    return baseResult(
      "summary",
      "insufficient-evidence",
      "The current analysis does not contain enough bounded evidence for an AYZO summary.",
      "low",
      [],
      [
        "No conclusion was generated beyond the available evidence.",
      ]
    );
  }

  const selected =
    findings.slice(
      0,
      3
    );

  const answer =
    selected
      .map(
        item =>
          `${item.title}: ${item.summary}`
      )
      .join(" ");

  const evidence =
    selected.map(
      item =>
        item.confidence
          ? `${item.title} — confidence: ${item.confidence}.`
          : item.title
    );

  const caveats =
    selected
      .map(
        item =>
          item.caveat
      )
      .filter(
        (
          item
        ): item is string =>
          Boolean(item)
      )
      .slice(0, 3);

  caveats.push(
    "AYZO does not classify a token, wallet or contract as safe, scam, rug or investment-worthy from these signals alone."
  );

  return baseResult(
    "summary",
    "answered",
    answer,
    "medium",
    evidence,
    caveats
  );
}

function answerAuthorities(
  root: JsonRecord
) {
  const verification =
    record(
      root.tokenVerification
    );

  if (!verification) {
    return baseResult(
      "authorities",
      "insufficient-evidence",
      "The current analysis does not contain Solana token authority evidence.",
      "low",
      [],
      [
        "No authority conclusion was inferred from missing evidence.",
      ]
    );
  }

  const mintAuthority =
    text(
      verification
        .mintAuthority
    );

  const freezeAuthority =
    text(
      verification
        .freezeAuthority
    );

  const mintText =
    mintAuthority
      ? `Mint authority is active at ${short(mintAuthority)}.`
      : "Mint authority is not active in the current token evidence.";

  const freezeText =
    freezeAuthority
      ? `Freeze authority is active at ${short(freezeAuthority)}.`
      : "Freeze authority is not active in the current token evidence.";

  return baseResult(
    "authorities",
    "answered",
    `${mintText} ${freezeText}`,
    "high",
    [
      mintAuthority
        ? `Mint authority: ${mintAuthority}.`
        : "Mint authority: none.",
      freezeAuthority
        ? `Freeze authority: ${freezeAuthority}.`
        : "Freeze authority: none.",
    ],
    [
      "Authority presence describes current on-chain permissions and does not by itself establish malicious intent.",
    ]
  );
}

function answerHolders(
  root: JsonRecord
) {
  const holders =
    record(root.holders);

  const concentration =
    record(
      holders
        ?.concentration
    );

  const solanaTop20 =
    numberValue(
      concentration?.top20
    );

  if (
    solanaTop20 !== null
  ) {
    const top10 =
      numberValue(
        concentration?.top10
      );

    return baseResult(
      "holders",
      "answered",
      `The analyzed Solana holder set shows approximately ${pct(solanaTop20)} in the top 20 owners${top10 !== null ? ` and ${pct(top10)} in the top 10` : ""}.`,
      "high",
      [
        `Top 20 concentration: ${pct(solanaTop20)}.`,
        ...(top10 !== null
          ? [
              `Top 10 concentration: ${pct(top10)}.`,
            ]
          : []),
      ],
      [
        "Holder concentration is descriptive evidence and is not treated as risk by itself.",
      ]
    );
  }

  const evm =
    moduleData(
      root,
      "holderIntelligence"
    );

  const adjusted =
    record(
      evm?.adjusted
    );

  const adjustedConcentration =
    record(
      adjusted
        ?.concentration
    );

  const evmTop20 =
    numberValue(
      adjustedConcentration
        ?.top20Percent
    );

  if (
    evmTop20 !== null
  ) {
    const excluded =
      numberValue(
        adjusted
          ?.excludedSupplyPercent
      );

    return baseResult(
      "holders",
      "answered",
      `The evidence-backed adjusted EVM holder concentration is approximately ${pct(evmTop20)} for the top 20 analyzed holders.`,
      "high",
      [
        `Adjusted top 20 concentration: ${pct(evmTop20)}.`,
        ...(excluded !== null
          ? [
              `Excluded infrastructure/entity supply: ${pct(excluded)}.`,
            ]
          : []),
      ],
      [
        "Concentration alone does not establish coordinated control, insider activity or risk.",
      ]
    );
  }

  return baseResult(
    "holders",
    "insufficient-evidence",
    "Reliable holder concentration is not available in the current bounded evidence.",
    "low",
    [],
    [
      "AYZO does not estimate concentration from evidence that does not support a reliable ranking.",
    ]
  );
}

function answerRelationships(
  root: JsonRecord
) {
  const solana =
    record(
      root.relationships
    );

  if (solana) {
    const detected =
      numberValue(
        solana
          .relationshipsDetected
      );

    const shared =
      numberValue(
        solana
          .sharedTransactionsDetected
      );

    const wallets =
      numberValue(
        solana
          .walletsAnalyzed
      );

    return baseResult(
      "relationships",
      "answered",
      detected !== null &&
      detected > 0
        ? `AYZO detected ${detected} bounded wallet relationship${detected === 1 ? "" : "s"} among the analyzed Solana wallets.`
        : "AYZO did not detect a bounded wallet relationship in the currently analyzed Solana wallet set.",
      "high",
      [
        ...(wallets !== null
          ? [
              `Wallets analyzed: ${wallets}.`,
            ]
          : []),
        ...(detected !== null
          ? [
              `Relationships detected: ${detected}.`,
            ]
          : []),
        ...(shared !== null
          ? [
              `Shared transactions detected: ${shared}.`,
            ]
          : []),
      ],
      [
        "Observed interaction does not prove common ownership, coordination or insider activity.",
      ]
    );
  }

  const evm =
    moduleData(
      root,
      "walletRelationships"
    );

  if (evm) {
    const counterparties =
      numberValue(
        evm
          .counterpartyCount
      );

    const interactions =
      numberValue(
        evm
          .interactionCount
      );

    return baseResult(
      "relationships",
      "answered",
      counterparties !== null &&
      counterparties > 0
        ? `AYZO observed ${counterparties} counterparty relationship${counterparties === 1 ? "" : "s"} in the bounded EVM evidence.`
        : "AYZO did not observe a counterparty relationship in the bounded EVM evidence.",
      "high",
      [
        ...(counterparties !== null
          ? [
              `Counterparties: ${counterparties}.`,
            ]
          : []),
        ...(interactions !== null
          ? [
              `Interactions: ${interactions}.`,
            ]
          : []),
      ],
      [
        "On-chain interaction does not prove common ownership, control or affiliation.",
      ]
    );
  }

  return baseResult(
    "relationships",
    "insufficient-evidence",
    "Relationship evidence is unavailable for the current analysis.",
    "low",
    [],
    [
      "AYZO did not infer relationships from missing or incomplete evidence.",
    ]
  );
}

function answerFunding(
  root: JsonRecord
) {
  const solana =
    record(root.funding);

  if (solana) {
    const shared =
      numberValue(
        solana
          .sharedFundingSourcesDetected
      );

    const incoming =
      numberValue(
        solana
          .incomingTransfersDetected
      );

    return baseResult(
      "funding",
      "answered",
      shared !== null &&
      shared > 0
        ? `AYZO detected ${shared} shared recent funding source${shared === 1 ? "" : "s"} among the analyzed Solana wallets.`
        : "AYZO did not detect a shared recent funding source among the analyzed Solana wallets.",
      "medium",
      [
        ...(shared !== null
          ? [
              `Shared funding sources detected: ${shared}.`,
            ]
          : []),
        ...(incoming !== null
          ? [
              `Incoming transfers detected: ${incoming}.`,
            ]
          : []),
      ],
      [
        "Recent funding evidence does not identify the original funder and does not prove common ownership.",
      ]
    );
  }

  const evm =
    moduleData(
      root,
      "fundingProvenance"
    );

  if (evm) {
    const sources =
      numberValue(
        evm
          .fundingSourceCount
      );

    const repeated =
      numberValue(
        evm
          .repeatedFundingSourceCount
      );

    const first =
      record(
        evm
          .firstObservedFunding
      );

    const source =
      text(
        first
          ?.sourceAddress
      );

    return baseResult(
      "funding",
      "answered",
      sources !== null &&
      sources > 0
        ? `AYZO observed ${sources} funding source${sources === 1 ? "" : "s"} in the bounded EVM evidence${repeated !== null ? `, including ${repeated} repeated source${repeated === 1 ? "" : "s"}` : ""}.`
        : "AYZO did not resolve a funding source in the bounded EVM evidence.",
      "medium",
      [
        ...(sources !== null
          ? [
              `Funding sources: ${sources}.`,
            ]
          : []),
        ...(repeated !== null
          ? [
              `Repeated funding sources: ${repeated}.`,
            ]
          : []),
        ...(source
          ? [
              `First observed funding source: ${source}.`,
            ]
          : []),
      ],
      [
        "Observed funding provenance does not establish beneficial ownership, control or the ultimate origin of funds.",
      ]
    );
  }

  return baseResult(
    "funding",
    "insufficient-evidence",
    "Funding evidence is unavailable for the current analysis.",
    "low",
    [],
    [
      "AYZO did not infer funding provenance from missing evidence.",
    ]
  );
}

function answerDeployment(
  root: JsonRecord
) {
  const deployment =
    moduleData(
      root,
      "deploymentIntelligence"
    );

  if (!deployment) {
    return baseResult(
      "deployment",
      "insufficient-evidence",
      "Verified contract deployment evidence is unavailable for the current analysis.",
      "low",
      [],
      [
        "AYZO did not infer a deployer without verified deployment evidence.",
      ]
    );
  }

  const observed =
    record(
      deployment
        .deployment
    );

  const deployer =
    text(
      observed
        ?.deployerAddress
    );

  const tx =
    text(
      observed
        ?.transactionHash
    );

  if (!deployer) {
    return baseResult(
      "deployment",
      "insufficient-evidence",
      "The current evidence does not resolve a verified contract deployer.",
      "low",
      [],
      [
        "No deployer identity was inferred from incomplete evidence.",
      ]
    );
  }

  return baseResult(
    "deployment",
    "answered",
    `AYZO verified ${short(deployer)} as the observed contract deployer.`,
    "high",
    [
      `Deployer address: ${deployer}.`,
      ...(tx
        ? [
            `Deployment transaction: ${tx}.`,
          ]
        : []),
    ],
    [
      "A deployment transaction identifies the observed deployer address at creation time; it does not prove current ownership, control or intent.",
    ]
  );
}

function answerDeveloperHistory(
  root: JsonRecord
) {
  const developer =
    moduleData(
      root,
      "developerHistory"
    );

  if (!developer) {
    return baseResult(
      "developer-history",
      "insufficient-evidence",
      "Developer-history evidence is unavailable for the current analysis.",
      "low",
      [],
      [
        "AYZO did not infer developer history from unavailable deployment evidence.",
      ]
    );
  }

  const deployer =
    text(
      developer
        .deployerAddress
    );

  const verified =
    numberValue(
      developer
        .verifiedDeploymentCount
    );

  const other =
    numberValue(
      developer
        .otherVerifiedDeploymentCount
    );

  const repeated =
    developer
      .repeatedDeploymentActivity ===
      true;

  if (
    !deployer &&
    verified === null
  ) {
    return baseResult(
      "developer-history",
      "insufficient-evidence",
      "The current analysis does not contain enough verified developer-history evidence.",
      "low",
      [],
      []
    );
  }

  return baseResult(
    "developer-history",
    "answered",
    repeated
      ? `AYZO observed repeated verified deployment activity for the analyzed contract deployer${other !== null ? `, including ${other} other verified deployment${other === 1 ? "" : "s"}` : ""}.`
      : "AYZO did not establish repeated verified deployment activity from the bounded developer-history evidence.",
    "high",
    [
      ...(deployer
        ? [
            `Observed deployer: ${deployer}.`,
          ]
        : []),
      ...(verified !== null
        ? [
            `Verified deployments: ${verified}.`,
          ]
        : []),
      ...(other !== null
        ? [
            `Other verified deployments: ${other}.`,
          ]
        : []),
    ],
    [
      "Repeated deployment activity does not by itself establish malicious intent, common control or affiliation.",
    ]
  );
}

function canonicalFrom(
  root: JsonRecord
) {
  return record(
    root.canonicalTransaction
  );
}

function formatBaseUnits(
  raw: string,
  decimals: number,
  symbol: string
) {
  try {
    const value =
      BigInt(raw);

    const divisor =
      10n **
      BigInt(decimals);

    const whole =
      value /
      divisor;

    const remainder =
      value %
      divisor;

    const wholeText =
      whole.toLocaleString(
        "en-US"
      );

    if (
      remainder ===
      0n
    ) {
      return `${wholeText} ${symbol}`;
    }

    const fraction =
      remainder
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return (
      `${wholeText}.${fraction} ${symbol}`
    );
  } catch {
    return `${raw} ${symbol} base units`;
  }
}

function answerTransactionHistory(
  root: JsonRecord
) {
  const history =
    record(
      root.history
    );

  if (!history) {
    return baseResult(
      "transaction-history",
      "insufficient-evidence",
      "Address transaction history is unavailable in the current evidence.",
      "low",
      [],
      []
    );
  }

  const transactions =
    array(
      history.transactions
    );

  return baseResult(
    "transaction-history",
    "answered",
    `AYZO observed ${transactions.length} transaction${transactions.length === 1 ? "" : "s"} in the bounded address-history window.`,
    "high",
    [
      `Observed transactions: ${transactions.length}.`,
    ],
    [
      "The bounded history window may not represent the complete lifetime history of the address.",
    ]
  );
}

function answerCanonicalTransaction(
  root: JsonRecord
) {
  const tx =
    canonicalFrom(
      root
    );

  if (!tx) {
    return baseResult(
      "canonical-transaction",
      "insufficient-evidence",
      "Canonical transaction evidence is unavailable.",
      "low",
      [],
      []
    );
  }

  const confirmed =
    typeof tx.confirmed ===
      "boolean"
      ? tx.confirmed
      : null;

  const confirmations =
    numberValue(
      tx.confirmations
    );

  const inputs =
    "inputs" in tx
      ? array(
          tx.inputs
        )
      : null;

  const outputs =
    "outputs" in tx
      ? array(
          tx.outputs
        )
      : null;

  return baseResult(
    "canonical-transaction",
    "answered",

    confirmed !== null
      ? `The canonical transaction is ${confirmed ? "confirmed" : "not confirmed"}${confirmations !== null ? ` with ${confirmations} confirmation${confirmations === 1 ? "" : "s"}` : ""}.`
      : "AYZO resolved canonical transaction evidence.",

    "high",

    [
      ...(confirmed !== null
        ? [
            `Confirmed: ${confirmed ? "yes" : "no"}.`,
          ]
        : []),

      ...(confirmations !== null
        ? [
            `Confirmations: ${confirmations}.`,
          ]
        : []),

      ...(inputs
        ? [
            `Inputs: ${inputs.length}.`,
          ]
        : []),

      ...(outputs
        ? [
            `Outputs: ${outputs.length}.`,
          ]
        : []),
    ],

    [
      "Canonical transaction evidence does not establish ownership or intent.",
    ]
  );
}

function answerTransactionCost(
  root: JsonRecord
) {
  const tx =
    canonicalFrom(
      root
    );

  if (!tx) {
    return baseResult(
      "transaction-cost",
      "insufficient-evidence",
      "Transaction fee evidence is unavailable.",
      "low",
      [],
      []
    );
  }

  const doge =
    text(
      tx.feesKoinu
    );

  if (doge !== null) {
    const formatted =
      formatBaseUnits(
        doge,
        8,
        "DOGE"
      );

    return baseResult(
      "transaction-cost",
      "answered",
      `The canonical Dogecoin transaction fee is ${formatted}.`,
      "high",
      [
        `Transaction fee: ${formatted}.`,
      ],
      []
    );
  }

  const tron =
    text(
      tx.feeSun
    );

  if (tron !== null) {
    const formatted =
      formatBaseUnits(
        tron,
        6,
        "TRX"
      );

    return baseResult(
      "transaction-cost",
      "answered",
      `The canonical TRON transaction fee is ${formatted}.`,
      "high",
      [
        `Transaction fee: ${formatted}.`,
      ],
      []
    );
  }

  return baseResult(
    "transaction-cost",
    "insufficient-evidence",
    "A supported transaction fee field is unavailable.",
    "low",
    [],
    []
  );
}

function answerTransactionValue(
  root: JsonRecord
) {
  const tx =
    canonicalFrom(
      root
    );

  if (!tx) {
    return baseResult(
      "transaction-value",
      "insufficient-evidence",
      "Transaction value evidence is unavailable.",
      "low",
      [],
      []
    );
  }

  const doge =
    text(
      tx.valueKoinu
    );

  if (doge !== null) {
    const formatted =
      formatBaseUnits(
        doge,
        8,
        "DOGE"
      );

    return baseResult(
      "transaction-value",
      "answered",
      `The canonical Dogecoin evidence reports ${formatted}.`,
      "high",
      [
        `Observed value: ${formatted}.`,
      ],
      []
    );
  }

  const contract =
    record(
      tx.contract
    );

  const sun =
    text(
      contract?.amountSun
    ) ??
    text(
      contract?.callValueSun
    );

  if (sun !== null) {
    const formatted =
      formatBaseUnits(
        sun,
        6,
        "TRX"
      );

    return baseResult(
      "transaction-value",
      "answered",
      `The TRON contract evidence reports an observed value of ${formatted}.`,
      "high",
      [
        `Observed value: ${formatted}.`,
      ],
      []
    );
  }

  return baseResult(
    "transaction-value",
    "insufficient-evidence",
    "A supported transaction value field is unavailable.",
    "low",
    [],
    []
  );
}

function answerExecution(
  root: JsonRecord
) {
  const tx =
    canonicalFrom(
      root
    );

  const result =
    text(
      tx?.executionResult
    );

  if (!result) {
    return baseResult(
      "execution",
      "insufficient-evidence",
      "Execution result evidence is unavailable.",
      "low",
      [],
      []
    );
  }

  return baseResult(
    "execution",
    "answered",
    `The canonical TRON transaction execution result is ${result}.`,
    "high",
    [
      `Execution result: ${result}.`,
    ],
    []
  );
}

function answerResourceUsage(
  root: JsonRecord
) {
  const tx =
    canonicalFrom(
      root
    );

  if (!tx) {
    return baseResult(
      "resource-usage",
      "insufficient-evidence",
      "TRON resource usage evidence is unavailable.",
      "low",
      [],
      []
    );
  }

  const energyTotal =
    numberValue(
      tx.energyUsageTotal
    );

  const energy =
    numberValue(
      tx.energyUsage
    );

  const net =
    numberValue(
      tx.netUsage
    );

  if (
    energyTotal === null &&
    energy === null &&
    net === null
  ) {
    return baseResult(
      "resource-usage",
      "insufficient-evidence",
      "Energy and network usage are unavailable for the current transaction.",
      "low",
      [],
      []
    );
  }

  const primaryEnergy =
    energyTotal ??
    energy;

  return baseResult(
    "resource-usage",
    "answered",

    primaryEnergy !== null
      ? `The canonical TRON evidence reports energy usage of ${primaryEnergy.toLocaleString("en-US")}${net !== null ? ` and net usage of ${net.toLocaleString("en-US")}` : ""}.`
      : `The canonical TRON evidence reports net usage of ${net?.toLocaleString("en-US")}.`,

    "high",

    [
      ...(energyTotal !== null
        ? [
            `Energy usage total: ${energyTotal.toLocaleString("en-US")}.`,
          ]
        : []),

      ...(energy !== null
        ? [
            `Energy usage: ${energy.toLocaleString("en-US")}.`,
          ]
        : []),

      ...(net !== null
        ? [
            `Net usage: ${net.toLocaleString("en-US")}.`,
          ]
        : []),
    ],

    [
      "Resource usage is transaction execution evidence, not an investment or risk classification.",
    ]
  );
}

function answerContractType(
  root: JsonRecord
) {
  const tx =
    canonicalFrom(
      root
    );

  const contract =
    record(
      tx?.contract
    );

  const contractType =
    text(
      contract?.type
    );

  if (!contractType) {
    return baseResult(
      "contract-type",
      "insufficient-evidence",
      "TRON contract type evidence is unavailable.",
      "low",
      [],
      []
    );
  }

  return baseResult(
    "contract-type",
    "answered",
    `The canonical TRON transaction contains contract type ${contractType}.`,
    "high",
    [
      `Contract type: ${contractType}.`,
    ],
    [
      "Contract type alone does not establish purpose, identity or intent.",
    ]
  );
}

function answerCoverage(
  root: JsonRecord
) {
  const coverage =
    text(root.coverage);

  const modules =
    record(
      root.modules
    );

  const statuses:
    string[] = [];

  if (modules) {
    for (
      const [
        name,
        raw,
      ] of Object.entries(
        modules
      )
    ) {
      const status =
        text(
          record(raw)
            ?.status
        );

      if (status) {
        statuses.push(
          `${name}: ${status}`
        );
      }
    }
  }

  if (
    !coverage &&
    statuses.length === 0
  ) {
    return baseResult(
      "coverage",
      "insufficient-evidence",
      "Coverage metadata is unavailable for the current analysis.",
      "low",
      [],
      []
    );
  }

  return baseResult(
    "coverage",
    "answered",
    coverage
      ? `The current AYZO analysis reports ${coverage} coverage.`
      : "AYZO has module-level coverage information for the current analysis.",
    "high",
    [
      ...(coverage
        ? [
            `Overall coverage: ${coverage}.`,
          ]
        : []),
      ...statuses.slice(
        0,
        8
      ),
    ],
    [
      "Coverage describes what AYZO could verify in the bounded analysis window; it is not a statement that all historical or off-chain information is known.",
    ]
  );
}

export function buildAskAyzoAnswer({
  network,
  subjectType,
  subjectValue,
  question,
  evidencePayload,
}: BuildInput): AskAyzoResult {
  void network;
  void subjectType;
  void subjectValue;

  const root =
    record(
      evidencePayload
    );

  const intent =
    detectIntent(
      question
    );

  if (
    intent ===
    "financial-advice"
  ) {
    return baseResult(
      intent,
      "unsupported-question",
      "Ask AYZO does not provide buy, sell, investment or price-prediction recommendations. It can explain the on-chain evidence collected for this analysis.",
      "high",
      [],
      [
        "AYZO provides evidence-first on-chain intelligence and does not provide financial advice.",
      ]
    );
  }

  if (
    intent ===
    "unknown"
  ) {
    return baseResult(
      intent,
      "unsupported-question",
      "Ask AYZO can answer questions about findings, coverage, Solana authorities, holder concentration, wallet relationships, funding, EVM deployment/developer history, and supported Bitcoin, Dogecoin and TRON transaction evidence.",
      "high",
      [],
      []
    );
  }

  if (!root) {
    return baseResult(
      intent,
      "insufficient-evidence",
      "The current analysis does not contain bounded evidence for this question.",
      "low",
      [],
      [
        "No answer was inferred without evidence.",
      ]
    );
  }

  switch (intent) {
    case "summary":
      return answerSummary(
        root
      );

    case "authorities":
      return answerAuthorities(
        root
      );

    case "holders":
      return answerHolders(
        root
      );

    case "relationships":
      return answerRelationships(
        root
      );

    case "funding":
      return answerFunding(
        root
      );

    case "deployment":
      return answerDeployment(
        root
      );

    case "developer-history":
      return answerDeveloperHistory(
        root
      );

    case "coverage":
      return answerCoverage(
        root
      );

    case "transaction-history":
      return answerTransactionHistory(
        root
      );

    case "canonical-transaction":
      return answerCanonicalTransaction(
        root
      );

    case "transaction-value":
      return answerTransactionValue(
        root
      );

    case "transaction-cost":
      return answerTransactionCost(
        root
      );

    case "execution":
      return answerExecution(
        root
      );

    case "resource-usage":
      return answerResourceUsage(
        root
      );

    case "contract-type":
      return answerContractType(
        root
      );
  }

  return baseResult(
    "unknown",
    "unsupported-question",
    "Ask AYZO could not map this question to a supported evidence category.",
    "low",
    [],
    []
  );
}
