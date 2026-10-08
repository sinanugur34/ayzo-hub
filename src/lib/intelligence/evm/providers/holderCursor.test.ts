import assert from "node:assert/strict";
import test from "node:test";
import { isValidEvmHolderCursor } from "./holderCursor";

test("holder API preserves legacy numeric and Ankr continuation", () => {
  for (const cursor of [null, "0", "19", "ankr:opaque-next-page"]) {
    assert.equal(isValidEvmHolderCursor(cursor), true);
  }
});

test("holder API accepts bounded Routescan and Blockscout continuation", () => {
  for (const provider of ["routescan", "blockscout"]) {
    const cursor = `${provider}:${Buffer.from(JSON.stringify({ next: "page" })).toString("base64url")}`;
    assert.equal(isValidEvmHolderCursor(cursor), true);
  }
});

test("holder API rejects malformed or unbounded continuations", () => {
  for (const cursor of [
    "", "__INVALID__", "unknown:AA", "routescan:", "blockscout:",
    "routescan:unsafe+value", "blockscout:a/b", "routescan:--\n--",
    "routescan:" + "A".repeat(2200), "blockscout:" + "A".repeat(2300),
    "ankr:next page", "-3", "abc", "1".repeat(200),
  ]) {
    assert.equal(isValidEvmHolderCursor(cursor), false, cursor.slice(0, 60));
  }
});
