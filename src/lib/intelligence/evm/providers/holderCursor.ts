/**
 * One entry-point for the internal EVM holder API cursor contract.
 * Always treat cursors as opaque and provider-owned; never translate them.
 * Legacy GoldRush/Ankr cursors remain valid during the migration.
 */
export function isValidEvmHolderCursor(cursor: string | null): boolean {
  if (cursor === null) return true;
  if (cursor === "__INVALID__" || cursor.length === 0) return false;

  if (/^\d{1,12}$/.test(cursor)) return true;
  if (/^ankr:\S{1,12000}$/.test(cursor)) return true;

  // Both indexer adapters encode a bounded JSON continuation in base64url.
  for (const provider of ["routescan", "blockscout"] as const) {
    const prefix = `${provider}:`;
    if (!cursor.startsWith(prefix)) continue;
    if (cursor.length > 2200) return false;
    const encoded = cursor.slice(prefix.length);
    return encoded.length > 0 && /^[A-Za-z0-9_-]+$/.test(encoded);
  }
  return false;
}
