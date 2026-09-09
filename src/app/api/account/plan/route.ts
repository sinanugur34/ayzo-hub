import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const {
    entitlement,
    userId,
    userEmail,
  } =
    await getServerEntitlement();

  return Response.json(
    {
      ok: true,
      authenticated:
        userId !==
        null,

      email:
        userEmail,

      plan:
        entitlement.planId,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
