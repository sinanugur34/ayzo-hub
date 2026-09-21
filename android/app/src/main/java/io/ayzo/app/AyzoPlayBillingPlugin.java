package io.ayzo.app;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(
    name = "AyzoPlayBilling"
)
public class AyzoPlayBillingPlugin
    extends Plugin
    implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private boolean connecting = false;

    @Override
    public void load() {
        super.load();

        PendingPurchasesParams pendingPurchasesParams =
            PendingPurchasesParams
                .newBuilder()
                .enableOneTimeProducts()
                .build();

        billingClient =
            BillingClient
                .newBuilder(
                    getContext()
                )
                .setListener(this)
                .enablePendingPurchases(
                    pendingPurchasesParams
                )
                .enableAutoServiceReconnection()
                .build();
    }

    private void runWhenReady(
        PluginCall call,
        Runnable action
    ) {
        if (
            billingClient != null &&
            billingClient.isReady()
        ) {
            action.run();
            return;
        }

        if (
            billingClient == null
        ) {
            call.reject(
                "Google Play Billing is unavailable."
            );
            return;
        }

        if (connecting) {
            call.reject(
                "Google Play Billing is connecting."
            );
            return;
        }

        connecting = true;

        billingClient.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(
                    BillingResult result
                ) {
                    connecting = false;

                    if (
                        result.getResponseCode()
                        != BillingClient.BillingResponseCode.OK
                    ) {
                        call.reject(
                            "Google Play Billing setup failed."
                        );
                        return;
                    }

                    action.run();
                }

                @Override
                public void onBillingServiceDisconnected() {
                    connecting = false;
                }
            }
        );
    }

    @PluginMethod
    public void getSubscriptionProducts(
        PluginCall call
    ) {
        JSArray requested =
            call.getArray(
                "productIds"
            );

        if (
            requested == null ||
            requested.length() == 0 ||
            requested.length() > 10
        ) {
            call.reject(
                "Invalid Google Play product list."
            );
            return;
        }

        List<String> productIds =
            new ArrayList<>();

        Set<String> seen =
            new HashSet<>();

        for (
            int index = 0;
            index < requested.length();
            index++
        ) {
            String productId =
                requested.optString(
                    index,
                    ""
                ).trim();

            if (
                productId.isEmpty() ||
                productId.length() > 100 ||
                !seen.add(productId)
            ) {
                call.reject(
                    "Invalid Google Play product id."
                );
                return;
            }

            productIds.add(
                productId
            );
        }

        runWhenReady(
            call,
            () ->
                querySubscriptionProducts(
                    call,
                    productIds
                )
        );
    }

    private void querySubscriptionProducts(
        PluginCall call,
        List<String> productIds
    ) {
        List<QueryProductDetailsParams.Product>
            products =
                new ArrayList<>();

        for (
            String productId :
            productIds
        ) {
            products.add(
                QueryProductDetailsParams
                    .Product
                    .newBuilder()
                    .setProductId(
                        productId
                    )
                    .setProductType(
                        BillingClient
                            .ProductType
                            .SUBS
                    )
                    .build()
            );
        }

        QueryProductDetailsParams params =
            QueryProductDetailsParams
                .newBuilder()
                .setProductList(
                    products
                )
                .build();

        billingClient.queryProductDetailsAsync(
            params,
            (
                billingResult,
                queryResult
            ) -> {
                if (
                    billingResult.getResponseCode()
                    != BillingClient
                        .BillingResponseCode
                        .OK
                ) {
                    call.reject(
                        "Google Play product query failed."
                    );
                    return;
                }

                JSArray resultProducts =
                    new JSArray();

                for (
                    ProductDetails details :
                    queryResult
                        .getProductDetailsList()
                ) {
                    JSObject product =
                        new JSObject();

                    product.put(
                        "productId",
                        details.getProductId()
                    );

                    product.put(
                        "title",
                        details.getTitle()
                    );

                    product.put(
                        "description",
                        details.getDescription()
                    );

                    JSArray offers =
                        new JSArray();

                    List<
                        ProductDetails
                            .SubscriptionOfferDetails
                    > subscriptionOffers =
                        details
                            .getSubscriptionOfferDetails();

                    if (
                        subscriptionOffers != null
                    ) {
                        for (
                            ProductDetails
                                .SubscriptionOfferDetails
                                offer :
                            subscriptionOffers
                        ) {
                            JSObject offerJson =
                                new JSObject();

                            offerJson.put(
                                "basePlanId",
                                offer.getBasePlanId()
                            );

                            if (
                                offer.getOfferId()
                                != null
                            ) {
                                offerJson.put(
                                    "offerId",
                                    offer.getOfferId()
                                );
                            }

                            offerJson.put(
                                "offerToken",
                                offer.getOfferToken()
                            );

                            JSArray pricingPhases =
                                new JSArray();

                            for (
                                ProductDetails
                                    .PricingPhase
                                    phase :
                                offer
                                    .getPricingPhases()
                                    .getPricingPhaseList()
                            ) {
                                JSObject phaseJson =
                                    new JSObject();

                                phaseJson.put(
                                    "formattedPrice",
                                    phase.getFormattedPrice()
                                );

                                phaseJson.put(
                                    "priceAmountMicros",
                                    phase.getPriceAmountMicros()
                                );

                                phaseJson.put(
                                    "priceCurrencyCode",
                                    phase.getPriceCurrencyCode()
                                );

                                phaseJson.put(
                                    "billingPeriod",
                                    phase.getBillingPeriod()
                                );

                                phaseJson.put(
                                    "recurrenceMode",
                                    phase.getRecurrenceMode()
                                );

                                phaseJson.put(
                                    "billingCycleCount",
                                    phase.getBillingCycleCount()
                                );

                                pricingPhases.put(
                                    phaseJson
                                );
                            }

                            offerJson.put(
                                "pricingPhases",
                                pricingPhases
                            );

                            offers.put(
                                offerJson
                            );
                        }
                    }

                    product.put(
                        "offers",
                        offers
                    );

                    resultProducts.put(
                        product
                    );
                }

                JSObject response =
                    new JSObject();

                response.put(
                    "products",
                    resultProducts
                );

                call.resolve(
                    response
                );
            }
        );
    }

    @Override
    public void onPurchasesUpdated(
        BillingResult billingResult,
        List<Purchase> purchases
    ) {
        JSObject event =
            new JSObject();

        event.put(
            "responseCode",
            billingResult.getResponseCode()
        );

        /*
         * No entitlement is granted here.
         * Purchase tokens will be verified
         * by the AYZO backend in the next
         * billing stage.
         */
        notifyListeners(
            "billingUpdated",
            event
        );
    }

    @Override
    protected void handleOnDestroy() {
        if (
            billingClient != null
        ) {
            billingClient.endConnection();
        }

        super.handleOnDestroy();
    }
}
