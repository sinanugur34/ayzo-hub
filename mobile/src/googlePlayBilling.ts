import {
  Capacitor,
  registerPlugin,
} from "@capacitor/core";

import {
  GOOGLE_PLAY_PRODUCT_IDS,
} from "./googlePlayCatalog";

export type GooglePlayPricingPhase = {
  formattedPrice: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  billingPeriod: string;
  recurrenceMode: number;
  billingCycleCount: number;
};

export type GooglePlaySubscriptionOffer = {
  basePlanId: string;
  offerId?: string;
  offerToken: string;
  pricingPhases:
    GooglePlayPricingPhase[];
};

export type GooglePlaySubscriptionProduct = {
  productId: string;
  title: string;
  description: string;
  offers:
    GooglePlaySubscriptionOffer[];
};

type GooglePlayProductsResponse = {
  products:
    GooglePlaySubscriptionProduct[];
};

type AyzoPlayBillingPlugin = {
  getSubscriptionProducts(
    options: {
      productIds:
        readonly string[];
    }
  ): Promise<
    GooglePlayProductsResponse
  >;
};

const AyzoPlayBilling =
  registerPlugin<
    AyzoPlayBillingPlugin
  >(
    "AyzoPlayBilling"
  );

export function isGooglePlayBillingAvailable() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() ===
      "android"
  );
}

export async function getGooglePlaySubscriptionProducts():
  Promise<
    GooglePlayProductsResponse
  > {
  if (
    !isGooglePlayBillingAvailable()
  ) {
    return {
      products: [],
    };
  }

  /*
   * ProductDetails are display/catalog
   * information only.
   *
   * Never derive AYZO entitlement from
   * this response.
   */
  return AyzoPlayBilling
    .getSubscriptionProducts({
      productIds:
        GOOGLE_PLAY_PRODUCT_IDS,
    });
}
