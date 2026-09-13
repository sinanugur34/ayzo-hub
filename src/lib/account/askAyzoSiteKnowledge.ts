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
