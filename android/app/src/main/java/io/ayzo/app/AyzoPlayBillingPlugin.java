package io.ayzo.app;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.BillingFlowParams.ProductDetailsParams.SubscriptionProductReplacementParams;

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

    @PluginMethod
    public void launchSubscriptionPurchase(
        PluginCall call
    ) {
        String productId =
            call.getString(
                "productId",
                ""
            ).trim();

        String basePlanId =
            call.getString(
                "basePlanId",
                ""
            ).trim();

        String obfuscatedAccountId =
            call.getString(
                "obfuscatedAccountId",
                ""
            ).trim();

        String oldPurchaseToken =
            call.getString(
                "oldPurchaseToken",
                ""
            ).trim();

        String oldProductId =
            call.getString(
                "oldProductId",
                ""
            ).trim();

        boolean hasReplacement =
            !oldPurchaseToken.isEmpty() ||
            !oldProductId.isEmpty();

        if (
            productId.isEmpty() ||
            basePlanId.isEmpty() ||
            productId.length() > 100 ||
            basePlanId.length() > 100 ||
            obfuscatedAccountId.isEmpty() ||
            obfuscatedAccountId.length() > 64 ||
            (
                hasReplacement &&
                (
                    oldPurchaseToken.isEmpty() ||
                    oldProductId.isEmpty() ||
                    oldPurchaseToken.length() > 4096 ||
                    oldProductId.length() > 100 ||
                    oldProductId.equals(productId)
                )
            )
        ) {
            call.reject(
                "Invalid Google Play purchase selection."
            );
            return;
        }

        runWhenReady(
            call,
            () ->
                queryAndLaunchSubscriptionPurchase(
                    call,
                    productId,
                    basePlanId,
                    obfuscatedAccountId,
                    oldPurchaseToken,
                    oldProductId
                )
        );
    }

    private void queryAndLaunchSubscriptionPurchase(
        PluginCall call,
        String productId,
        String basePlanId,
        String obfuscatedAccountId,
        String oldPurchaseToken,
        String oldProductId
    ) {
        List<QueryProductDetailsParams.Product>
            products =
                new ArrayList<>();

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

                ProductDetails selectedProduct =
                    null;

                for (
                    ProductDetails details :
                    queryResult
                        .getProductDetailsList()
                ) {
                    if (
                        productId.equals(
                            details.getProductId()
                        )
                    ) {
                        selectedProduct =
                            details;
                        break;
                    }
                }

                if (
                    selectedProduct == null
                ) {
                    call.reject(
                        "Google Play product is unavailable."
                    );
                    return;
                }

                ProductDetails
                    .SubscriptionOfferDetails
                    selectedOffer =
                        null;

                List<
                    ProductDetails
                        .SubscriptionOfferDetails
                > offers =
                    selectedProduct
                        .getSubscriptionOfferDetails();

                if (offers != null) {
                    for (
                        ProductDetails
                            .SubscriptionOfferDetails
                            offer :
                        offers
                    ) {
                        if (
                            basePlanId.equals(
                                offer.getBasePlanId()
                            ) &&
                            offer.getOfferId()
                                == null
                        ) {
                            selectedOffer =
                                offer;
                            break;
                        }
                    }
                }

                if (
                    selectedOffer == null
                ) {
                    call.reject(
                        "Google Play base plan is unavailable."
                    );
                    return;
                }

                List<
                    BillingFlowParams
                        .ProductDetailsParams
                > productParams =
                    new ArrayList<>();

                BillingFlowParams
                    .ProductDetailsParams
                    .Builder
                    productDetailsBuilder =
                        BillingFlowParams
                            .ProductDetailsParams
                            .newBuilder()
                            .setProductDetails(
                                selectedProduct
                            )
                            .setOfferToken(
                                selectedOffer
                                    .getOfferToken()
                            );

                boolean isReplacement =
                    !oldPurchaseToken.isEmpty() &&
                    !oldProductId.isEmpty();

                if (isReplacement) {
                    productDetailsBuilder
                        .setSubscriptionProductReplacementParams(
                            SubscriptionProductReplacementParams
                                .newBuilder()
                                .setOldProductId(
                                    oldProductId
                                )
                                .setReplacementMode(
                                    SubscriptionProductReplacementParams
                                        .ReplacementMode
                                        .CHARGE_PRORATED_PRICE
                                )
                                .build()
                        );
                }

                productParams.add(
                    productDetailsBuilder
                        .build()
                );

                BillingFlowParams.Builder
                    flowBuilder =
                        BillingFlowParams
                            .newBuilder()
                            .setProductDetailsParamsList(
                                productParams
                            )
                            .setObfuscatedAccountId(
                                obfuscatedAccountId
                            );

                if (isReplacement) {
                    flowBuilder
                        .setSubscriptionUpdateParams(
                            BillingFlowParams
                                .SubscriptionUpdateParams
                                .newBuilder()
                                .setOldPurchaseToken(
                                    oldPurchaseToken
                                )
                                .build()
                        );
                }

                BillingFlowParams flowParams =
                    flowBuilder.build();

                BillingResult launchResult =
                    billingClient
                        .launchBillingFlow(
                            getActivity(),
                            flowParams
                        );

                JSObject response =
                    new JSObject();

                response.put(
                    "responseCode",
                    launchResult
                        .getResponseCode()
                );

                response.put(
                    "debugMessage",
                    launchResult
                        .getDebugMessage()
                );

                call.resolve(
                    response
                );
            }
        );
    }

    @PluginMethod
    public void getActiveSubscriptions(
        PluginCall call
    ) {
        runWhenReady(
            call,
            () ->
                queryActiveSubscriptions(
                    call
                )
        );
    }

    private void queryActiveSubscriptions(
        PluginCall call
    ) {
        QueryPurchasesParams params =
            QueryPurchasesParams
                .newBuilder()
                .setProductType(
                    BillingClient
                        .ProductType
                        .SUBS
                )
                .build();

        billingClient.queryPurchasesAsync(
            params,
            (
                billingResult,
                purchases
            ) -> {
                if (
                    billingResult.getResponseCode()
                    != BillingClient
                        .BillingResponseCode
                        .OK
                ) {
                    call.reject(
                        "Google Play active subscription query failed."
                    );
                    return;
                }

                JSArray purchaseArray =
                    new JSArray();

                for (
                    Purchase purchase :
                    purchases
                ) {
                    JSObject purchaseJson =
                        new JSObject();

                    purchaseJson.put(
                        "purchaseToken",
                        purchase.getPurchaseToken()
                    );

                    JSArray products =
                        new JSArray();

                    for (
                        String product :
                        purchase.getProducts()
                    ) {
                        products.put(
                            product
                        );
                    }

                    purchaseJson.put(
                        "products",
                        products
                    );

                    purchaseJson.put(
                        "purchaseState",
                        purchase.getPurchaseState()
                    );

                    purchaseJson.put(
                        "acknowledged",
                        purchase.isAcknowledged()
                    );

                    purchaseJson.put(
                        "purchaseTime",
                        purchase.getPurchaseTime()
                    );

                    if (
                        purchase.getOrderId()
                        != null
                    ) {
                        purchaseJson.put(
                            "orderId",
                            purchase.getOrderId()
                        );
                    }

                    purchaseArray.put(
                        purchaseJson
                    );
                }

                JSObject response =
                    new JSObject();

                response.put(
                    "purchases",
                    purchaseArray
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

        event.put(
            "debugMessage",
            billingResult.getDebugMessage()
        );

        JSArray purchaseArray =
            new JSArray();

        if (purchases != null) {
            for (
                Purchase purchase :
                purchases
            ) {
                JSObject purchaseJson =
                    new JSObject();

                purchaseJson.put(
                    "purchaseToken",
                    purchase.getPurchaseToken()
                );

                JSArray products =
                    new JSArray();

                for (
                    String product :
                    purchase.getProducts()
                ) {
                    products.put(
                        product
                    );
                }

                purchaseJson.put(
                    "products",
                    products
                );

                purchaseJson.put(
                    "purchaseState",
                    purchase.getPurchaseState()
                );

                purchaseJson.put(
                    "acknowledged",
                    purchase.isAcknowledged()
                );

                purchaseJson.put(
                    "purchaseTime",
                    purchase.getPurchaseTime()
                );

                if (
                    purchase.getOrderId()
                    != null
                ) {
                    purchaseJson.put(
                        "orderId",
                        purchase.getOrderId()
                    );
                }

                purchaseArray.put(
                    purchaseJson
                );
            }
        }

        event.put(
            "purchases",
            purchaseArray
        );

        /*
         * Purchase data is forwarded to
         * the mobile shell only.
         *
         * AYZO entitlement MUST NOT be
         * granted until the purchase token
         * is verified by the backend.
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
