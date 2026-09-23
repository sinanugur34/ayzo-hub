export type AdminBillingInsightRow = {
  metric: string;
  value:
    number |
    string;
};

export type AdminBillingInsights = {
  activeSubscriptions: number;
  pro: number;
  advanced: number;
  googlePlay: number;
  creem: number;
  monthly: number;
  annual: number;
  canceling: number;
  mrrEquivalentUsdCents: number;
};

function safeCount(
  value:
    number |
    string
) {
  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  ) &&
    parsed >= 0
    ? Math.round(
        parsed
      )
    : 0;
}

export function buildAdminBillingInsights(
  rows:
    AdminBillingInsightRow[]
): AdminBillingInsights {
  const result:
    AdminBillingInsights = {
      activeSubscriptions:
        0,
      pro:
        0,
      advanced:
        0,
      googlePlay:
        0,
      creem:
        0,
      monthly:
        0,
      annual:
        0,
      canceling:
        0,
      mrrEquivalentUsdCents:
        0,
    };

  for (
    const row of rows
  ) {
    const value =
      safeCount(
        row.value
      );

    switch (
      row.metric
    ) {
      case "active_subscriptions":
        result.activeSubscriptions =
          value;
        break;

      case "pro":
        result.pro =
          value;
        break;

      case "advanced":
        result.advanced =
          value;
        break;

      case "google_play":
        result.googlePlay =
          value;
        break;

      case "creem":
        result.creem =
          value;
        break;

      case "monthly":
        result.monthly =
          value;
        break;

      case "annual":
        result.annual =
          value;
        break;

      case "canceling":
        result.canceling =
          value;
        break;

      case "mrr_equivalent_usd_cents":
        result.mrrEquivalentUsdCents =
          value;
        break;
    }
  }

  return result;
}
