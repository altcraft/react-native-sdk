package com.altcraft.sdk.inapp

import com.altcraft.sdk.config.AltcraftConfiguration
import com.altcraft.sdk.core.AltcraftInitContributor
import com.altcraft.sdk.inapp.config.inAppConfig
import kotlin.time.Duration.Companion.milliseconds

/**
 * Contributes the In-App module configuration to the shared SDK builder.
 *
 * Reads the `inapp` entry produced by the JS `inAppConfig` builder extension
 * and applies it through the native in-app configuration extension. When no
 * options were provided, native defaults are applied explicitly.
 */
internal class InAppInitContributor : AltcraftInitContributor {

    override fun contribute(
        builder: AltcraftConfiguration.Builder,
        moduleConfigs: Map<String, Map<String, Any?>>
    ) {
        val config = moduleConfigs[MODULE_ID] ?: emptyMap()

        builder.inAppConfig(
            inAppAutoRequest = config["inAppAutoRequest"] as? Boolean ?: true,
            placementsRequestInterval =
                ((config["placementsRequestIntervalMs"] as? Number)?.toLong()
                    ?: DEFAULT_INTERVAL_MS).milliseconds,
            maxPlacements =
                (config["maxPlacements"] as? Number)?.toInt() ?: DEFAULT_MAX_PLACEMENTS
        )
    }

    private companion object {
        const val MODULE_ID = "inapp"
        const val DEFAULT_INTERVAL_MS = 30L * 60L * 1000L
        const val DEFAULT_MAX_PLACEMENTS = 500
    }
}
