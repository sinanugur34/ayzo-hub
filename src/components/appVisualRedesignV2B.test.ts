import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const example =
  fs.readFileSync(
    "src/components/ExampleInvestigationGallery.tsx",
    "utf8"
  );

const pricing =
  fs.readFileSync(
    "src/components/PricingPlans.tsx",
    "utf8"
  );

const cards =
  fs.readFileSync(
    "src/components/PricingPlanCards.tsx",
    "utf8"
  );

const matrix =
  fs.readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

const ask =
  fs.readFileSync(
    "src/components/AskAyzoAssistantProvider.tsx",
    "utf8"
  );

const page =
  fs.readFileSync(
    "src/app/page.tsx",
    "utf8"
  );

const globalCss =
  fs.readFileSync(
    "src/app/globals.css",
    "utf8"
  );

test(
  "frozen examples remain illustrative and do not run providers",
  () => {
    assert.match(
      example,
      /FROZEN SAMPLE/
    );

    assert.match(
      example,
      /Illustrative frozen examples only/
    );

    assert.match(
      example,
      /No live request is made/
    );

    assert.match(
      example,
      /trackEvent/
    );

    assert.doesNotMatch(
      example,
      /fetch\(/
    );
  }
);

test(
  "example tabs expose selected state accessibly",
  () => {
    assert.match(
      example,
      /data-ayzo-example-tab/
    );

    assert.match(
      example,
      /aria-pressed/
    );

    assert.match(
      example,
      /data-ayzo-example-preview/
    );
  }
);

test(
  "pricing continues to derive account, plan and checkout truth from real sources",
  () => {
    assert.match(
      pricing,
      /"\/api\/account\/plan"/
    );

    assert.match(
      pricing,
      /PLAN_ORDER\.slice/
    );

    assert.match(
      pricing,
      /NEXT_PUBLIC_AYZO_PAID_CHECKOUT_ENABLED/
    );

    assert.match(
      pricing,
      /<PricingPlanCards/
    );

    assert.match(
      cards,
      /PLANS/
    );

    assert.equal(
      (
        cards.match(
          /<PlanCheckoutButton/g
        ) ?? []
      ).length,
      2
    );

    assert.match(
      cards,
      /interval="monthly"/
    );

    assert.match(
      cards,
      /interval="annual"/
    );
  }
);

test(
  "paid users still hide lower tiers rather than using a preview package selector",
  () => {
    assert.match(
      pricing,
      /currentIndex/
    );

    assert.match(
      pricing,
      /visiblePlans/
    );

    assert.doesNotMatch(
      pricing,
      /previewPlan/
    );

    assert.doesNotMatch(
      pricing,
      /packageSelector/
    );
  }
);

test(
  "plan matrix remains registry derived",
  () => {
    assert.match(
      matrix,
      /planHasFeature/
    );

    assert.match(
      matrix,
      /planHasRoadmapFeature/
    );

    assert.match(
      matrix,
      /NETWORKS/
    );

    assert.match(
      matrix,
      /network\.status ===\s*"live"/
    );

    assert.match(
      matrix,
      /data-ayzo-plan-matrix/
    );
  }
);

test(
  "Ask AYZO still uses the real account investigator endpoint and plan gates",
  () => {
    assert.match(
      ask,
      /"\/api\/account\/ask-ayzo"/
    );

    assert.match(
      ask,
      /response\.status ===\s*401/
    );

    assert.match(
      ask,
      /response\.status ===\s*403/
    );

    assert.match(
      ask,
      /available on Pro and Advanced plans/
    );

    assert.match(
      ask,
      /evidencePayload/
    );

    assert.match(
      ask,
      /recentConversation/
    );
  }
);

test(
  "Ask AYZO detailed surface exposes real interaction states",
  () => {
    assert.match(
      ask,
      /ayzo-ask-v2/
    );

    assert.match(
      ask,
      /ayzo-ask-trigger-v2/
    );

    assert.match(
      ask,
      /ayzo-ask-result-v2/
    );

    assert.match(
      ask,
      /aria-busy/
    );
  }
);

test(
  "pricing access trigger remains linked and accessible",
  () => {
    assert.match(
      page,
      /id="ayzo-plans-access-trigger"/
    );

    assert.match(
      page,
      /aria-controls="ayzo-plans-access"/
    );

    assert.match(
      page,
      /ayzo-plans-trigger-v2/
    );

    assert.match(
      page,
      /ayzo-plans-body-v2/
    );
  }
);

test(
  "V2B visual system is scoped and uses approved AYZO colors",
  () => {
    assert.match(
      globalCss,
      /AYZO APP VISUAL V2B — PRODUCT SURFACES/
    );

    assert.match(
      globalCss,
      /#0b1020/
    );

    assert.match(
      globalCss,
      /#baa7ff/
    );

    assert.match(
      globalCss,
      /#a8fcdb/
    );

    assert.match(
      globalCss,
      /safe-area-inset-bottom/
    );

    assert.match(
      globalCss,
      /prefers-reduced-motion/
    );
  }
);
