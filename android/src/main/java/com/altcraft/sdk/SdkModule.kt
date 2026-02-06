package com.altcraft.sdk

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import androidx.activity.ComponentActivity
import com.altcraft.sdk.config.AltcraftConfiguration
import com.altcraft.sdk.data.DataClasses
import com.altcraft.sdk.mob_events.PublicMobileEventFunction
import com.altcraft.sdk.push.events.PublicPushEventFunctions
import com.altcraft.sdk.push.subscribe.PublicPushSubscriptionFunctions
import com.altcraft.sdk.push.token.PublicPushTokenFunctions
import com.altcraft.sdk.rn.getArrayOrNull
import com.altcraft.sdk.rn.getBooleanOrNull
import com.altcraft.sdk.rn.getIntOrNull
import com.altcraft.sdk.rn.getMapOrNull
import com.altcraft.sdk.rn.getStringOrNull
import com.altcraft.sdk.rn.hasNonNullKey
import com.altcraft.sdk.rn.putNullableBoolean
import com.altcraft.sdk.rn.putNullableInt
import com.altcraft.sdk.rn.putNullableString
import com.altcraft.sdk.rn.toStringList
import com.altcraft.sdk.sdk_events.Events
import com.altcraft.sdk.utilities.Converter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

// ---------------------- Constants ----------------------

private object RnConstants {
    // Module
    const val MODULE_NAME: String = "Sdk"

    // JS event emitter
    const val JS_EVENT_NAME: String = "AltcraftSdkEvent"

    // Promise reject codes
    const val ERR_INIT_INVALID_CONFIG: String = "ALTCRAFT_INIT_INVALID_CONFIG"
    const val ERR_INIT_ERROR: String = "ALTCRAFT_INIT_ERROR"
    const val ERR_GET_PUSH_TOKEN: String = "getPushToken"
    const val ERR_SET_PUSH_TOKEN: String = "setPushToken"
    const val ERR_CLEAR: String = "clear"
    const val ERR_UNSUSPEND: String = "unSuspendPushSubscription"
    const val ERR_GET_LATEST_STATUS: String = "getStatusOfLatestSubscription"
    const val ERR_GET_CURRENT_STATUS: String = "getStatusForCurrentSubscription"
    const val ERR_GET_LATEST_STATUS_PROVIDER: String = "getStatusOfLatestSubscriptionForProvider"

    // Promise reject messages
    const val MSG_PROVIDER_IS_BLANK: String = "provider is blank"
    const val MSG_INIT_UNKNOWN: String = "Altcraft initialization failed with unknown error"
    const val MSG_INIT_ERROR: String = "Altcraft initialization error"

    // Keys: TokenData map
    const val KEY_PROVIDER: String = "provider"
    const val KEY_TOKEN: String = "token"

    // Keys: SDK event map
    const val KEY_FUNCTION: String = "function"
    const val KEY_CODE: String = "code"
    const val KEY_MESSAGE: String = "message"
    const val KEY_TYPE: String = "type"
    const val KEY_VALUE: String = "value"

    // Event types for JS
    const val TYPE_EVENT: String = "event"
    const val TYPE_ERROR: String = "error"
    const val TYPE_RETRY_ERROR: String = "retryError"

    // Keys: ResponseWithHttpCode -> JS map
    const val KEY_HTTP_CODE: String = "httpCode"
    const val KEY_RESPONSE: String = "response"
    const val KEY_ERROR: String = "error"
    const val KEY_ERROR_TEXT: String = "errorText"
    const val KEY_PROFILE: String = "profile"
    const val KEY_ID: String = "id"
    const val KEY_STATUS: String = "status"
    const val KEY_IS_TEST: String = "isTest"
    const val KEY_SUBSCRIPTION: String = "subscription"
    const val KEY_SUBSCRIPTION_ID: String = "subscriptionId"
    const val KEY_HASH_ID: String = "hashId"

    // Fields not mapped yet (kept for parity with TS)
    const val KEY_FIELDS: String = "fields"
    const val KEY_CATS: String = "cats"
}

