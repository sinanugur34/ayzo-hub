package io.ayzo.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity
    extends BridgeActivity {

    @Override
    public void onCreate(
        Bundle savedInstanceState
    ) {
        registerPlugin(
            AyzoPlayBillingPlugin.class
        );

        super.onCreate(
            savedInstanceState
        );
    }
}
