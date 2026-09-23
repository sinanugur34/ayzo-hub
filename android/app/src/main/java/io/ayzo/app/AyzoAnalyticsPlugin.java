package io.ayzo.app;

import android.os.Bundle;

import com.google.firebase.analytics.FirebaseAnalytics;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Iterator;
import java.util.regex.Pattern;

@CapacitorPlugin(
    name = "AyzoAnalytics"
)
public class AyzoAnalyticsPlugin
    extends Plugin {

    private static final Pattern EVENT_NAME =
        Pattern.compile(
            "^[A-Za-z][A-Za-z0-9_]{0,39}$"
        );

    private static final Pattern PARAM_NAME =
        Pattern.compile(
            "^[A-Za-z][A-Za-z0-9_]{0,39}$"
        );

    private FirebaseAnalytics analytics;

    @Override
    public void load() {
        super.load();

        try {
            analytics =
                FirebaseAnalytics.getInstance(
                    getContext()
                );
        } catch (Exception ignored) {
            analytics = null;
        }
    }

    private FirebaseAnalytics getAnalytics(
        PluginCall call
    ) {
        if (analytics == null) {
            call.reject(
                "Firebase Analytics is unavailable."
            );

            return null;
        }

        return analytics;
    }

    @PluginMethod
    public void setCollectionEnabled(
        PluginCall call
    ) {
        Boolean enabled =
            call.getBoolean(
                "enabled"
            );

        if (enabled == null) {
            call.reject(
                "Analytics consent value is required."
            );
            return;
        }

        FirebaseAnalytics instance =
            getAnalytics(
                call
            );

        if (instance == null) {
            return;
        }

        instance
            .setAnalyticsCollectionEnabled(
                enabled
            );

        JSObject result =
            new JSObject();

        result.put(
            "enabled",
            enabled
        );

        call.resolve(
            result
        );
    }

    @PluginMethod
    public void setUserId(
        PluginCall call
    ) {
        FirebaseAnalytics instance =
            getAnalytics(
                call
            );

        if (instance == null) {
            return;
        }

        String userId =
            call.getString(
                "userId"
            );

        if (
            userId == null ||
            userId.trim().isEmpty() ||
            userId.length() > 128
        ) {
            call.reject(
                "Invalid Analytics user id."
            );
            return;
        }

        instance.setUserId(
            userId
        );

        call.resolve();
    }

    @PluginMethod
    public void clearUserId(
        PluginCall call
    ) {
        FirebaseAnalytics instance =
            getAnalytics(
                call
            );

        if (instance == null) {
            return;
        }

        instance.setUserId(
            null
        );

        call.resolve();
    }

    @PluginMethod
    public void logEvent(
        PluginCall call
    ) {
        FirebaseAnalytics instance =
            getAnalytics(
                call
            );

        if (instance == null) {
            return;
        }

        String name =
            call.getString(
                "name"
            );

        if (
            name == null ||
            !EVENT_NAME
                .matcher(name)
                .matches()
        ) {
            call.reject(
                "Invalid Analytics event name."
            );
            return;
        }

        Bundle bundle =
            new Bundle();

        JSObject params =
            call.getObject(
                "params"
            );

        if (params != null) {
            Iterator<String> keys =
                params.keys();

            while (
                keys.hasNext()
            ) {
                String key =
                    keys.next();

                if (
                    !PARAM_NAME
                        .matcher(key)
                        .matches()
                ) {
                    continue;
                }

                Object value =
                    params.opt(
                        key
                    );

                if (
                    value instanceof Integer ||
                    value instanceof Long
                ) {
                    bundle.putLong(
                        key,
                        ((Number) value)
                            .longValue()
                    );
                } else if (
                    value instanceof Number
                ) {
                    bundle.putDouble(
                        key,
                        ((Number) value)
                            .doubleValue()
                    );
                } else if (
                    value instanceof Boolean
                ) {
                    bundle.putString(
                        key,
                        value.toString()
                    );
                } else if (
                    value instanceof String
                ) {
                    String stringValue =
                        (String) value;

                    if (
                        stringValue.length()
                        <= 100
                    ) {
                        bundle.putString(
                            key,
                            stringValue
                        );
                    }
                }
            }
        }

        instance.logEvent(
            name,
            bundle
        );

        call.resolve();
    }
}