@ReactModule(name = RnConstants.MODULE_NAME)
class SdkModule(reactContext: ReactApplicationContext) : NativeSdkSpec(reactContext) {

    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = RnConstants.MODULE_NAME

    /**
     * Required by NativeEventEmitter (no-op on Android).
     *
     * @param eventName Event name from JS side.
     */
    override fun addListener(eventName: String) {
        // no-op
    }

    /**
     * Required by NativeEventEmitter (no-op on Android).
     *
     * @param count Number of JS listeners removed.
     */
    override fun removeListeners(count: Double) {
        // no-op
    }

    // ---------------------- init ----------------------

    /**
     * Initializes the native Altcraft SDK using RN config map.
     *
     * @param config React Native configuration object.
     * ```
     *              Required: `apiUrl`.
     *              Optional: `rToken`, `appInfo`, `providerPriorityList`, `enableLogging`,
     *              Android-only: `android_icon`, `android_usingService`, `android_serviceMessage`,
     *              `android_pushReceiverModules`, `android_pushChannelName`, `android_pushChannelDescription`.
     * @param promise
     * ```
     * Promise resolved on success; rejected on invalid config or initialization failure.
     */
    override fun initialize(config: ReadableMap, promise: Promise) {
        AltcraftRnInitializer.initialize(
                reactContext = reactApplicationContext,
                config = config,
                promise = promise
        )
    }

    // ---------------------- token-API for RN (ONLY getPushToken / setPushToken)
    // ----------------------

    /**
     * Returns current push token data from native side.
     *
     * @param promise Resolves to `{ provider, token }` or `null` if token is not available.
     */
    override fun getPushToken(promise: Promise) {
        coroutineScope.launch {
            try {
                val tokenData = PublicPushTokenFunctions.getPushToken(reactApplicationContext)
                if (tokenData == null) {
                    promise.resolve(null)
                } else {
                    val map = Arguments.createMap()
                    map.putString(RnConstants.KEY_PROVIDER, tokenData.provider)
                    map.putString(RnConstants.KEY_TOKEN, tokenData.token)
                    promise.resolve(map)
                }
            } catch (e: Exception) {
                promise.reject(RnConstants.ERR_GET_PUSH_TOKEN, e)
            }
        }
    }

    /**
     * Sets or clears push token for the given provider.
     *
     * @param provider Provider identifier (must be non-blank).
     * @param token Token string or `null` to clear (native expects String; `null` is converted to
     * empty string).
     * @param promise Resolves when the token is saved on native side.
     */
    override fun setPushToken(provider: String, token: String?, promise: Promise) {
        if (provider.isBlank()) {
            promise.reject(RnConstants.ERR_SET_PUSH_TOKEN, RnConstants.MSG_PROVIDER_IS_BLANK)
            return
        }

        coroutineScope.launch {
            try {
                val tokenToPass: String = token ?: ""

                PublicPushTokenFunctions.setPushToken(
                        context = reactApplicationContext,
                        provider = provider,
                        token = tokenToPass
                )
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject(RnConstants.ERR_SET_PUSH_TOKEN, e)
            }
        }
    }

    // ---------------------- AltcraftSDK: clear / permission ----------------------

    /**
     * Clears SDK local state and stored data (native).
     *
     * @param promise Resolves after cleanup is finished.
     */
    override fun clear(promise: Promise) {
        try {
            AltcraftSDK.clear(reactApplicationContext) { promise.resolve(null) }
        } catch (e: Exception) {
            promise.reject(RnConstants.ERR_CLEAR, e)
        }
    }

    /**
     * Requests notification permission (Android-only runtime behavior). Safe no-op if current
     * Activity is not a ComponentActivity.
     */
    override fun requestNotificationPermission() {
        val activity = currentActivity
        if (activity !is ComponentActivity) return

        UiThreadUtil.runOnUiThread {
            try {
                AltcraftSDK.requestNotificationPermission(reactApplicationContext, activity)
            } catch (_: Exception) {
                // ignore
            }
        }
    }

