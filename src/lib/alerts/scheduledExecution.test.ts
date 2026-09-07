import assert from "node:assert/strict";
import test from "node:test";

import {
  runAlertScheduledExecution,
} from "./scheduledExecution";

test(
  "delivery disabled evaluates without provider or delivery work",
  async () => {
    let providerCalls = 0;
    let deliveryCalls = 0;

    const outcome =
      await runAlertScheduledExecution({
        runEvaluation:
          async () => ({
            evaluated: 2,
          }),

        deliveryExecutionEnabled:
          false,

        isDeliveryProviderReady:
          () => {
            providerCalls += 1;
            return true;
          },

        runDelivery:
          async () => {
            deliveryCalls += 1;

            return {
              claimed: 1,
            };
          },
      });

    assert.equal(
      outcome.evaluation.evaluated,
      2
    );

    assert.equal(
      outcome.delivery.executed,
      false
    );

    assert.equal(
      outcome.delivery.skipReason,
      "delivery_disabled"
    );

    assert.equal(
      providerCalls,
      0
    );

    assert.equal(
      deliveryCalls,
      0
    );
  }
);

test(
  "provider readiness blocks delivery before worker execution",
  async () => {
    let deliveryCalls = 0;

    const outcome =
      await runAlertScheduledExecution({
        runEvaluation:
          async () => ({
            evaluated: 1,
          }),

        deliveryExecutionEnabled:
          true,

        isDeliveryProviderReady:
          () => false,

        runDelivery:
          async () => {
            deliveryCalls += 1;

            return {
              claimed: 1,
            };
          },
      });

    assert.equal(
      outcome.delivery.executionEnabled,
      true
    );

    assert.equal(
      outcome.delivery.providerConfigured,
      false
    );

    assert.equal(
      outcome.delivery.executed,
      false
    );

    assert.equal(
      outcome.delivery.skipReason,
      "provider_not_configured"
    );

    assert.equal(
      deliveryCalls,
      0
    );
  }
);

test(
  "scheduled execution runs evaluation before delivery",
  async () => {
    const order:
      string[] =
      [];

    const outcome =
      await runAlertScheduledExecution({
        runEvaluation:
          async () => {
            order.push(
              "evaluation"
            );

            return {
              evaluated: 1,
            };
          },

        deliveryExecutionEnabled:
          true,

        isDeliveryProviderReady:
          () => {
            order.push(
              "provider"
            );

            return true;
          },

        runDelivery:
          async () => {
            order.push(
              "delivery"
            );

            return {
              claimed: 3,
              providerCalls: 2,
            };
          },
      });

    assert.deepEqual(
      order,
      [
        "evaluation",
        "provider",
        "delivery",
      ]
    );

    assert.equal(
      outcome.delivery.executed,
      true
    );

    assert.equal(
      outcome.delivery.providerConfigured,
      true
    );

    assert.deepEqual(
      outcome.delivery.summary,
      {
        claimed: 3,
        providerCalls: 2,
      }
    );
  }
);

test(
  "evaluation failure prevents provider and delivery execution",
  async () => {
    let providerCalls = 0;
    let deliveryCalls = 0;

    await assert.rejects(
      () =>
        runAlertScheduledExecution({
          runEvaluation:
            async () => {
              throw new Error(
                "evaluation failed"
              );
            },

          deliveryExecutionEnabled:
            true,

          isDeliveryProviderReady:
            () => {
              providerCalls += 1;
              return true;
            },

          runDelivery:
            async () => {
              deliveryCalls += 1;

              return {
                claimed: 1,
              };
            },
        }),
      /evaluation failed/
    );

    assert.equal(
      providerCalls,
      0
    );

    assert.equal(
      deliveryCalls,
      0
    );
  }
);

test(
  "delivery worker failure propagates after successful evaluation",
  async () => {
    await assert.rejects(
      () =>
        runAlertScheduledExecution({
          runEvaluation:
            async () => ({
              evaluated: 1,
            }),

          deliveryExecutionEnabled:
            true,

          isDeliveryProviderReady:
            () => true,

          runDelivery:
            async () => {
              throw new Error(
                "delivery failed"
              );
            },
        }),
      /delivery failed/
    );
  }
);
