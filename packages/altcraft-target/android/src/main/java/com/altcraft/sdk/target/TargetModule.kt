package com.altcraft.sdk.target

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.core.rn.getMapOrNull
import com.altcraft.sdk.core.rn.getStringOrNull
import com.altcraft.sdk.core.utilities.Converter
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

// ---------------------- Constants ----------------------

internal object TargetConstants {
    // Module
    const val MODULE_NAME: String = "Target"

    // Keys: mobile event options
    const val KEY_SID: String = "sid"
    const val KEY_EVENT_NAME: String = "eventName"
    const val KEY_SEND_MESSAGE_ID: String = "sendMessageId"
    const val KEY_PAYLOAD: String = "payload"
    const val KEY_MATCHING: String = "matching"
    const val KEY_MATCHING_TYPE: String = "matchingType"
    const val KEY_PROFILE_FIELDS: String = "profileFields"
    const val KEY_SUBSCRIPTION: String = "subscription"
    const val KEY_UTM: String = "utm"
}

@ReactModule(name = TargetConstants.MODULE_NAME)
class TargetModule(reactContext: ReactApplicationContext) : NativeTargetSpec(reactContext) {

    override fun getName(): String = TargetConstants.MODULE_NAME

    /**
     * Sends a target event to the server (fire-and-forget).
     *
     * @param options Target event options.
     */
    override fun sendTarget(options: ReadableMap?) {
        try {
            val map = options ?: return

            val sid = map.getStringOrNull(TargetConstants.KEY_SID) ?: return
            if (sid.isBlank()) return

            val eventName = map.getStringOrNull(TargetConstants.KEY_EVENT_NAME) ?: return
            if (eventName.isBlank()) return

            AltcraftSDK.target.sendTarget(
                    context = reactApplicationContext,
                    sid = sid,
                    eventName = eventName,
                    sendMessageId = map.getStringOrNull(TargetConstants.KEY_SEND_MESSAGE_ID),
                    payload = Converter.toKotlinMap(
                            map.getMapOrNull(TargetConstants.KEY_PAYLOAD)
                    ),
                    matching = Converter.toKotlinMap(
                            map.getMapOrNull(TargetConstants.KEY_MATCHING)
                    ),
                    matchingType = map.getStringOrNull(TargetConstants.KEY_MATCHING_TYPE),
                    profileFields = Converter.toKotlinMap(
                            map.getMapOrNull(TargetConstants.KEY_PROFILE_FIELDS)
                    ),
                    subscription = TargetConverter.toSubscriptionOrNull(
                            map.getMapOrNull(TargetConstants.KEY_SUBSCRIPTION)
                    ),
                    utm = TargetConverter.toUtmOrNull(map.getMapOrNull(TargetConstants.KEY_UTM))
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    companion object {
        const val NAME: String = TargetConstants.MODULE_NAME
    }
}