    // ---------------------- MobileEvent bridge ----------------------

    /**
     * Sends a mobile event to the server (fire-and-forget).
     *
     * @param sid Pixel identifier.
     * @param eventName Event name.
     * @param sendMessageId Optional message identifier to link the event.
     * @param payload Optional event payload (string-only map).
     * @param matching Optional matching parameters (string-only map).
     * @param matchingType Optional matching mode/type.
     * @param profileFields Optional profile fields (string-only map).
     * @param subscription Optional subscription info (email/sms/push/cc_data), converted on native
     * side.
     * @param utm Optional UTM tags for attribution.
     */
    override fun mobileEvent(
            sid: String,
            eventName: String,
            sendMessageId: String?,
            payload: ReadableMap?,
            matching: ReadableMap?,
            matchingType: String?,
            profileFields: ReadableMap?,
            subscription: ReadableMap?,
            utm: ReadableMap?
    ) {
        try {
            val utmData =
                    utm?.let {
                        DataClasses.UTM(
                                campaign = it.getString("campaign"),
                                content = it.getString("content"),
                                keyword = it.getString("keyword"),
                                medium = it.getString("medium"),
                                source = it.getString("source"),
                                temp = it.getString("temp")
                        )
                    }

            PublicMobileEventFunction.mobileEvent(
                    context = reactApplicationContext,
                    sid = sid,
                    eventName = eventName,
                    sendMessageId = sendMessageId,
                    payload = Converter.toKotlinMap(payload),
                    matching = Converter.toKotlinMap(matching),
                    matchingType = matchingType,
                    profileFields = Converter.toKotlinMap(profileFields),
                    subscription = Converter.toSubscriptionOrNull(subscription),
                    utm = utmData
            )
        } catch (e: Exception) {
            // Log error but don't crash bridge
            e.printStackTrace()
        }
    }

    // ---------------------- push payload bridge ----------------------

    /**
     * Forwards a push payload to native SDK (Android-only behavior).
     *
     * @param message Push payload map (string-only).
     */
    override fun takePush(message: ReadableMap?) {
        if (message == null) return
        val map = Converter.toStringMapOrNull(message) ?: return
        if (map.isNotEmpty()) {
            AltcraftSDK.PushReceiver.takePush(reactApplicationContext, map)
        }
    }

    // ---------------------- manual push events ----------------------

    /**
     * Reports a push delivery event (Android-only behavior).
     *
     * @param message Optional push payload (string-only map).
     * @param messageUID Optional Altcraft message UID.
     */
    override fun deliveryEvent(message: ReadableMap?, messageUID: String?) {
        try {
            val map = Converter.toStringMapOrNull(message)
            PublicPushEventFunctions.deliveryEvent(
                    context = reactApplicationContext,
                    message = map,
                    messageUID = messageUID
            )
        } catch (_: Exception) {
            // ignore
        }
    }

    /**
     * Reports a push open event (Android-only behavior).
     *
     * @param message Optional push payload (string-only map).
     * @param messageUID Optional Altcraft message UID.
     */
    override fun openEvent(message: ReadableMap?, messageUID: String?) {
        try {
            val map = Converter.toStringMapOrNull(message)
            PublicPushEventFunctions.openEvent(
                    context = reactApplicationContext,
                    message = map,
                    messageUID = messageUID
            )
        } catch (_: Exception) {
            // ignore
        }
    }

    // --------------------- Events bridge for RN ---------------------

    /**
     * Subscribes native SDK events stream and forwards events to JS via DeviceEventEmitter. Calling
     * from JS multiple times replaces handler on JS side (native always emits to the same event
     * name).
     */
    override fun subscribeToEvents() {
        Events.subscribe { event -> sendEventToJs(event) }
    }

    /** Unsubscribes native SDK events stream. */
    override fun unsubscribeFromEvent() {
        Events.unsubscribe()
    }

