package com.altcraft.sdk.inapp

//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

import android.view.View
import android.view.ViewPropertyAnimator
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.Interpolator
import android.view.animation.LinearInterpolator
import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.core.rn.hasNonNullKey
import com.altcraft.sdk.core.rn.getStringOrNull
import com.facebook.react.bridge.ReadableMap

/** Easing curves supported by the In-App show animation bridge. */
internal enum class InAppAnimationEasing {

    LINEAR,
    EASE_IN,
    EASE_OUT,
    EASE_IN_OUT;

    /** Maps the easing curve to an Android interpolator. */
    fun interpolator(): Interpolator = when (this) {
        LINEAR -> LinearInterpolator()
        EASE_IN -> AccelerateInterpolator()
        EASE_OUT -> DecelerateInterpolator()
        EASE_IN_OUT -> AccelerateDecelerateInterpolator()
    }

    companion object {

        /** Parses an easing name sent from JavaScript. */
        fun from(value: String?): InAppAnimationEasing? = when (value) {
            "linear" -> LINEAR
            "easeIn" -> EASE_IN
            "easeOut" -> EASE_OUT
            "easeInOut" -> EASE_IN_OUT
            else -> null
        }
    }
}

/**
 * Parsed animation parameters for a single In-App campaign.
 *
 * Neutral values are `alpha` 1, `translate` 0, `scale` 1 and `rotation` 0.
 * Translation values are stored in density-independent pixels.
 */
internal data class InAppAnimationSpec(
    val durationMs: Long = DEFAULT_DURATION_MS,
    val delayMs: Long = 0L,
    val easing: InAppAnimationEasing = InAppAnimationEasing.EASE_IN_OUT,
    val alphaFrom: Float? = null,
    val alphaTo: Float? = null,
    val translateXFrom: Float? = null,
    val translateXTo: Float? = null,
    val translateYFrom: Float? = null,
    val translateYTo: Float? = null,
    val scaleXFrom: Float? = null,
    val scaleXTo: Float? = null,
    val scaleYFrom: Float? = null,
    val scaleYTo: Float? = null,
    val rotationFrom: Float? = null,
    val rotationTo: Float? = null
) {

    /** Whether the spec changes opacity or the transform properties. */
    val hasAnimatedProperties: Boolean
        get() = alphaFrom != null || alphaTo != null || hasTransform

    /** Whether the spec animates any transform channel. */
    private val hasTransform: Boolean
        get() = translateXFrom != null || translateXTo != null ||
                translateYFrom != null || translateYTo != null ||
                scaleXFrom != null || scaleXTo != null ||
                scaleYFrom != null || scaleYTo != null ||
                rotationFrom != null || rotationTo != null

    /** Applies the starting state without running an animation. */
    fun prepare(view: View) {
        val density = view.resources.displayMetrics.density
        if (alphaFrom != null || alphaTo != null) {
            view.alpha = alphaFrom ?: 1f
        }
        if (hasTransform) {
            view.translationX = toPx(translateXFrom ?: 0f, density)
            view.translationY = toPx(translateYFrom ?: 0f, density)
            view.scaleX = scaleXFrom ?: 1f
            view.scaleY = scaleYFrom ?: 1f
            view.rotation = rotationFrom ?: 0f
        }
    }

    /** Applies the target state to a property animator. */
    fun animate(animator: ViewPropertyAnimator, density: Float) {
        animator.duration = durationMs
        animator.startDelay = delayMs
        animator.interpolator = easing.interpolator()
        if (alphaFrom != null || alphaTo != null) {
            animator.alpha(alphaTo ?: 1f)
        }
        if (hasTransform) {
            animator.translationX(toPx(translateXTo ?: 0f, density))
            animator.translationY(toPx(translateYTo ?: 0f, density))
            animator.scaleX(scaleXTo ?: 1f)
            animator.scaleY(scaleYTo ?: 1f)
            animator.rotation(rotationTo ?: 0f)
        }
    }

    companion object {

        /** Default animation duration in milliseconds. */
        const val DEFAULT_DURATION_MS: Long = 350L

        /** Creates a spec from a native map sent from JavaScript. */
        fun from(map: ReadableMap): InAppAnimationSpec = InAppAnimationSpec(
            durationMs = map.getFloatOrNull(InAppConstants.KEY_DURATION_MS)
                ?.toLong() ?: DEFAULT_DURATION_MS,
            delayMs = map.getFloatOrNull(InAppConstants.KEY_DELAY_MS)
                ?.toLong() ?: 0L,
            easing = InAppAnimationEasing.from(
                map.getStringOrNull(InAppConstants.KEY_EASING)
            ) ?: InAppAnimationEasing.EASE_IN_OUT,
            alphaFrom = map.getFloatOrNull(InAppConstants.KEY_ALPHA_FROM),
            alphaTo = map.getFloatOrNull(InAppConstants.KEY_ALPHA_TO),
            translateXFrom = map.getFloatOrNull(InAppConstants.KEY_TRANSLATE_X_FROM),
            translateXTo = map.getFloatOrNull(InAppConstants.KEY_TRANSLATE_X_TO),
            translateYFrom = map.getFloatOrNull(InAppConstants.KEY_TRANSLATE_Y_FROM),
            translateYTo = map.getFloatOrNull(InAppConstants.KEY_TRANSLATE_Y_TO),
            scaleXFrom = map.getFloatOrNull(InAppConstants.KEY_SCALE_X_FROM),
            scaleXTo = map.getFloatOrNull(InAppConstants.KEY_SCALE_X_TO),
            scaleYFrom = map.getFloatOrNull(InAppConstants.KEY_SCALE_Y_FROM),
            scaleYTo = map.getFloatOrNull(InAppConstants.KEY_SCALE_Y_TO),
            rotationFrom = map.getFloatOrNull(InAppConstants.KEY_ROTATION_FROM),
            rotationTo = map.getFloatOrNull(InAppConstants.KEY_ROTATION_TO)
        )
    }
}

