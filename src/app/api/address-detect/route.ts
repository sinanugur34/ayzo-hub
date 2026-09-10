import {
  NextResponse,
} from "next/server";

import {
  isAddress,
} from "@solana/kit";

import {
  isBitcoinMainnetAddress,
} from "@/lib/intelligence/bitcoin/address";

import {
  isDogecoinMainnetAddress,
} from "@/lib/intelligence/dogecoin/address";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

type DetectedNetwork =
  | "bitcoin"
  | "dogecoin"
  | "solana"
  | "evm"
  | null;

export async function POST(
  request: Request
) {
  let body:
    unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("address" in body) ||
    typeof (
      body as {
        address?: unknown;
      }
    ).address !== "string"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Address is required.",
      },
      {
        status: 400,
      }
    );
  }

  const address =
    (
      body as {
        address: string;
      }
    ).address.trim();

  if (
    !address ||
    address.length > 128
  ) {
    return NextResponse.json({
      ok: true,
      network:
        null satisfies DetectedNetwork,
    });
  }

  let network:
    DetectedNetwork =
      null;

  /*
   * Exact native-chain validators go
   * before Solana because multiple
   * address families use Base58.
   */
  if (
    isBitcoinMainnetAddress(
      address
    )
  ) {
    network =
      "bitcoin";
  } else if (
    isDogecoinMainnetAddress(
      address
    )
  ) {
    network =
      "dogecoin";
  } else if (
    EVM_ADDRESS.test(
      address
    )
  ) {
    network =
      "evm";
  } else if (
    isAddress(
      address
    )
  ) {
    network =
      "solana";
  }

  return NextResponse.json({
    ok: true,
    network,
  });
}
