type AnalyticsValue =
  | string
  | number
  | boolean;

type AnalyticsParams =
  Record<
    string,
    AnalyticsValue
  >;

type AnalyticsWindow =
  Window & {
    gtag?: (
      ...args: unknown[]
    ) => void;
  };

export function trackEvent(
  name: string,
  params:
    AnalyticsParams = {}
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  (
    window as AnalyticsWindow
  ).gtag?.(
    "event",
    name,
    params
  );
}