/** Density-independent to pixel conversion. */
private fun toPx(value: Float, density: Float): Float = value * density

/** Returns a float value, treating `null` as missing. */
private fun ReadableMap.getFloatOrNull(key: String): Float? =
    if (hasNonNullKey(key)) getDouble(key).toFloat() else null

/**
 * Stores the In-App animation configuration and applies it on every show.
 *
 * The native SDK keeps a single global animation listener, therefore the store
 * registers exactly one listener and resolves the configuration by campaign
 * identifier for each presented In-App view.
 */
internal object InAppAnimationConfigStore {

    @Volatile
    private var defaultSpec: InAppAnimationSpec? = null

    @Volatile
    private var campaignSpecs: Map<String, InAppAnimationSpec> = emptyMap()

    @Volatile
    private var isRegistered: Boolean = false

    @Volatile
    private var density: Float = 1f

    /** Sets or clears the animation configuration. */
    fun set(config: ReadableMap?, density: Float) {
        this.density = density
        val parsed = parse(config)
        defaultSpec = parsed.first
        campaignSpecs = parsed.second
        registerListenerIfNeeded()
    }

    /** Parses the configuration map sent from JavaScript. */
    private fun parse(
        config: ReadableMap?
    ): Pair<InAppAnimationSpec?, Map<String, InAppAnimationSpec>> {
        if (config == null) {
            return null to emptyMap()
        }
        val default = if (config.hasNonNullKey(InAppConstants.KEY_DEFAULT)) {
            config.getMap(InAppConstants.KEY_DEFAULT)?.let(InAppAnimationSpec::from)
        } else {
            null
        }
        val campaigns = if (config.hasNonNullKey(InAppConstants.KEY_CAMPAIGNS)) {
            parseCampaigns(config.getMap(InAppConstants.KEY_CAMPAIGNS))
        } else {
            emptyMap()
        }
        return default to campaigns
    }

    /** Parses the per-campaign animation overrides. */
    private fun parseCampaigns(
        campaigns: ReadableMap?
    ): Map<String, InAppAnimationSpec> {
        if (campaigns == null) {
            return emptyMap()
        }
        val specs = HashMap<String, InAppAnimationSpec>()
        val iterator = campaigns.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            val value = if (campaigns.hasNonNullKey(key)) campaigns.getMap(key) else null
            specs[key] = value?.let(InAppAnimationSpec::from) ?: InAppAnimationSpec()
        }
        return specs
    }

    /** Registers the global native animation listener once. */
    private fun registerListenerIfNeeded() {
        if (isRegistered) {
            return
        }
        synchronized(this) {
            if (isRegistered) {
                return
            }
            isRegistered = true
            val density = density
            AltcraftSDK.inApp.animation {
                val spec = resolve(companyId)
                if (spec == null || !spec.hasAnimatedProperties) {
                    return@animation
                }
                prepare {
                    spec.prepare(this)
                }
                animate {
                    spec.animate(this, density)
                }
            }
        }
    }

    /** Resolves the spec for a campaign, falling back to the default spec. */
    private fun resolve(companyId: Int): InAppAnimationSpec? =
        campaignSpecs[companyId.toString()] ?: defaultSpec
}