    private fun sendEventToJs(event: DataClasses.Event) {
        val eventMap = Arguments.createMap()
        eventMap.putString(RnConstants.KEY_FUNCTION, event.function)

        val code = event.eventCode
        if (code != null) eventMap.putInt(RnConstants.KEY_CODE, code)
        else eventMap.putNull(RnConstants.KEY_CODE)

        val message = event.eventMessage ?: event.toString()
        eventMap.putString(RnConstants.KEY_MESSAGE, message)

        val value = event.eventValue
        if (value != null) {
            val valueMap = Arguments.createMap()
            for ((key, anyValue) in value.entries) {
                when (anyValue) {
                    null -> valueMap.putNull(key)
                    is String -> valueMap.putString(key, anyValue)
                    is Boolean -> valueMap.putBoolean(key, anyValue)
                    is Int -> valueMap.putInt(key, anyValue)
                    is Double -> valueMap.putDouble(key, anyValue)
                    is Float -> valueMap.putDouble(key, anyValue.toDouble())
                    is Long -> valueMap.putDouble(key, anyValue.toDouble())
                    else -> valueMap.putString(key, anyValue.toString())
                }
            }
            eventMap.putMap(RnConstants.KEY_VALUE, valueMap)
        } else {
            eventMap.putNull(RnConstants.KEY_VALUE)
        }
        val type =
                when (event) {
                    is DataClasses.Error -> RnConstants.TYPE_ERROR
                    is DataClasses.RetryError -> RnConstants.TYPE_RETRY_ERROR
                    else -> RnConstants.TYPE_EVENT
                }
        eventMap.putString(RnConstants.KEY_TYPE, type)

        reactApplicationContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(RnConstants.JS_EVENT_NAME, eventMap)
    }

    // --------------------- subscription bridge ---------------------

    /**
     * Sends a push subscribe request.
     *
     * @param sync Execution mode:
     * ```
     *             `true`  — synchronous server request returning the operation result.
     *             `false` — asynchronous server request returning enqueue result.
     *             `null`  — defaults to `true` on Android bridge.
     * @param profileFields
     * ```
     * Optional profile fields (string-only map).
     * @param customFields Optional custom fields (string-only map).
     * @param cats Optional categories list.
     * @param replace Optional flag to replace an existing subscription.
     * @param skipTriggers Optional flag to skip trigger execution on the server.
     */
    override fun pushSubscribe(
            sync: Boolean?,
            profileFields: ReadableMap?,
            customFields: ReadableMap?,
            cats: ReadableArray?,
            replace: Boolean?,
            skipTriggers: Boolean?
    ) {
        val isSync = sync ?: true
        PublicPushSubscriptionFunctions.pushSubscribe(
                context = reactApplicationContext,
                sync = isSync,
                profileFields = Converter.toKotlinMap(profileFields),
                customFields = Converter.toKotlinMap(customFields),
                cats = Converter.toCategoryListOrNull(cats),
                replace = replace,
                skipTriggers = skipTriggers
        )
    }

    /**
     * Sends a push suspend request.
     *
     * @param sync Execution mode (see [pushSubscribe]).
     * @param profileFields Optional profile fields (string-only map).
     * @param customFields Optional custom fields (string-only map).
     * @param cats Optional categories list.
     * @param replace Optional flag to replace an existing subscription.
     * @param skipTriggers Optional flag to skip trigger execution on the server.
     */
    override fun pushSuspend(
            sync: Boolean?,
            profileFields: ReadableMap?,
            customFields: ReadableMap?,
            cats: ReadableArray?,
            replace: Boolean?,
            skipTriggers: Boolean?
    ) {
        val isSync = sync ?: true
        PublicPushSubscriptionFunctions.pushSuspend(
                context = reactApplicationContext,
                sync = isSync,
                profileFields = Converter.toKotlinMap(profileFields),
                customFields = Converter.toKotlinMap(customFields),
                cats = Converter.toCategoryListOrNull(cats),
                replace = replace,
                skipTriggers = skipTriggers
        )
    }

