import { cookies } from "next/headers";
import {
  FREE_DEVICE_COOKIE,
  FREE_DEVICE_COOKIE_MAX_AGE,
} from "@/lib/freeQuota";

import {
  getAnalysisQuotaStatus,
} from "@/lib/analysisQuota";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const quota = await getAnalysisQuotaStatus(request);

  if (quota.deviceCookie) {
    const cookieStore = await cookies();

    cookieStore.set(
      FREE_DEVICE_COOKIE,
      quota.deviceCookie,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: FREE_DEVICE_COOKIE_MAX_AGE,
      }
    );
  }

  return Response.json(
    {
      ok: true,
      plan: quota.plan,
      available: quota.available,
      limit: quota.limit,
      remaining: quota.remaining,
      resetAt: quota.resetAt,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
