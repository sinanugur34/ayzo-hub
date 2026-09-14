import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedAccountContext,
} from "@/lib/account/auth";

import {
  handleAdvancedReportRequest,
} from "@/lib/account/advancedReportRequest";

import {
  requestTooLarge,
} from "@/lib/account/validation";

import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

export const dynamic =
  "force-dynamic";

function noStoreJson(
  body:
    unknown,
  status =
    200
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

export async function POST(
  request:
    Request
) {
  if (
    requestTooLarge(
      request
    )
  ) {
    return noStoreJson(
      {
        error:
          "Request too large.",
      },
      413
    );
  }

  const {
    userId,
  } =
    await getAuthenticatedAccountContext();

  const {
    entitlement,
  } =
    await getServerEntitlement();

  const body =
    await request
      .json()
      .catch(
        () =>
          null
      );

  const result =
    handleAdvancedReportRequest({
      authenticated:
        userId !== null,

      planId:
        entitlement.planId,

      body,
    });

  return noStoreJson(
    result.body,
    result.status
  );
}
