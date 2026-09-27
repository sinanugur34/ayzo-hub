export type AskAyzoSiteKnowledgeEntry = {
  id: string;
  title: string;
  route: string;
  description: string;
  directions: string;
  keywords:
    readonly string[];
};

export const ASK_AYZO_SITE_KNOWLEDGE:
  readonly AskAyzoSiteKnowledgeEntry[] =
[
  {
    id: "analysis",
    title: "Run an analysis",
    route: "/",
    description:
      "AYZO analysis starts from the main application screen.",
    directions:
      "Go to the AYZO main screen, select the network, enter the supported wallet, token or address, then start the analysis.",
    keywords: [
      "analysis",
      "analyze",
      "analyse",
      "wallet analysis",
      "token analysis",
      "analiz",
    ],
  },

  {
    id: "account",
    title: "Account",
    route: "/account",
    description:
      "The Account screen contains plan information and account-backed research tools.",
    directions:
      "When signed in, use the Account button in the AYZO header.",
    keywords: [
      "account",
      "my account",
      "hesap",
    ],
  },

  {
    id: "saved-analyses",
    title: "Saved Analyses",
    route: "/account",
    description:
      "Saved research appears in the Account screen.",
    directions:
      "Open Account from the header, then look under RESEARCH → Saved Analyses.",
    keywords: [
      "saved analysis",
      "saved analyses",
      "saved research",
      "kaydedilen analiz",
    ],
  },

  {
    id: "watchlists",
    title: "Watchlists",
    route: "/account",
    description:
      "Watchlists organize monitored wallets, tokens and entities.",
    directions:
      "Open Account from the header, then use MONITORING → Watchlists.",
    keywords: [
      "watchlist",
      "watchlists",
      "izleme listesi",
      "takip listesi",
    ],
  },

  {
    id: "alerts",
    title: "Alerts",
    route: "/account",
    description:
      "Alert rules monitor supported evidence changes.",
    directions:
      "Open Account, then scroll below Saved Analyses and Watchlists to the alert rules area.",
    keywords: [
      "alert",
      "alerts",
      "alarm",
      "uyarı",
    ],
  },

  {
    id: "plans",
    title: "Plans",
    route: "/",
    description:
      "Plan and feature information appears in the main application's pricing area.",
    directions:
      "Go to the AYZO main screen and scroll to the Plans / Pricing section.",
    keywords: [
      "plan",
      "pricing",
      "price",
      "pro",
      "advanced",
      "fiyat",
    ],
  },

  {
    id: "ask-ayzo-investigator",
    title: "Ask AYZO Investigator",
    route: "/",
    description:
      "Ask AYZO Investigator is the Pro and Advanced evidence-grounded investigation assistant. For a connected analysis it reasons over current AYZO evidence and, when available, bounded server-owned Evidence History, Investigation Timeline changes and evidence-backed entity roles. It does not treat previous chat replies as evidence and does not infer identity, ownership, intent or investment suitability.",
    directions:
      "Run a supported analysis, then open Ask AYZO Investigator from the analysis research surface or the floating Ask AYZO control. Ask follow-up or longitudinal questions such as what changed since earlier evidence.",
    keywords: [
      "ask ayzo",
      "ask ayzo investigator",
      "investigator",
      "evidence investigator",
      "investigation assistant",
      "araştırmacı",
      "arastirmaci",
    ],
  },

  {
    id: "fund-tracer",
    title: "Interactive Fund Tracer",
    route: "/",
    description:
      "Interactive Fund Tracer is a Pro and Advanced evidence explorer for observed funding routes. Pro follows supported direct funding paths. Advanced also shows bounded multi-hop EVM upstream paths when Deep Funding evidence is available. It does not infer ultimate source of funds, identity, ownership, control or intent.",
    directions:
      "Run a supported analysis and open Fund Tracer in the Analysis Workspace. Select a funding route to inspect its observed addresses and transaction evidence.",
    keywords: [
      "fund tracer",
      "funding tracer",
      "funding trace",
      "fund flow",
      "money flow",
      "fon takibi",
      "fon izi",
    ],
  },

  {
    id: "entity-labels",
    title: "Entity Labels",
    route: "/",
    description:
      "Entity Labels show evidence-backed on-chain roles where supported.",
    directions:
      "Run a supported analysis, then look in the AYZO research/account actions area for AYZO Entity Labels.",
    keywords: [
      "entity label",
      "entity labels",
      "labels",
      "etiket",
    ],
  },

  {
    id: "wallet-profiler",
    title: "Wallet Profiler",
    route: "/",
    description:
      "Wallet Profiler is a Pro and Advanced evidence-only synthesis of supported wallet activity, funding and relationship observations. It does not assign profitability, identity, ownership or risk scores.",
    directions:
      "Run a supported wallet analysis. Pro and Advanced accounts see Wallet Profile where the analyzed subject is a wallet. Recent wallet evidence baselines also appear in Account → Profile Memory.",
    keywords: [
      "wallet profiler",
      "wallet profile",
      "profile memory",
      "cüzdan profili",
      "cuzdan profili",
    ],
  },

  {
    id: "historical-changes",
    title: "Historical Changes",
    route: "/",
    description:
      "Historical Changes compares supported current evidence with saved historical evidence.",
    directions:
      "Run the analysis first, then use Historical Changes in the AYZO research/account actions area.",
    keywords: [
      "historical changes",
      "history",
      "geçmiş değişiklik",
    ],
  },

  {
    id: "investigation-timeline",
    title: "Investigation Timeline",
    route: "/",
    description:
      "Investigation Timeline presents supported investigation evidence over time.",
    directions:
      "Run the analysis first, then use Investigation Timeline in the AYZO research/account actions area.",
    keywords: [
      "investigation timeline",
      "timeline",
      "zaman çizelgesi",
    ],
  },
];

export function getAskAyzoSiteKnowledge(
  id: string
) {
  return (
    ASK_AYZO_SITE_KNOWLEDGE
      .find(
        item =>
          item.id === id
      ) ??
    null
  );
}
