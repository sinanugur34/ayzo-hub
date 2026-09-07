export const ALERT_DELIVERY_ENABLE_ENV =
  "AYZO_ALERT_DELIVERY_ENABLED";

export function isAlertDeliveryEnabled(
  value:
    | string
    | undefined
) {
  return (
    value
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}
