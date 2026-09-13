export type AskAyzoNormalizedQuestion = {
  original: string;
  normalized: string;
  searchText: string;
  changed: boolean;
  protectedIdentifiers:
    readonly string[];
};

const TYPO_REPLACEMENTS:
  readonly (
    readonly [
      string,
      string,
    ]
  )[] = [
  ["deplyer", "deployer"],
  ["deployr", "deployer"],
  ["deplyd", "deployed"],
  ["deplyed", "deployed"],

  ["contrct", "contract"],
  ["contrect", "contract"],
  ["contrat", "contract"],

  ["walet", "wallet"],
  ["wallett", "wallet"],

  ["autrity", "authority"],
  ["authoroty", "authority"],
  ["autorithy", "authority"],
  ["autority", "authority"],

  ["fundng", "funding"],
  ["fundin", "funding"],
  ["fundig", "funding"],

  ["holdrs", "holders"],
  ["hodlers", "holders"],
  ["hlders", "holders"],

  ["liqidity", "liquidity"],
  ["liquidty", "liquidity"],

  ["transction", "transaction"],
  ["trasaction", "transaction"],

  ["analyeses", "analyses"],
  ["analysys", "analysis"],

  ["watclist", "watchlist"],
  ["watchist", "watchlist"],

  ["allerts", "alerts"],
  ["alrets", "alerts"],

  ["entitiy", "entity"],
  ["lables", "labels"],

  ["historial", "historical"],
  ["investgation", "investigation"],

  ["ths", "this"],
];

const IDENTIFIER_PATTERN =
  /\b(?:0x[a-fA-F0-9]{40,64}|[a-fA-F0-9]{64}|(?:bc1|tb1)[a-zA-Z0-9]{20,90}|[13][1-9A-HJ-NP-Za-km-z]{25,34}|[D9A][1-9A-HJ-NP-Za-km-z]{25,34}|T[1-9A-HJ-NP-Za-km-z]{33}|[1-9A-HJ-NP-Za-km-z]{32,88})\b/g;

function escapeRegExp(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

export function normalizeAskAyzoQuestion(
  input: string
): AskAyzoNormalizedQuestion {
  const original =
    input.trim();

  const identifiers:
    string[] = [];

  const protectedText =
    original.replace(
      IDENTIFIER_PATTERN,
      value => {
        const token =
          `__AYZO_IDENTIFIER_${identifiers.length}__`;

        identifiers.push(
          value
        );

        return token;
      }
    );

  let normalized =
    protectedText;

  for (
    const [
      typo,
      replacement,
    ] of TYPO_REPLACEMENTS
  ) {
    normalized =
      normalized.replace(
        new RegExp(
          `\\b${escapeRegExp(
            typo
          )}\\b`,
          "gi"
        ),
        replacement
      );
  }

  normalized =
    normalized
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  for (
    let index = 0;
    index <
    identifiers.length;
    index += 1
  ) {
    normalized =
      normalized.replace(
        `__AYZO_IDENTIFIER_${index}__`,
        identifiers[index]
      );
  }

  return {
    original,

    normalized,

    searchText:
      normalized
        .toLocaleLowerCase(
          "en-US"
        ),

    changed:
      normalized !==
      original,

    protectedIdentifiers:
      identifiers,
  };
}