    /**
     * Sends a push unsubscribe request.
     *
     * @param sync Execution mode (see [pushSubscribe]).
     * @param profileFields Optional profile fields (string-only map).
     * @param customFields Optional custom fields (string-only map).
     * @param cats Optional categories list.
     * @param replace Optional flag to replace an existing subscription.
     * @param skipTriggers Optional flag to skip trigger execution on the server.
     */
    override fun pushUnSubscribe(
            sync: Boolean?,
            profileFields: ReadableMap?,
            customFields: ReadableMap?,
            cats: ReadableArray?,
            replace: Boolean?,
            skipTriggers: Boolean?
    ) {
        val isSync = sync ?: true
        PublicPushSubscriptionFunctions.pushUnSubscribe(
                context = reactApplicationContext,
                sync = isSync,
                profileFields = Converter.toKotlinMap(profileFields),
                customFields = Converter.toKotlinMap(customFields),
                cats = Converter.toCategoryListOrNull(cats),
                replace = replace,
                skipTriggers = skipTriggers
        )
    }

    // --------------------- async status bridges ---------------------

    /**
     * Unsuspends push subscriptions based on native matching rules.
     *
     * @param promise Resolves to response with HTTP code or `null` if unavailable.
     */
    override fun unSuspendPushSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val res =
                        PublicPushSubscriptionFunctions.unSuspendPushSubscription(
                                reactApplicationContext
                        )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject(RnConstants.ERR_UNSUSPEND, e)
            }
        }
    }

    /**
     * Returns the status of the latest subscription in profile.
     *
     * @param promise Resolves to response with HTTP code or `null` if unavailable.
     */
    override fun getStatusOfLatestSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val res =
                        PublicPushSubscriptionFunctions.getStatusOfLatestSubscription(
                                reactApplicationContext
                        )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject(RnConstants.ERR_GET_LATEST_STATUS, e)
            }
        }
    }

    /**
     * Returns the status of the latest subscription for the given provider.
     *
     * @param provider Optional provider identifier (may be null).
     * @param promise Resolves to response with HTTP code or `null` if unavailable.
     */
    override fun getStatusOfLatestSubscriptionForProvider(provider: String?, promise: Promise) {
        coroutineScope.launch {
            try {
                val res =
                        PublicPushSubscriptionFunctions.getStatusOfLatestSubscriptionForProvider(
                                context = reactApplicationContext,
                                provider = provider
                        )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject(RnConstants.ERR_GET_LATEST_STATUS_PROVIDER, e)
            }
        }
    }

    /**
     * Returns the status for current subscription (by current provider/token context).
     *
     * @param promise Resolves to response with HTTP code or `null` if unavailable.
     */
    override fun getStatusForCurrentSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val res =
                        PublicPushSubscriptionFunctions.getStatusForCurrentSubscription(
                                reactApplicationContext
                        )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject(RnConstants.ERR_GET_CURRENT_STATUS, e)
            }
        }
    }

    /**
     * Maps {@link DataClasses.ResponseWithHttpCode} to a RN {@link WritableMap}. Returns `null` if
     * input is `null`. Unmapped fields (`fields`, `cats`) are set to `null`.
     */
    private fun responseWithHttpCodeToWritableMap(
            data: DataClasses.ResponseWithHttpCode?
    ): WritableMap? {
        if (data == null) return null

        val resp = data.response

        return Arguments.createMap().apply root@{
            putNullableInt(RnConstants.KEY_HTTP_CODE, data.httpCode)

            if (resp == null) {
                putNull(RnConstants.KEY_RESPONSE)
                return@root
            }

            val respMap =
                    Arguments.createMap().apply resp@{
                        putNullableInt(RnConstants.KEY_ERROR, resp.error)
                        putNullableString(RnConstants.KEY_ERROR_TEXT, resp.errorText)

                        val profile = resp.profile
                        if (profile == null) {
                            putNull(RnConstants.KEY_PROFILE)
                            return@resp
                        }

                        val profileMap =
                                Arguments.createMap().apply profile@{
                                    putNullableString(RnConstants.KEY_ID, profile.id)
                                    putNullableString(RnConstants.KEY_STATUS, profile.status)
                                    putNullableBoolean(RnConstants.KEY_IS_TEST, profile.isTest)

                                    val sub = profile.subscription
                                    if (sub == null) {
                                        putNull(RnConstants.KEY_SUBSCRIPTION)
                                        return@profile
                                    }

                                    val subMap =
                                            Arguments.createMap().apply sub@{
                                                putNullableString(
                                                        RnConstants.KEY_SUBSCRIPTION_ID,
                                                        sub.subscriptionId
                                                )
                                                putNullableString(
                                                        RnConstants.KEY_HASH_ID,
                                                        sub.hashId
                                                )
                                                putNullableString(
                                                        RnConstants.KEY_PROVIDER,
                                                        sub.provider
                                                )
                                                putNullableString(
                                                        RnConstants.KEY_STATUS,
                                                        sub.status
                                                )

                                                putNull(RnConstants.KEY_FIELDS)
                                                putNull(RnConstants.KEY_CATS)
                                            }

                                    putMap(RnConstants.KEY_SUBSCRIPTION, subMap)
                                }

                        putMap(RnConstants.KEY_PROFILE, profileMap)
                    }

            putMap(RnConstants.KEY_RESPONSE, respMap)
        }
    }

    /**
     * Stores a key-value pair in native persistent storage.
     *
     * Platform behavior:
     * - iOS: uses UserDefaults (optionally scoped by `suiteName` / App Group).
     * - Android: uses SharedPreferences; `suiteName` is used as preferences name.
     *
     * Supported value types:
     * - primitives (Boolean, Number, String)
     * - complex structures serialized as JSON string
     * - `null` removes the stored value
     *
     * @param suiteName Storage namespace / suite name (platform-dependent).
     * @param key Storage key.
     * @param value Value to store or `null` to remove.
     */
    override fun setUserDefaultsValue(suiteName: String?, key: String, value: String?) {
        val k = key.trim()
        if (k.isEmpty()) return

        val prefsName =
                suiteName?.trim().takeUnless { it.isNullOrEmpty() }
                        ?: reactApplicationContext.packageName

        val prefs =
                reactApplicationContext.getSharedPreferences(
                        prefsName,
                        android.content.Context.MODE_PRIVATE
                )

        if (value == null) {
            prefs.edit().remove(k).apply()
            return
        }

        val v = value.trim()

        // Store JSON as String (SharedPreferences has no native JSON type)
        if ((v.startsWith("{") && v.endsWith("}")) || (v.startsWith("[") && v.endsWith("]"))) {
            prefs.edit().putString(k, v).apply()
            return
        }

        // Boolean
        if (v.equals("true", ignoreCase = true) || v.equals("false", ignoreCase = true)) {
            prefs.edit().putBoolean(k, v.equals("true", ignoreCase = true)).apply()
            return
        }

        // Integer (Long)
        v.toLongOrNull()?.let { asLong ->
            prefs.edit().putLong(k, asLong).apply()
            return
        }

        // Double -> keep precision as String
        v.toDoubleOrNull()?.let {
            prefs.edit().putString(k, v).apply()
            return
        }

        // Fallback: String
        prefs.edit().putString(k, value).apply()
    }

    companion object {
        const val NAME: String = RnConstants.MODULE_NAME
    }
}

