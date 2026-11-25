package com.altcraft.sdk.core

import com.altcraft.sdk.config.AltcraftConfiguration

/**
 * Contributes a module configuration to the SDK builder during initialization.
 *
 * Implemented by module RN packages (push, in-app) and registered in
 * [AltcraftInitRegistry]. The core package never references concrete modules.
 */
fun interface AltcraftInitContributor {
    /**
     * Applies this module's configuration to [builder].
     *
     * @param builder SDK configuration builder shared by all contributors.
     * @param moduleConfigs Module configurations received from JS, keyed by
     * module identifier (for example `push` or `inapp`).
     */
    fun contribute(
        builder: AltcraftConfiguration.Builder,
        moduleConfigs: Map<String, Map<String, Any?>>
    )
}

/**
 * Process-wide registry of module initialization contributors.
 *
 * Module RN packages register themselves when their React packages are
 * created; the core module applies all registered contributors right before
 * calling `AltcraftSDK.initialization`. This keeps the core module unaware of
 * concrete modules while still producing a single native configuration.
 */
object AltcraftInitRegistry {
    private val lock = Any()
    private val contributors = mutableListOf<AltcraftInitContributor>()

    /**
     * Registers a module contributor.
     *
     * Registration is idempotent: a contributor class is registered at most
     * once per process.
     */
    fun register(contributor: AltcraftInitContributor) {
        synchronized(lock) {
            if (contributors.none { it::class == contributor::class }) {
                contributors.add(contributor)
            }
        }
    }

    /**
     * Applies all registered contributors to [builder].
     */
    fun applyAll(
        builder: AltcraftConfiguration.Builder,
        moduleConfigs: Map<String, Map<String, Any?>>
    ) {
        val snapshot = synchronized(lock) { contributors.toList() }
        snapshot.forEach { contributor ->
            try {
                contributor.contribute(builder, moduleConfigs)
            } catch (_: Exception) {
                // A module configuration error must not prevent core
                // initialization or other modules from being configured.
            }
        }
    }
}
