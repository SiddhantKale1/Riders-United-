package com.ridersunited.app;

import android.os.Bundle;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int action = event.getAction();
        int keyCode = event.getKeyCode();

        // Volume Down or Headset Hook acts as Push-To-Talk Walkie-Talkie trigger
        if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_HEADSETHOOK) {
            if (action == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                if (this.bridge != null && this.bridge.getWebView() != null) {
                    this.bridge.getWebView().post(() -> {
                        this.bridge.getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('hardware-ptt', { detail: { state: 'down', keyCode: " + keyCode + " } }));",
                            null
                        );
                    });
                }
                return true; // Consume key event to prevent volume drop during convoy comms
            } else if (action == KeyEvent.ACTION_UP) {
                if (this.bridge != null && this.bridge.getWebView() != null) {
                    this.bridge.getWebView().post(() -> {
                        this.bridge.getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('hardware-ptt', { detail: { state: 'up', keyCode: " + keyCode + " } }));",
                            null
                        );
                    });
                }
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }
}
