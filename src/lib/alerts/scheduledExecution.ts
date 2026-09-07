export type AlertScheduledDeliveryOutcome<
  DeliverySummary
> =
  | {
      executionEnabled:
        false;
      providerConfigured:
        null;
      executed:
        false;
      skipReason:
        "delivery_disabled";
      summary:
        null;
    }
  | {
      executionEnabled:
        true;
      providerConfigured:
        false;
      executed:
        false;
      skipReason:
        "provider_not_configured";
      summary:
        null;
    }
  | {
      executionEnabled:
        true;
      providerConfigured:
        true;
      executed:
        true;
      skipReason:
        null;
      summary:
        DeliverySummary;
    };

export type AlertScheduledExecutionSummary<
  EvaluationSummary,
  DeliverySummary
> = {
  evaluation:
    EvaluationSummary;

  delivery:
    AlertScheduledDeliveryOutcome<
      DeliverySummary
    >;
};

export type AlertScheduledExecutionDependencies<
  EvaluationSummary,
  DeliverySummary
> = {
  runEvaluation:
    () =>
      Promise<
        EvaluationSummary
      >;

  deliveryExecutionEnabled:
    boolean;

  isDeliveryProviderReady:
    () =>
      boolean;

  runDelivery:
    () =>
      Promise<
        DeliverySummary
      >;
};

export async function runAlertScheduledExecution<
  EvaluationSummary,
  DeliverySummary
>(
  dependencies:
    AlertScheduledExecutionDependencies<
      EvaluationSummary,
      DeliverySummary
    >
):
  Promise<
    AlertScheduledExecutionSummary<
      EvaluationSummary,
      DeliverySummary
    >
  > {
  const evaluation =
    await dependencies
      .runEvaluation();

  if (
    !dependencies
      .deliveryExecutionEnabled
  ) {
    return {
      evaluation,

      delivery: {
        executionEnabled:
          false,

        providerConfigured:
          null,

        executed:
          false,

        skipReason:
          "delivery_disabled",

        summary:
          null,
      },
    };
  }

  const providerConfigured =
    dependencies
      .isDeliveryProviderReady();

  if (
    !providerConfigured
  ) {
    return {
      evaluation,

      delivery: {
        executionEnabled:
          true,

        providerConfigured:
          false,

        executed:
          false,

        skipReason:
          "provider_not_configured",

        summary:
          null,
      },
    };
  }

  const delivery =
    await dependencies
      .runDelivery();

  return {
    evaluation,

    delivery: {
      executionEnabled:
        true,

      providerConfigured:
        true,

      executed:
        true,

      skipReason:
        null,

      summary:
        delivery,
    },
  };
}
