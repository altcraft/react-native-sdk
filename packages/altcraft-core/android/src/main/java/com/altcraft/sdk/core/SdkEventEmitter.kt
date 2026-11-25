package com.altcraft.sdk.core

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Event emitter module for NativeEventEmitter on the JS side.
 * SdkModule calls [emit] to forward SDK events to JS.
 */
@ReactModule(name = SdkEventEmitter.NAME)
class SdkEventEmitter(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "SDKEventEmitter"

        @JvmStatic
        fun emit(eventName: String, event: Any?) {
            instance?.reactApplicationContext?.getJSModule(
                DeviceEventManagerModule.RCTDeviceEventEmitter::class.java
            )?.emit(eventName, event)
        }

        @JvmStatic
        private var instance: SdkEventEmitter? = null
    }

    override fun getName(): String = NAME

    init {
        instance = this
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // No-op — required by NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // No-op — required by NativeEventEmitter
    }

    override fun invalidate() {
        super.invalidate()
        instance = null
    }
}
