import { isAddress } from "@solana/kit";
import {
  NETWORKS,
  NETWORK_IDS,
  type NetworkId,
} from "@/lib/networks/registry";
import { isBitcoinMainnetAddress } from "@/lib/intelligence/bitcoin/address";
import { isDogecoinMainnetAddress } from "@/lib/intelligence/dogecoin/address";
import { isLitecoinMainnetAddress } from "@/lib/intelligence/litecoin/address";
import { isTronAddress } from "@/lib/intelligence/tron/address";
import { isXrplClassicAddress } from "@/lib/intelligence/xrpl/address";
import { isSuiAddress } from "@/lib/intelligence/sui/address";
import { normalizeAptosAddress } from "@/lib/intelligence/aptos/address";
import { isTonAddress } from "@/lib/intelligence/ton/address";
import { isStellarAccountAddress } from "@/lib/intelligence/stellar/address";
import { isCardanoMainnetAddress } from "@/lib/intelligence/cardano/address";
import { normalizeHederaAccountId } from "@/lib/intelligence/hedera/address";
import { normalizeZcashTransparentAddress } from "@/lib/intelligence/zcash/address";
import { normalizeAlgorandAddress } from "@/lib/intelligence/algorand/address";
import { normalizePolkadotAddress } from "@/lib/intelligence/polkadot/address";
import { normalizeCosmosAddress } from "@/lib/intelligence/cosmos/address";
import { normalizeInjectiveAddress } from "@/lib/intelligence/injective/address";
import { DISCOVERY_NETWORKS } from "./evmContractDiscovery";

export const EVM_ACCOUNT_SHAPE = /^0x[0-9a-fA-F]{40}$/;
const APTOS_HEX = /^(?:0x)?[0-9a-fA-F]{1,64}$/;

type Validator = (address: string) => boolean;

/**
 * Every live non-EVM network must have a registered strategy.
 * New networks fail the coverage test until a strategy is registered.
 * Validators establish network-specific address format, NOT chain activity.
 */
export const NATIVE_VALIDATORS: Partial<Record<NetworkId, Validator>> = {
  solana: isAddress,
  bitcoin: isBitcoinMainnetAddress,
  dogecoin: isDogecoinMainnetAddress,
  litecoin: isLitecoinMainnetAddress,
  tron: isTronAddress,
  xrp: isXrplClassicAddress,
  sui: isSuiAddress,
  aptos: value => normalizeAptosAddress(value) !== null,
  ton: isTonAddress,
  stellar: isStellarAccountAddress,
  cardano: isCardanoMainnetAddress,
  hedera: value => normalizeHederaAccountId(value) !== null,
  zcash: value => normalizeZcashTransparentAddress(value) !== null,
  algorand: value => normalizeAlgorandAddress(value) !== null,
  polkadot: value => normalizePolkadotAddress(value) !== null,
  cosmos: value => normalizeCosmosAddress(value) !== null,
  injective: value => normalizeInjectiveAddress(value) !== null,
  hyperliquid: value => EVM_ACCOUNT_SHAPE.test(value),
};

export const LIVE_NETWORK_IDS: readonly NetworkId[] = NETWORK_IDS.filter(
  id => NETWORKS[id].status === "live"
);

export function uncoveredLiveNetworks(): NetworkId[] {
  return LIVE_NETWORK_IDS.filter(id =>
    NETWORKS[id].family === "evm"
      ? !DISCOVERY_NETWORKS.includes(id)
      : !NATIVE_VALIDATORS[id]
  );
}

/**
 * Do not trust shape alone for 20-byte hex addresses: the same bytes
 * can be EVM, Hyperliquid, and short-form Aptos/Sui addresses.
 * Full EVM contract bytecode probes are handled by the route.
 */
export function detectNativeCandidates(address: string): NetworkId[] {
  const trimmed = address.trim();
  if (!trimmed || trimmed.length > 128 || EVM_ACCOUNT_SHAPE.test(trimmed)) {
    return [];
  }

  // Aptos accepts short bare hexadecimal values, but a short hex literal
  // has insufficient chain identity for automatic selection.
  const ambiguousBareAptos = !trimmed.toLowerCase().startsWith("0x") &&
    APTOS_HEX.test(trimmed) && trimmed.length < 64;

  const candidates: NetworkId[] = [];
  for (const id of LIVE_NETWORK_IDS) {
    if (NETWORKS[id].family === "evm") continue;
    const valid = NATIVE_VALIDATORS[id];
    try {
      if (valid?.(trimmed)) candidates.push(id);
    } catch {
      // A failing native validator is not evidence of a matching network.
    }
  }
  // Short bare Aptos inputs are not unique enough for automatic selection.
  if (ambiguousBareAptos && candidates.length === 1 && candidates[0] === "aptos") {
    return [];
  }
  return candidates;
}