/** Internal RN initializer entry point. */
internal object AltcraftRnInitializer {

    fun initialize(reactContext: ReactApplicationContext, config: ReadableMap, promise: Promise) {
        try {
            val configuration = AltcraftRnConfigMapper.buildConfiguration(config)

            AltcraftSDK.initialization(reactContext, configuration) { result ->
                reactContext.runOnUiQueueThread {
                    if (result.isSuccess) {
                        promise.resolve(null)
                    } else {
                        val throwable = result.exceptionOrNull()
                        if (throwable != null) {
                            promise.reject(
                                    RnConstants.ERR_INIT_ERROR,
                                    throwable.message ?: RnConstants.MSG_INIT_ERROR,
                                    throwable
                            )
                        } else {
                            promise.reject(RnConstants.ERR_INIT_ERROR, RnConstants.MSG_INIT_UNKNOWN)
                        }
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject(
                    RnConstants.ERR_INIT_INVALID_CONFIG,
                    e.message ?: "Invalid Altcraft configuration",
                    e
            )
        }
    }
}

/** Maps React Native configuration object to native [AltcraftConfiguration]. */
internal object AltcraftRnConfigMapper {

    private const val KEY_API_URL = "apiUrl"
    private const val KEY_R_TOKEN = "rToken"
    private const val KEY_APP_INFO = "appInfo"
    private const val KEY_PROVIDER_PRIORITY_LIST = "providerPriorityList"
    private const val KEY_ENABLE_LOGGING = "enableLogging"

    private const val KEY_ANDROID_ICON = "android_icon"
    private const val KEY_ANDROID_USING_SERVICE = "android_usingService"
    private const val KEY_ANDROID_SERVICE_MESSAGE = "android_serviceMessage"
    private const val KEY_ANDROID_PUSH_RECEIVER_MODULES = "android_pushReceiverModules"
    private const val KEY_ANDROID_PUSH_CHANNEL_NAME = "android_pushChannelName"
    private const val KEY_ANDROID_PUSH_CHANNEL_DESCRIPTION = "android_pushChannelDescription"

    private const val KEY_APP_ID = "appID"
    private const val KEY_APP_IID = "appIID"
    private const val KEY_APP_VER = "appVer"

    private const val MSG_API_URL_REQUIRED = "apiUrl is required for AltcraftConfiguration"
    private const val MSG_API_URL_MUST_BE_STRING = "apiUrl must be a non-null string"

    fun buildConfiguration(config: ReadableMap): AltcraftConfiguration {
        if (!config.hasNonNullKey(KEY_API_URL)) {
            throw IllegalArgumentException(MSG_API_URL_REQUIRED)
        }

        val apiUrl =
                config.getString(KEY_API_URL)
                        ?: throw IllegalArgumentException(MSG_API_URL_MUST_BE_STRING)

        val rToken = config.getStringOrNull(KEY_R_TOKEN)

        val appInfo =
                config.getMapOrNull(KEY_APP_INFO)?.let { appInfoMap ->
                    val appID = appInfoMap.getStringOrNull(KEY_APP_ID) ?: ""
                    val appIID = appInfoMap.getStringOrNull(KEY_APP_IID) ?: ""
                    val appVer = appInfoMap.getStringOrNull(KEY_APP_VER) ?: ""
                    DataClasses.AppInfo(appID = appID, appIID = appIID, appVer = appVer)
                }

        val providerPriorityList = config.getArrayOrNull(KEY_PROVIDER_PRIORITY_LIST)?.toStringList()

        val enableLogging = config.getBooleanOrNull(KEY_ENABLE_LOGGING)

        val icon = config.getIntOrNull(KEY_ANDROID_ICON)

        val usingService = config.getBooleanOrNull(KEY_ANDROID_USING_SERVICE) ?: false

        val serviceMessage = config.getStringOrNull(KEY_ANDROID_SERVICE_MESSAGE)

        val pushReceiverModules =
                config.getArrayOrNull(KEY_ANDROID_PUSH_RECEIVER_MODULES)?.toStringList()

        val pushChannelName = config.getStringOrNull(KEY_ANDROID_PUSH_CHANNEL_NAME)

        val pushChannelDescription = config.getStringOrNull(KEY_ANDROID_PUSH_CHANNEL_DESCRIPTION)

        return AltcraftConfiguration.Builder(
                        apiUrl = apiUrl,
                        icon = icon,
                        rToken = rToken,
                        usingService = usingService,
                        serviceMessage = serviceMessage,
                        appInfo = appInfo,
                        providerPriorityList = providerPriorityList,
                        pushReceiverModules = pushReceiverModules,
                        pushChannelName = pushChannelName,
                        pushChannelDescription = pushChannelDescription,
                        enableLogging = enableLogging
                )
                .build()
    }
}
