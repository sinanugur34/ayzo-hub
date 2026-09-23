export type AdminSignupInsightRow = {
  dimension:
    string;
  value:
    string;
  total:
    number |
    string;
};

export type AdminSignupInsights = {
  tracking: {
    recorded: number;
    unknown: number;
  };

  period: {
    last7d: number;
    last30d: number;
  };

  channel: {
    web: number;
    android: number;
    ios: number;
    unknown: number;
  };

  device: {
    desktop: number;
    phone: number;
    tablet: number;
    unknown: number;
  };

  os: Array<{
    value: string;
    total: number;
  }>;

  countries: Array<{
    code: string;
    total: number;
  }>;
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
    ? parsed
    : 0;
}

export function buildAdminSignupInsights(
  rows:
    AdminSignupInsightRow[]
): AdminSignupInsights {
  const result:
    AdminSignupInsights = {
      tracking: {
        recorded: 0,
        unknown: 0,
      },

      period: {
        last7d: 0,
        last30d: 0,
      },

      channel: {
        web: 0,
        android: 0,
        ios: 0,
        unknown: 0,
      },

      device: {
        desktop: 0,
        phone: 0,
        tablet: 0,
        unknown: 0,
      },

      os: [],

      countries: [],
    };

  for (
    const row of rows
  ) {
    const total =
      safeCount(
        row.total
      );

    if (
      row.dimension ===
        "tracking"
    ) {
      if (
        row.value ===
        "recorded"
      ) {
        result.tracking.recorded =
          total;
      }

      if (
        row.value ===
        "unknown"
      ) {
        result.tracking.unknown =
          total;
      }
    }

    if (
      row.dimension ===
        "period"
    ) {
      if (
        row.value ===
        "last_7d"
      ) {
        result.period.last7d =
          total;
      }

      if (
        row.value ===
        "last_30d"
      ) {
        result.period.last30d =
          total;
      }
    }

    if (
      row.dimension ===
        "channel" &&
      row.value in
        result.channel
    ) {
      result.channel[
        row.value as
          keyof typeof result.channel
      ] =
        total;
    }

    if (
      row.dimension ===
        "device" &&
      row.value in
        result.device
    ) {
      result.device[
        row.value as
          keyof typeof result.device
      ] =
        total;
    }

    if (
      row.dimension ===
        "os"
    ) {
      result.os.push({
        value:
          row.value,
        total,
      });
    }

    if (
      row.dimension ===
        "country"
    ) {
      result.countries.push({
        code:
          row.value,
        total,
      });
    }
  }

  result.os.sort(
    (
      a,
      b
    ) =>
      b.total -
        a.total ||
      a.value.localeCompare(
        b.value
      )
  );

  result.countries.sort(
    (
      a,
      b
    ) =>
      b.total -
        a.total ||
      a.code.localeCompare(
        b.code
      )
  );

  return result;
}
