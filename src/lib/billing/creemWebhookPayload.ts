export type CreemWebhookEvent = {
  id: string;
  eventType: string;

  object: {
    id: string;
    status: string | null;

    product: {
      id: string;
      price: number;
      currency: string;
      billing_period:
        string | null;
    };

    customer: {
      id: string;
      email:
        string | null;
    };

    current_period_start_date:
      string | null;

    current_period_end_date:
      string | null;

    metadata:
      Record<
        string,
        unknown
      >;
  };
};

function record(
  value: unknown
): Record<
  string,
  unknown
> | null {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  )
    ? value as Record<
        string,
        unknown
      >
    : null;
}

function stringValue(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : null;
}

export function parseCreemWebhookPayload(
  rawBody: string
):
  | {
      ok: true;
      event:
        CreemWebhookEvent;
    }
  | {
      ok: false;
    } {
  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        rawBody
      );
  } catch {
    return {
      ok: false,
    };
  }

  const root =
    record(parsed);

  const object =
    record(
      root?.object
    );

  const product =
    record(
      object?.product
    );

  const customer =
    record(
      object?.customer
    );

  const metadata =
    record(
      object?.metadata
    ) ?? {};

  const id =
    stringValue(
      root?.id
    );

  const eventType =
    stringValue(
      root?.eventType
    );

  const subscriptionId =
    stringValue(
      object?.id
    );

  const productId =
    stringValue(
      product?.id
    );

  const customerId =
    stringValue(
      customer?.id
    );

  const price =
    product?.price;

  const currency =
    stringValue(
      product?.currency
    );

  if (
    !id ||
    !eventType ||
    !subscriptionId ||
    !productId ||
    !customerId ||
    typeof price !==
      "number" ||
    !Number.isInteger(price) ||
    price < 0 ||
    !currency
  ) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,

    event: {
      id,
      eventType,

      object: {
        id:
          subscriptionId,

        status:
          stringValue(
            object?.status
          ),

        product: {
          id:
            productId,

          price,

          currency,

          billing_period:
            stringValue(
              product
                ?.billing_period
            ),
        },

        customer: {
          id:
            customerId,

          email:
            stringValue(
              customer?.email
            ),
        },

        current_period_start_date:
          stringValue(
            object
              ?.current_period_start_date
          ),

        current_period_end_date:
          stringValue(
            object
              ?.current_period_end_date
          ),

        metadata,
      },
    },
  };
}
