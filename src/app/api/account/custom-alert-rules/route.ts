import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  parseCreateCustomAlertRule,
} from "@/lib/account/alertRules";

import {
  canUseCustomAlertRules,
} from "@/lib/account/customAlertRulesAccess";

import {
  requestTooLarge,
} from "@/lib/account/validation";

import {
  resolveIntelligenceNetwork,
} from "@/lib/intelligence/router";

import {
  isBitcoinMainnetAddress,
} from "@/lib/intelligence/bitcoin/address";

export const dynamic =
  "force-dynamic";

const evmAddress =
  /^0x[0-9a-fA-F]{40}$/;

const selectFields = `
  id,
  network,
  subject_type,
  subject_value,
  rule_type,
  rule_config,
  delivery_channel,
  enabled,
  created_at,
  updated_at
`;

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

async function authorize() {
  const context =
    await getAuthenticatedAccountContext();

  if (!context.userId) {
    return {
      context,
      response:
        json(
          {
            error:
              "Unauthorized",
          },
          401
        ),
    };
  }

  if (
    !await canUseCustomAlertRules(
      context.userId
    )
  ) {
    return {
      context,
      response:
        json(
          {
            error:
              "Custom Alert Rules requires AYZO Advanced.",
            code:
              "PLAN_REQUIRED",
          },
          403
        ),
    };
  }

  return {
    context,
    response:
      null,
  };
}

function customConfig(
  value: unknown
) {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (
      value as Record<
        string,
        unknown
      >
    ).mode ===
      "advanced_custom"
  );
}

export async function GET() {
  const {
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "alert_rules"
      )
      .select(
        selectFields
      )
      .eq(
        "user_id",
        context.userId!
      )
      .eq(
        "rule_type",
        "new_activity"
      )
      .is(
        "watchlist_id",
        null
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(100);

  if (error) {
    return json(
      {
        error:
          "Unable to load Custom Alert Rules.",
      },
      500
    );
  }

  return json({
    rules:
      (data ?? [])
        .filter(
          rule =>
            customConfig(
              rule.rule_config
            )
        ),
  });
}

export async function POST(
  request: Request
) {
  if (
    requestTooLarge(
      request,
      16_384
    )
  ) {
    return json(
      {
        error:
          "Request too large.",
      },
      413
    );
  }

  const {
    context,
    response,
  } =
    await authorize();

  if (response) {
    return response;
  }

  const body =
    await request
      .json()
      .catch(
        () => null
      );

  const parsed =
    parseCreateCustomAlertRule(
      body
    );

  if (!parsed) {
    return json(
      {
        error:
          "Invalid custom alert rule.",
      },
      400
    );
  }

  const resolution =
    resolveIntelligenceNetwork(
      parsed.network
    );

  if (!resolution.ok) {
    return json(
      {
        error:
          "Network is unavailable for monitoring.",
      },
      400
    );
  }

  if (
    resolution.engine ===
      "bitcoin"
  ) {
    if (
      parsed.subjectType !==
        "wallet" ||
      !isBitcoinMainnetAddress(
        parsed.subjectValue
      )
    ) {
      return json(
        {
          error:
            "Bitcoin custom alerts require a valid wallet address.",
        },
        400
      );
    }
  } else if (
    resolution.engine ===
      "evm"
  ) {
    if (
      (
        parsed.subjectType !==
          "wallet" &&
        parsed.subjectType !==
          "token"
      ) ||
      !evmAddress.test(
        parsed.subjectValue
      )
    ) {
      return json(
        {
          error:
            "EVM custom alerts require a valid 0x wallet or token address.",
        },
        400
      );
    }
  } else {
    return json(
      {
        error:
          "Custom activity monitoring is not live for this network yet.",
      },
      400
    );
  }

  const {
    data,
    error,
  } =
    await context.supabase
      .from(
        "alert_rules"
      )
      .insert({
        user_id:
          context.userId!,

        watchlist_id:
          null,

        network:
          parsed.network,

        subject_type:
          parsed.subjectType,

        subject_value:
          parsed.subjectValue,

        rule_type:
          "new_activity",

        rule_config: {
          version:
            1,
          mode:
            "advanced_custom",
          minimumNewEvidence:
            parsed.minimumNewEvidence,
        },

        delivery_channel:
          "email",

        enabled:
          parsed.enabled,
      })
      .select(
        selectFields
      )
      .single();

  if (error) {
    return json(
      {
        error:
          "Unable to create Custom Alert Rule.",
      },
      500
    );
  }

  return json(
    {
      rule:
        data,
    },
    201
  );
}
