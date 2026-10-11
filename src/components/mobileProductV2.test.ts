import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync("src/app/page.tsx", "utf8");
const desk = readFileSync("src/components/AppResearchDesk.tsx", "utf8");
const styles = readFileSync("src/components/AppResearchDesk.module.css", "utf8");

test("canonical home controller passes all registered live networks", () => {
  assert.match(home, /NETWORK_IDS\.filter/);
  assert.match(home, /\.status === "live"/);
  assert.match(home, /liveNetworks=\{LIVE_NETWORKS\}/);
  assert.match(home, /onNetworkChange=\{selectNetwork\}/);
});

test("approved compact selector filters and renders canonical networks", () => {
  assert.match(desk, /filteredNetworks\.map/);
  assert.match(desk, /NETWORKS\[id\]/);
  assert.match(desk, /aria-pressed=\{/);
  assert.match(desk, /chooseNetwork/);
});

test("native mobile entry has accessible non-autocorrecting address field", () => {
  assert.match(desk, /id="ayzo-public-address"/);
  assert.match(desk, /autoCapitalize="none"/);
  assert.match(desk, /autoCorrect="off"/);
  assert.match(desk, /enterKeyHint="go"/);
  assert.match(desk, /aria-invalid=\{/);
  assert.match(desk, /onAddressChange/);
  assert.doesNotMatch(desk, /h-\[200px\]/);
});

test("mobile analyzer action respects loading and empty-address state", () => {
  assert.match(desk, /type="submit"/);
  assert.match(desk, /disabled=\{[\s\S]*?loading[\s\S]*?address/);
  assert.match(desk, /styles\.analyze/);
});

test("small screens have bounded network scrolling and reliable touch targets", () => {
  assert.match(styles, /overflow-y: auto/);
  assert.match(styles, /max-height: 68dvh/);
  assert.match(styles, /@media \(max-width: 370px\)/);
  assert.match(styles, /min-height: 48px/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("post-Oct8 network validation remains in the main controller", () => {
  assert.match(home, /isNetworkSelectionBlocked/);
  assert.match(home, /nativeVerificationMessage/);
  assert.match(home, /manuallySelectedAddress\.current = null/);
});
