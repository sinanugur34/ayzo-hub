import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";

import type {
  BillingInterval,
  PlanId,
} from "../../src/lib/plans/types";

import {
  GOOGLE_PLAY_PRODUCT_IDS,
  getGooglePlaySubscriptionSelection,
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

export type GooglePlayPurchase = {
  purchaseToken: string;
  products: string[];
  purchaseState: number;
  acknowledged: boolean;
  purchaseTime: number;
  orderId?: string;
};

export type GooglePlayPurchaseUpdate = {
  responseCode: number;
  debugMessage?: string;
  purchases: GooglePlayPurchase[];
};

type GooglePlayProductsResponse = {
  products:
    GooglePlaySubscriptionProduct[];
};

type GooglePlayLaunchResponse = {
  responseCode: number;
  debugMessage?: string;
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

  launchSubscriptionPurchase(
    options: {
      productId: string;
      basePlanId: string;
    }
  ): Promise<
    GooglePlayLaunchResponse
  >;

  addListener(
    eventName: "billingUpdated",
    listener: (
      event:
        GooglePlayPurchaseUpdate
    ) => void
  ): Promise<
    PluginListenerHandle
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

  return AyzoPlayBilling
    .getSubscriptionProducts({
      productIds:
        GOOGLE_PLAY_PRODUCT_IDS,
    });
}

export async function startGooglePlaySubscriptionPurchase(
  options: {
    planId: PlanId;
    interval: BillingInterval;
  }
): Promise<
  GooglePlayLaunchResponse
> {
  if (
    !isGooglePlayBillingAvailable()
  ) {
    throw new Error(
      "Google Play Billing is unavailable."
    );
  }

  const selection =
    getGooglePlaySubscriptionSelection(
      options.planId,
      options.interval
    );

  if (!selection) {
    throw new Error(
      "This plan cannot be purchased."
    );
  }

  /*
   * This only launches Google Play.
   * Never grant AYZO entitlement here.
   */
  return AyzoPlayBilling
    .launchSubscriptionPurchase(
      selection
    );
}

export function listenForGooglePlayPurchaseUpdates(
  listener: (
    event:
      GooglePlayPurchaseUpdate
  ) => void
): Promise<
  PluginListenerHandle
> {
  return AyzoPlayBilling.addListener(
    "billingUpdated",
    listener
  );
}
