import type { EvmTokenTransfersRequest, EvmTransfersProvider } from "../provider";
import type { EvmProviderResult, EvmTransfersPage } from "../types";
import { alchemyTransfersProvider } from "./alchemyTransfers";
import { etherscanLogTransfersProvider } from "./etherscanLogTransfers";
import { isAlchemyFreeEapiNetwork } from "./alchemyEapiNetworks";

export type PreferredTransferDependencies = { alchemy?: EvmTransfersProvider };
const fail = (message: string): EvmProviderResult<EvmTransfersPage> => ({
  ok: false, providerId: "etherscan", latencyMs: null,
  code: "UPSTREAM_ERROR", error: message,
});
export async function getPreferredEvmTokenTransfers(
  request: EvmTokenTransfersRequest,
  dependencies: PreferredTransferDependencies = {}
): Promise<EvmProviderResult<EvmTransfersPage>> {
  const cursor = request.cursor ?? "";
  const alchemy = dependencies.alchemy ?? alchemyTransfersProvider;
  // Numeric/wallet/events cursors belonged to the retired indexer.
  if (/^(?:\d+|wallet:\d+:\d+|events:\d+:\d+)$/.test(cursor))
    return fail("Retired token transfer cursor; restart the analysis from page one.");
  const logCursor = cursor.startsWith("etherscan-log:");
  const isPreviewCanary = process.env.AYZO_GOLDRUSH_EXIT_CANARY === "1" &&
    process.env.VERCEL_ENV === "preview";
  if (logCursor || (!cursor && !isAlchemyFreeEapiNetwork(request.network.networkId))) {
    if (!isPreviewCanary || !etherscanLogTransfersProvider.supportsNetwork(request.network))
      return fail("Non-retired transfer provider unavailable or not production certified.");
    return etherscanLogTransfersProvider.getTokenTransfers(request);
  }
  if (cursor && !cursor.startsWith("alchemy-transfer:"))
    return fail("Unknown token transfer cursor; provider translation forbidden.");
  if (!alchemy.supportsNetwork(request.network) || !alchemy.supportsCapability("tokenTransfers"))
    return fail("Non-retired token transfer provider does not support this network.");
  return alchemy.getTokenTransfers(request);
}
