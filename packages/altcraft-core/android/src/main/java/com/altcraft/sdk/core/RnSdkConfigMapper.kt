package com.altcraft.sdk.core

import com.altcraft.sdk.config.AltcraftConfiguration
import com.altcraft.sdk.data.models.CoreModels.PropertyModel.AppInfo
import com.altcraft.sdk.core.rn.getBooleanOrNull
import com.altcraft.sdk.core.rn.getMapOrNull
import com.altcraft.sdk.core.rn.getStringOrNull
import com.altcraft.sdk.core.rn.hasNonNullKey
import com.facebook.react.bridge.ReadableMap
import org.json.JSONArray
import org.json.JSONObject

/** Shared constants for the Altcraft RN modules. */
object SdkConstants {
    // JS event emitter
    const val JS_EVENT_NAME: String = "AltcraftSdkEvent"

    // JS event for JWT requests from the native provider
    const val JWT_REQUEST_EVENT_NAME: String = "altcraftJwtRequest"
}

/** Maps React Native configuration objects to the native [AltcraftConfiguration] builder. */
@Suppress("SpellCheckingInspection")
object AltRnConfigMapper {

    private const val KEY_API_URL = "apiUrl"
    private const val KEY_R_TOKEN = "rToken"
    private const val KEY_APP_INFO = "appInfo"
    private const val KEY_ENABLE_LOGGING = "enableLogging"
    private const val KEY_MODULE_CONFIGS = "moduleConfigs"

    private const val KEY_APP_ID = "appID"
    private const val KEY_APP_IID = "appIID"
    private const val KEY_APP_VER = "appVer"

    private const val MSG_API_URL_REQUIRED = "apiUrl is required for AltcraftConfiguration"
    private const val MSG_API_URL_MUST_BE_STRING = "apiUrl must be a non-null string"

    /** Core configuration builder (push/in-app options are added by module contributors). */
    fun coreConfigurationBuilder(config: ReadableMap): AltcraftConfiguration.Builder {
        if (!config.hasNonNullKey(KEY_API_URL)) {
            throw IllegalArgumentException(MSG_API_URL_REQUIRED)
        }

        val apiUrl =
            config.getString(KEY_API_URL)
                ?: throw IllegalArgumentException(MSG_API_URL_MUST_BE_STRING)

        return AltcraftConfiguration.Builder(
            apiUrl = apiUrl,
            rToken = config.getStringOrNull(KEY_R_TOKEN),
            appInfo = config.getMapOrNull(KEY_APP_INFO)?.let { appInfoMap ->
                AppInfo(
                    appID = appInfoMap.getStringOrNull(KEY_APP_ID) ?: "",
                    appIID = appInfoMap.getStringOrNull(KEY_APP_IID) ?: "",
                    appVer = appInfoMap.getStringOrNull(KEY_APP_VER) ?: "1.0.0"
                )
            },
            enableLogging = config.getBooleanOrNull(KEY_ENABLE_LOGGING)
        )
    }

    /**
     * Parses serialized module configurations produced by JS builder
     * extensions.
     */
    fun moduleConfigs(config: ReadableMap): Map<String, Map<String, Any?>> {
        val raw = config.getStringOrNull(KEY_MODULE_CONFIGS) ?: return emptyMap()
        val root = try {
            JSONObject(raw)
        } catch (_: Exception) {
            return emptyMap()
        }
        return root.keys().asSequence().associateWith { moduleId ->
            val options = root.optJSONObject(moduleId) ?: JSONObject()
            options.keys().asSequence().associateWith { key ->
                jsonValue(options.opt(key))
            }
        }
    }

    /** Converts an org.json value into a plain Kotlin value. */
    private fun jsonValue(value: Any?): Any? = when (value) {
        null, JSONObject.NULL -> null
        is JSONObject -> value.keys().asSequence()
            .associateWith { key -> jsonValue(value.opt(key)) }

        is JSONArray -> (0 until value.length()).map { index ->
            jsonValue(value.opt(index))
        }

        is Int, is Long, is Double, is Boolean, is String -> value
        else -> value.toString()
    }
}
