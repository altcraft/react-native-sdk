package com.altcraft.sdk.push

import android.content.Context
import com.altcraft.sdk.config.AltcraftConfiguration
import com.altcraft.sdk.core.AltcraftInitContributor
import com.altcraft.sdk.push.config.pushConfig

/**
 * Contributes the push module configuration to the shared SDK builder.
 *
 * Reads the `push` entry produced by the JS `pushConfig` builder extension and
 * applies it through the native push configuration extension. The contributor
 * always adds a push configuration (with native defaults when no options were
 * provided) so the native push module is registered.
 */
internal class PushInitContributor(
    private val context: Context,
) : AltcraftInitContributor {

    override fun contribute(
        builder: AltcraftConfiguration.Builder,
        moduleConfigs: Map<String, Map<String, Any?>>
    ) {
        val config = moduleConfigs[MODULE_ID] ?: emptyMap()

        builder.pushConfig(
            icon = resolveIcon(config),
            providerPriority = stringList(config["providerPriority"]),
            pushReceiverModules = stringList(config["pushReceiverModules"]),
            pushChannelName = config["pushChannelName"] as? String,
            pushChannelDescription = config["pushChannelDescription"] as? String
        )
    }

    /**
     * Resolves a notification icon from an explicit resource ID or a resource
     * name (`drawable`, then `mipmap`).
     */
    private fun resolveIcon(config: Map<String, Any?>): Int? {
        (config["icon"] as? Number)?.let { return it.toInt() }
        val name = config["iconName"] as? String ?: return null
        val drawable =
            context.resources.getIdentifier(name, "drawable", context.packageName)
        if (drawable != 0) return drawable
        val mipmap =
            context.resources.getIdentifier(name, "mipmap", context.packageName)
        return mipmap.takeIf { it != 0 }
    }

    /** Converts a decoded JSON list into a list of strings. */
    private fun stringList(value: Any?): List<String> {
        return (value as? List<*>)?.filterIsInstance<String>() ?: emptyList()
    }

    private companion object {
        const val MODULE_ID = "push"
    }
}
