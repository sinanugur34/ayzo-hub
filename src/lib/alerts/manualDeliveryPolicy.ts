export const MANUAL_ALERT_DELIVERY_CLAIM_LIMIT =
  1;

export function isValidManualAlertDeliveryClaimLimit(
  value: unknown
) {
  return (
    value ===
    MANUAL_ALERT_DELIVERY_CLAIM_LIMIT
  );
}
