export type AdminConversionRate = {
  numerator: number;
  denominator: number;
  percent:
    number |
    null;
};

export type AdminConversionSignalWindow = {
  product_session_started: {
    sessions: number;
  };

  analysis_submitted: {
    sessions: number;
  };

  analysis_started: {
    sessions: number;
  };

  intelligence_completed: {
    sessions: number;
  };

  pricing_viewed: {
    sessions: number;
  };

  checkout_started: {
    sessions: number;
  };

  checkout_created: {
    sessions: number;
  };

  subscription_paid: {
    sessions: number;
  };
};

function safeCount(
  value: number
) {
  return (
    Number.isFinite(
      value
    ) &&
    value >= 0
  )
    ? value
    : 0;
}

export function buildAdminConversionRate(
  numeratorValue: number,
  denominatorValue: number
):
  AdminConversionRate {
  const numerator =
    safeCount(
      numeratorValue
    );

  const denominator =
    safeCount(
      denominatorValue
    );

  return {
    numerator,
    denominator,

    percent:
      denominator > 0
        ? Math.round(
            (
              numerator /
              denominator
            ) *
              100
          )
        : null,
  };
}

export function formatAdminConversionRate(
  rate:
    AdminConversionRate
) {
  return rate.percent ===
    null
    ? "—"
    : `${rate.percent}%`;
}

export function buildAdminConversionRates(
  window:
    AdminConversionSignalWindow
) {
  const sessions =
    window
      .product_session_started
      .sessions;

  const submitted =
    window
      .analysis_submitted
      .sessions;

  const started =
    window
      .analysis_started
      .sessions;

  const completed =
    window
      .intelligence_completed
      .sessions;

  const pricing =
    window
      .pricing_viewed
      .sessions;

  const checkoutStarted =
    window
      .checkout_started
      .sessions;

  const checkoutCreated =
    window
      .checkout_created
      .sessions;

  const paid =
    window
      .subscription_paid
      .sessions;

  return {
    sessionToSubmit:
      buildAdminConversionRate(
        submitted,
        sessions
      ),

    submitToStart:
      buildAdminConversionRate(
        started,
        submitted
      ),

    startToComplete:
      buildAdminConversionRate(
        completed,
        started
      ),

    submitToComplete:
      buildAdminConversionRate(
        completed,
        submitted
      ),

    sessionToPricing:
      buildAdminConversionRate(
        pricing,
        sessions
      ),

    pricingToCheckout:
      buildAdminConversionRate(
        checkoutStarted,
        pricing
      ),

    checkoutToCreated:
      buildAdminConversionRate(
        checkoutCreated,
        checkoutStarted
      ),

    createdToPaid:
      buildAdminConversionRate(
        paid,
        checkoutCreated
      ),
  };
}
