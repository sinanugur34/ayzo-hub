import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { AYZO_GOOGLE_PLAY_URL } from "../lib/appStore";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("Android app listing is the canonical Google Play destination", () => {
  assert.equal(
    AYZO_GOOGLE_PLAY_URL,
    "https://play.google.com/store/apps/details?id=io.ayzo.app"
  );
});

test("Download entry points are wired in research, home/results and footer", () => {
  const research = read("src/components/AppResearchDesk.tsx");
  const homepage = read("src/app/page.tsx");
  const layout = read("src/app/layout.tsx");
  assert.match(research, /AppStoreInlineLink placement="research"/);
  assert.match(homepage, /<AppInstallPromo placement=\{hasResult \? "results" : "home"\}/);
  assert.match(layout, /AppStoreInlineLink placement="footer"/);
});

test("QR is stored locally, has a visible light background and no remote pixel", () => {
  const qr = read("public/ayzo-google-play-qr.svg");
  assert.match(qr, /<svg /);
  assert.match(qr, /fill="#fff"/);
  assert.match(qr, /<path /);
  assert.doesNotMatch(qr, /<image|<script|xlink:href|onload=/i);
});

test("Promo uses a consent-aware analytics event, no wallet permissions", () => {
  const promo = read("src/components/AppInstallPromo.tsx");
  assert.match(promo, /android_play_store_click/);
  assert.match(promo, /trackEvent/);
  assert.doesNotMatch(promo, /service_role|privateKey|wallet\.connect/);
});
