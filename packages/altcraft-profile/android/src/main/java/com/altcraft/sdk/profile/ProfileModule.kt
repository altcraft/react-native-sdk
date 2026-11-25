package com.altcraft.sdk.profile

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.core.rn.getBooleanOrNull
import com.altcraft.sdk.core.rn.getMapOrNull
import com.altcraft.sdk.core.utilities.Converter
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

// ---------------------- Constants ----------------------

internal object ProfileConstants {
    // Module
    const val MODULE_NAME: String = "Profile"

    // Keys: update profile options
    const val KEY_PROFILE_FIELDS: String = "profileFields"
    const val KEY_SKIP_TRIGGERS: String = "skipTriggers"
}

@ReactModule(name = ProfileConstants.MODULE_NAME)
class ProfileModule(reactContext: ReactApplicationContext) : NativeProfileSpec(reactContext) {

    override fun getName(): String = ProfileConstants.MODULE_NAME

    /**
     * Updates profile fields on the server.
     *
     * @param options Profile update options.
     */
    override fun updateProfileFields(options: ReadableMap?) {
        try {
            AltcraftSDK.profile.updateProfileFields(
                context = reactApplicationContext,
                profileFields = Converter.toKotlinMap(
                    options?.getMapOrNull(
                        ProfileConstants.KEY_PROFILE_FIELDS
                    )
                ),
                skipTriggers = options?.getBooleanOrNull(
                    ProfileConstants.KEY_SKIP_TRIGGERS
                )
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    companion object {
        const val NAME: String = ProfileConstants.MODULE_NAME
    }
}
