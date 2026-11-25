package com.altcraft.sdk.inapp

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.inapp.inApp
import com.altcraft.sdk.core.AltcraftInitRegistry
import com.altcraft.sdk.core.SdkEventEmitter
import com.altcraft.sdk.core.rn.getBooleanOrNull
import com.altcraft.sdk.core.rn.getArrayOrNull
import com.altcraft.sdk.core.rn.getMapOrNull
import com.altcraft.sdk.core.utilities.Converter
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

// ---------------------- Constants ----------------------

internal object InAppConstants {
    // Module
    const val MODULE_NAME: String = "InApp"

    // Events
    const val EVENT_JSON_CONTENT: String = "AltcraftInAppJsonContent"

    // Keys: subscribe options
    const val KEY_SYNC: String = "sync"
    const val KEY_PROFILE_FIELDS: String = "profileFields"
    const val KEY_CUSTOM_FIELDS: String = "customFields"
    const val KEY_CATS: String = "cats"
    const val KEY_REPLACE: String = "replace"
    const val KEY_SKIP_TRIGGERS: String = "skipTriggers"

    // Keys: animation config
    const val KEY_DEFAULT: String = "default"
    const val KEY_CAMPAIGNS: String = "campaigns"

    // Keys: animation spec
    const val KEY_DURATION_MS: String = "durationMs"
    const val KEY_DELAY_MS: String = "delayMs"
    const val KEY_EASING: String = "easing"
    const val KEY_ALPHA_FROM: String = "alphaFrom"
    const val KEY_ALPHA_TO: String = "alphaTo"
    const val KEY_TRANSLATE_X_FROM: String = "translateXFrom"
    const val KEY_TRANSLATE_X_TO: String = "translateXTo"
    const val KEY_TRANSLATE_Y_FROM: String = "translateYFrom"
    const val KEY_TRANSLATE_Y_TO: String = "translateYTo"
    const val KEY_SCALE_X_FROM: String = "scaleXFrom"
    const val KEY_SCALE_X_TO: String = "scaleXTo"
    const val KEY_SCALE_Y_FROM: String = "scaleYFrom"
    const val KEY_SCALE_Y_TO: String = "scaleYTo"
    const val KEY_ROTATION_FROM: String = "rotationFrom"
    const val KEY_ROTATION_TO: String = "rotationTo"
}

@ReactModule(name = InAppConstants.MODULE_NAME)
class InAppModule(reactContext: ReactApplicationContext) : NativeInAppSpec(reactContext) {

    init {
        // Contribute the In-App configuration to the shared SDK builder used
        // by the core module during initialization.
        AltcraftInitRegistry.register(InAppInitContributor())
    }

    override fun getName(): String = InAppConstants.MODULE_NAME

    /**
     * Creates or updates In-App subscription.
     *
     * @param options Subscription operation options.
     */
    override fun inAppSubscribe(options: ReadableMap?) {
        try {
            AltcraftSDK.inApp.subscription.subscribe(
                    context = reactApplicationContext,
                    sync = options?.getBooleanOrNull(InAppConstants.KEY_SYNC) ?: true,
                    profileFields = Converter.toKotlinMap(
                            options?.getMapOrNull(InAppConstants.KEY_PROFILE_FIELDS)
                    ),
                    customFields = Converter.toKotlinMap(
                            options?.getMapOrNull(InAppConstants.KEY_CUSTOM_FIELDS)
                    ),
                    cats = Converter.toCategoryListOrNull(
                            options?.getArrayOrNull(InAppConstants.KEY_CATS)
                    ),
                    replace = options?.getBooleanOrNull(InAppConstants.KEY_REPLACE),
                    skipTriggers = options?.getBooleanOrNull(InAppConstants.KEY_SKIP_TRIGGERS)
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Unsubscribes from In-App notifications.
     *
     * @param options Subscription operation options.
     */
    override fun inAppUnsubscribe(options: ReadableMap?) {
        try {
            AltcraftSDK.inApp.subscription.unsubscribe(
                    context = reactApplicationContext,
                    sync = options?.getBooleanOrNull(InAppConstants.KEY_SYNC) ?: true,
                    profileFields = Converter.toKotlinMap(
                            options?.getMapOrNull(InAppConstants.KEY_PROFILE_FIELDS)
                    ),
                    customFields = Converter.toKotlinMap(
                            options?.getMapOrNull(InAppConstants.KEY_CUSTOM_FIELDS)
                    ),
                    cats = Converter.toCategoryListOrNull(
                            options?.getArrayOrNull(InAppConstants.KEY_CATS)
                    ),
                    replace = options?.getBooleanOrNull(InAppConstants.KEY_REPLACE),
                    skipTriggers = options?.getBooleanOrNull(InAppConstants.KEY_SKIP_TRIGGERS)
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Sets the current screen for In-App placement matching.
     *
     * @param screen Screen identifier.
     */
    override fun setScreen(screen: String) {
        try {
            AltcraftSDK.inApp.setScreen(reactApplicationContext, screen)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Fires an In-App trigger by name.
     *
     * @param name In-App event used as a trigger.
     */
    override fun trigger(name: String) {
        try {
            AltcraftSDK.inApp.trigger(reactApplicationContext, name)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /** Requests In-App placements. */
    override fun getPlacements() {
        try {
            AltcraftSDK.inApp.getPlacements(reactApplicationContext)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Sets or clears the animation applied when an In-App view is shown.
     *
     * @param config Animation configuration, or `null` to disable it.
     */
    override fun setAnimation(config: ReadableMap?) {
        try {
            InAppAnimationConfigStore.set(
                    config,
                    reactApplicationContext.resources.displayMetrics.density
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Subscribes to In-App placements with JSON content.
     *
     * JSON-type campaigns are not displayed by the SDK; the raw campaign JSON
     * is forwarded to JavaScript through the shared SDK event emitter.
     */
    override fun jsonContentSubscribe() {
        try {
            AltcraftSDK.inApp.jsonContent.subscribe { json ->
                SdkEventEmitter.emit(
                        InAppConstants.EVENT_JSON_CONTENT,
                        json
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /** Removes the JSON content subscriber. */
    override fun jsonContentUnsubscribe() {
        try {
            AltcraftSDK.inApp.jsonContent.unsubscribe()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    companion object {
        const val NAME: String = InAppConstants.MODULE_NAME
    }
}
