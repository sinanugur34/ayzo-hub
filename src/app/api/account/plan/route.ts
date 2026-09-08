import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const {
    entitlement,
  } =
    await getServerEntitlement();

  return Response.json(
    {
      ok: true,
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
