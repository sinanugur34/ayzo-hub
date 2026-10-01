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

import {
  isLitecoinMainnetAddress,
} from "@/lib/intelligence/litecoin/address";

import {
  isSuiAddress,
} from "@/lib/intelligence/sui/address";

import {
  isTonAddress,
} from "@/lib/intelligence/ton/address";

import {
  isStellarAccountAddress,
} from "@/lib/intelligence/stellar/address";

import {
  isTronAddress,
} from "@/lib/intelligence/tron/address";

import {
  isXrplClassicAddress,
} from "@/lib/intelligence/xrpl/address";

import {
  isCardanoMainnetAddress,
} from "@/lib/intelligence/cardano/address";

import {
  normalizeZcashTransparentAddress,
} from "@/lib/intelligence/zcash/address";

import {
  normalizeAlgorandAddress,
} from "@/lib/intelligence/algorand/address";

import {
  normalizePolkadotAddress,
} from "@/lib/intelligence/polkadot/address";

import {
  normalizeCosmosAddress,
} from "@/lib/intelligence/cosmos/address";

import {
  normalizeInjectiveAddress,
} from "@/lib/intelligence/injective/address";

const EVM_ADDRESS =
  /^0x[0-9a-fA-F]{40}$/;

function isDistinctLitecoinAddress(
  value: string
): boolean {
  const address =
    value.trim();

  const distinctPrefix =
    address.startsWith(
      "L"
    ) ||
    address.startsWith(
      "M"
    ) ||
    address
      .toLowerCase()
      .startsWith(
        "ltc1"
      );

  return (
    distinctPrefix &&
    isLitecoinMainnetAddress(
      address
    )
  );
}

type DetectedNetwork =
  | "bitcoin"
  | "dogecoin"
  | "litecoin"
  | "sui"
  | "ton"
  | "stellar"
  | "tron"
  | "xrp"
  | "cardano"
  | "zcash"
  | "algorand"
  | "polkadot"
  | "cosmos"
  | "injective"
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
    isDistinctLitecoinAddress(
      address
    )
  ) {
    network =
      "litecoin";
  } else if (
    isTonAddress(
      address
    )
  ) {
    network =
      "ton";
  } else if (
    isStellarAccountAddress(
      address
    )
  ) {
    network =
      "stellar";
  } else if (
    isTronAddress(
      address
    )
  ) {
    network =
      "tron";
  } else if (
    isXrplClassicAddress(
      address
    )
  ) {
    network =
      "xrp";
  } else if (
    isCardanoMainnetAddress(
      address
    )
  ) {
    network =
      "cardano";
  } else if (
    normalizeZcashTransparentAddress(
      address
    )
  ) {
    network =
      "zcash";
  } else if (
    normalizeAlgorandAddress(
      address
    )
  ) {
    network =
      "algorand";
  } else if (
    normalizePolkadotAddress(
      address
    )
  ) {
    network =
      "polkadot";
  } else if (
    normalizeCosmosAddress(
      address
    )
  ) {
    network =
      "cosmos";
  } else if (
    normalizeInjectiveAddress(
      address
    )
  ) {
    network =
      "injective";
  } else if (
    EVM_ADDRESS.test(
      address
    )
  ) {
    network =
      "evm";
  } else if (
    isSuiAddress(
      address
    )
  ) {
    network =
      "sui";
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
