package com.altcraft.sdk

import androidx.activity.ComponentActivity
import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.config.AltcraftConfiguration
import com.altcraft.sdk.data.DataClasses
import com.altcraft.sdk.mob_events.PublicMobileEventFunction
import com.altcraft.sdk.push.events.PublicPushEventFunctions
import com.altcraft.sdk.push.subscribe.PublicPushSubscriptionFunctions
import com.altcraft.sdk.push.token.PublicPushTokenFunctions
import com.altcraft.sdk.rn.providers.RnFCMProvider
import com.altcraft.sdk.rn.providers.RnHMSProvider
import com.altcraft.sdk.rn.providers.RnJWTProvider
import com.altcraft.sdk.rn.providers.RnRuStoreProvider
import com.altcraft.sdk.sdk_events.Events
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * React Native bridge module for Altcraft Android SDK.
 *
 * Responsibilities:
 * - Initializes the SDK from JS configuration.
 * - Provides token/auth providers (JWT, FCM, HMS, RuStore).
 * - Exposes push token API (get/set/delete/force update).
 * - Bridges subscription calls and async status methods.
 * - Emits SDK events to JS via DeviceEventEmitter ("AltcraftSdkEvent").
 *
 * Threading:
 * - Async / I/O methods are executed on [Dispatchers.IO].
 * - Some SDK callbacks are marshalled back to the UI queue when required.
 */
@ReactModule(name = SdkModule.NAME)
class SdkModule(
    reactContext: ReactApplicationContext
) : NativeSdkSpec(reactContext) {

    /**
     * Background scope for bridge calls that must not block JS thread.
     *
     * Note: lifecycle is bound to the module instance. If you later add teardown,
     * cancel this scope accordingly.
     */
    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = NAME

    // ---------------------- init / auth / providers ----------------------

    /**
     * Initializes Altcraft SDK with configuration provided from React Native.
     *
     * Expected behavior:
     * - Resolves [promise] with `null` on success.
     * - Rejects [promise] with:
     *   - ALTCRAFT_INIT_INVALID_CONFIG — if config mapping failed/invalid.
     *   - ALTCRAFT_INIT_ERROR — if SDK initialization returned failure.
     *
     * Threading:
     * - SDK init callback is marshalled to UI queue before resolving/rejecting.
     */
    override fun initialize(config: ReadableMap, promise: Promise) {
        AltcraftRnInitializer.initialize(
            reactApplicationContext,
            config,
            promise
        )
    }

    /**
     * Sets JWT token for requests performed by Altcraft SDK.
     *
     * If [token] is null/blank:
     * - Clears RN provider state and disables JWT provider in the SDK.
     *
     * If [token] is provided:
     * - Stores token in RN provider and registers it in the SDK.
     *
     * Notes:
     * - This method is synchronous and safe to call multiple times.
     */
    override fun setJwt(token: String?) {
        if (token.isNullOrBlank()) {
            RnJWTProvider.clear()
            AltcraftSDK.setJWTProvider(null)
        } else {
            RnJWTProvider.setToken(token)
            AltcraftSDK.setJWTProvider(RnJWTProvider)
        }
    }

    /**
     * Sets FCM token for Android push provider.
     *
     * If [token] is null/blank:
     * - Clears provider state and unregisters provider from SDK.
     *
     * If [token] is provided:
     * - Stores token and registers provider in SDK push token functions.
     */
    override fun setAndroidFcmToken(token: String?) {
        if (token.isNullOrBlank()) {
            RnFCMProvider.clear()
            PublicPushTokenFunctions.setFCMTokenProvider(null)
        } else {
            RnFCMProvider.setToken(token)
            PublicPushTokenFunctions.setFCMTokenProvider(RnFCMProvider)
        }
    }

    /**
     * iOS-only API. No-op on Android.
     *
     * Exists to keep the RN Spec platform-agnostic.
     */
    override fun setIosFcmToken(token: String?) {
        // no-op on Android
    }

    /**
     * Sets HMS token for Android push provider.
     *
     * If [token] is null/blank:
     * - Clears provider state and unregisters provider from SDK.
     *
     * If [token] is provided:
     * - Stores token and registers provider in SDK push token functions.
     */
    override fun setAndroidHmsToken(token: String?) {
        if (token.isNullOrBlank()) {
            RnHMSProvider.clear()
            PublicPushTokenFunctions.setHMSTokenProvider(null)
        } else {
            RnHMSProvider.setToken(token)
            PublicPushTokenFunctions.setHMSTokenProvider(RnHMSProvider)
        }
    }

    /**
     * iOS-only API. No-op on Android.
     *
     * Exists to keep the RN Spec platform-agnostic.
     */
    override fun setIosHmsToken(token: String?) {
        // no-op on Android
    }

    /**
     * iOS-only API. No-op on Android.
     *
     * Exists to keep the RN Spec platform-agnostic.
     */
    override fun setApnsToken(token: String?) {
        // no-op on Android
    }

    /**
     * Sets RuStore token for Android push provider.
     *
     * If [token] is null/blank:
     * - Clears provider state and unregisters provider from SDK.
     *
     * If [token] is provided:
     * - Stores token and registers provider in SDK push token functions.
     */
    override fun setRustoreToken(token: String?) {
        if (token.isNullOrBlank()) {
            RnRuStoreProvider.clear()
            PublicPushTokenFunctions.setRuStoreTokenProvider(null)
        } else {
            RnRuStoreProvider.setToken(token)
            PublicPushTokenFunctions.setRuStoreTokenProvider(RnRuStoreProvider)
        }
    }

    // ---------------------- required for NativeEventEmitter ----------------------

    /**
     * React Native requires this method when JS uses NativeEventEmitter.
     *
     * RN may call it when JS adds a listener for a given [eventName].
     * We don't need native-side bookkeeping here because we manage SDK subscription
     * explicitly via [subscribeToEvents]/[unsubscribeFromEvent].
     */
    override fun addListener(eventName: String) {
        // no-op
    }

    /**
     * React Native requires this method when JS uses NativeEventEmitter.
     *
     * RN may call it to notify native side that [count] listeners were removed.
     * We keep it as no-op for symmetry with [addListener].
     */
    override fun removeListeners(count: Double) {
        // no-op
    }

    // ---------------------- token-API for RN ----------------------

    /**
     * Returns current push token resolved by Altcraft SDK (if available).
     *
     * Promise:
     * - resolves `null` if token is not available yet;
     * - resolves `{ provider: string, token: string }` if available;
     * - rejects on unexpected errors.
     *
     * Threading:
     * - executed on IO dispatcher.
     */
    override fun getPushToken(promise: Promise) {
        coroutineScope.launch {
            try {
                val tokenData = PublicPushTokenFunctions.getPushToken(reactApplicationContext)
                if (tokenData == null) {
                    promise.resolve(null)
                } else {
                    val map = Arguments.createMap()
                    map.putString("provider", tokenData.provider)
                    map.putString("token", tokenData.token)
                    promise.resolve(map)
                }
            } catch (e: Exception) {
                promise.reject("getPushToken", e)
            }
        }
    }

    /**
     * Deletes device token for a specific provider on backend (and/or local SDK state,
     * depending on SDK implementation).
     *
     * Params:
     * - [provider] — provider identifier (e.g. "fcm", "hms", "rustore").
     *
     * Promise:
     * - resolves `null` on success;
     * - rejects if [provider] is null or request fails.
     *
     * Threading:
     * - executed on IO dispatcher.
     */
    override fun deleteDeviceToken(provider: String?, promise: Promise) {
        val p: String = provider ?: run {
            promise.reject("deleteDeviceToken", "provider is null")
            return
        }

        coroutineScope.launch {
            try {
                PublicPushTokenFunctions.deleteDeviceToken(reactApplicationContext, p)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("deleteDeviceToken", e)
            }
        }
    }

    /**
     * Forces push token update flow in the SDK.
     *
     * Promise:
     * - resolves `null` when update flow completes (SDK callback).
     * - rejects on unexpected errors.
     *
     * Threading:
     * - executed on IO dispatcher.
     */
    override fun forcedTokenUpdate(promise: Promise) {
        coroutineScope.launch {
            try {
                PublicPushTokenFunctions.forcedTokenUpdate(reactApplicationContext) {
                    promise.resolve(null)
                }
            } catch (e: Exception) {
                promise.reject("forcedTokenUpdate", e)
            }
        }
    }

    /**
     * Updates push provider priority list (order of providers to be used/preferred).
     *
     * Params:
     * - [priorityList] — array of provider ids in desired order.
     *
     * Promise:
     * - resolves `null` on success;
     * - rejects on failure.
     *
     * Threading:
     * - executed on IO dispatcher.
     */
    override fun changePushProviderPriorityList(priorityList: ReadableArray?, promise: Promise) {
        val list = priorityList.toStringList()
        coroutineScope.launch {
            try {
                PublicPushTokenFunctions.changePushProviderPriorityList(
                    context = reactApplicationContext,
                    priorityList = list
                )
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("changePushProviderPriorityList", e)
            }
        }
    }

    /**
     * Sets or clears push token for a specific provider.
     *
     * JS Spec: setPushToken(provider: string, token: string | null): Promise<void>
     *
     * Behavior:
     * - if [token] == null -> treated as "clear token" and calls deleteDeviceToken(provider)
     * - if [token] != null -> calls setPushToken(provider, token)
     *
     * Promise:
     * - resolves `null` on success;
     * - rejects on invalid provider or request failures.
     *
     * Threading:
     * - executed on IO dispatcher.
     */
    override fun setPushToken(provider: String, token: String?, promise: Promise) {
        if (provider.isBlank()) {
            promise.reject("setPushToken", "provider is blank")
            return
        }

        coroutineScope.launch {
            try {
                if (token == null) {
                    PublicPushTokenFunctions.deleteDeviceToken(
                        context = reactApplicationContext,
                        provider = provider
                    )
                    promise.resolve(null)
                    return@launch
                }

                PublicPushTokenFunctions.setPushToken(
                    context = reactApplicationContext,
                    provider = provider,
                    token = token
                )
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("setPushToken", e)
            }
        }
    }

    // ---------------------- AltcraftSDK: clear / retry / permission ----------------------

    /**
     * Clears SDK local state (tokens/subscriptions/cache depending on SDK implementation).
     *
     * Promise:
     * - resolves `null` on success;
     * - rejects on unexpected errors.
     */
    override fun clear(promise: Promise) {
        try {
            AltcraftSDK.clear(reactApplicationContext) {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("clear", e)
        }
    }

    /**
     * Reinitializes retry control for current session.
     *
     * Intended use:
     * - allows SDK to reset retry counters/logic without full re-init.
     *
     * Notes:
     * - swallow exceptions by design (bridge safety).
     */
    override fun reinitializeRetryControlInThisSession() {
        try {
            AltcraftSDK.reinitializeRetryControlInThisSession()
        } catch (_: Exception) {
        }
    }

    /**
     * Requests Android notification permission (where applicable).
     *
     * Requirements:
     * - [currentActivity] must be a [ComponentActivity], otherwise this is no-op.
     *
     * Threading:
     * - permission request is executed on UI thread.
     */
    override fun requestNotificationPermission() {
        val activity = currentActivity
        if (activity !is ComponentActivity) {
            return
        }
        UiThreadUtil.runOnUiThread {
            try {
                AltcraftSDK.requestNotificationPermission(
                    reactApplicationContext,
                    activity
                )
            } catch (_: Exception) {
            }
        }
    }

    // ---------------------- MobileEvent bridge ----------------------

    /**
     * Sends a mobile event to Altcraft backend via SDK.
     *
     * Params:
     * - [sid] — session/subscribe identifier (SDK-specific).
     * - [eventName] — event name.
     * - [sendMessageId] — optional message id to link event with campaign.
     * - [payload] — event payload.
     * - [matching] — matching fields.
     * - [matchingType] — matching strategy/type (SDK-specific).
     * - [profileFields] — profile fields to attach/update.
     *
     * Notes:
     * - `subscription` and `utm` are not supported in RN bridge yet (sent as null).
     * - exceptions are swallowed by design to keep JS bridge stable.
     */
    override fun mobileEvent(
        sid: String,
        eventName: String,
        sendMessageId: String?,
        payload: ReadableMap?,
        matching: ReadableMap?,
        matchingType: String?,
        profileFields: ReadableMap?
    ) {
        try {
            PublicMobileEventFunction.mobileEvent(
                context = reactApplicationContext,
                sid = sid,
                eventName = eventName,
                sendMessageId = sendMessageId,
                payload = payload.toMapOrNull(),
                matching = matching.toMapOrNull(),
                matchingType = matchingType,
                profileFields = profileFields.toMapOrNull(),
                subscription = null,
                utm = null
            )
        } catch (_: Exception) {
        }
    }

    // ---------------------- push payload bridge ----------------------

    /**
     * Passes raw push payload to SDK for parsing/processing.
     *
     * Input:
     * - [message] is a map of string key/value pairs (RN side object).
     *
     * Behavior:
     * - converts [ReadableMap] into Map<String, String> and forwards it into SDK receiver.
     * - if [message] is null or results in empty map — no-op.
     */
    override fun takePush(message: ReadableMap?) {
        if (message == null) return

        val map = mutableMapOf<String, String>()
        val iterator = message.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            if (!message.isNull(key)) {
                val value = message.getString(key)
                if (value != null) {
                    map[key] = value
                }
            }
        }

        if (map.isNotEmpty()) {
            AltcraftSDK.PushReceiver.takePush(reactApplicationContext, map)
        }
    }

    /**
     * Sends push delivery event (SDK analytics/track).
     *
     * Params:
     * - [message] — raw push payload as map (string key/value).
     * - [messageUID] — optional unique message id.
     *
     * Notes:
     * - Exceptions are swallowed to avoid breaking JS flow.
     */
    override fun deliveryEvent(message: ReadableMap?, messageUID: String?) {
        try {
            val map = message.toStringMapOrNull()
            PublicPushEventFunctions.deliveryEvent(
                context = reactApplicationContext,
                message = map,
                messageUID = messageUID
            )
        } catch (_: Exception) {
        }
    }

    /**
     * Sends push open event (SDK analytics/track).
     *
     * Params:
     * - [message] — raw push payload as map (string key/value).
     * - [messageUID] — optional unique message id.
     *
     * Notes:
     * - Exceptions are swallowed to avoid breaking JS flow.
     */
    override fun openEvent(message: ReadableMap?, messageUID: String?) {
        try {
            val map = message.toStringMapOrNull()
            PublicPushEventFunctions.openEvent(
                context = reactApplicationContext,
                message = map,
                messageUID = messageUID
            )
        } catch (_: Exception) {
        }
    }

    // --------------------- Events bridge for RN ---------------------

    /**
     * Subscribes to SDK events and forwards them to JS.
     *
     * JS side listens to:
     * - event name: "AltcraftSdkEvent"
     * - payload: { function, code?, message, value?, type }
     *
     * Notes:
     * - For multiple subscriptions from JS, use JS-side guard (your TS already does it).
     */
    override fun subscribeToEvents() {
        Events.subscribe { event -> sendEventToJs(event) }
    }

    /**
     * Unsubscribes from SDK event stream.
     *
     * This stops forwarding events to JS.
     */
    override fun unsubscribeFromEvent() {
        Events.unsubscribe()
    }

    /**
     * Converts SDK event model to React Native friendly payload and emits it to JS.
     *
     * Payload schema:
     * - function: String
     * - code: Int? (nullable)
     * - message: String
     * - value: Map<String, Any?>? (nullable)
     * - type: "event" | "error" | "retryError"
     */
    private fun sendEventToJs(event: DataClasses.Event) {
        val eventMap = Arguments.createMap()
        eventMap.putString("function", event.function)

        val code = event.eventCode
        if (code != null) {
            eventMap.putInt("code", code)
        } else {
            eventMap.putNull("code")
        }

        val message = event.eventMessage ?: event.toString()
        eventMap.putString("message", message)

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
            eventMap.putMap("value", valueMap)
        } else {
            eventMap.putNull("value")
        }

        val type = when (event) {
            is DataClasses.Error -> "error"
            is DataClasses.RetryError -> "retryError"
            else -> "event"
        }
        eventMap.putString("type", type)

        reactApplicationContext
            .getJSModule(RCTDeviceEventEmitter::class.java)
            .emit("AltcraftSdkEvent", eventMap)
    }

    // --------------------- utils ---------------------

    /**
     * Converts [ReadableMap] into Kotlin Map or returns null for empty input.
     */
    private fun ReadableMap?.toMapOrNull(): Map<String, Any?>? {
        if (this == null) return null
        val hash = this.toHashMap()
        return if (hash.isEmpty()) null else hash.toMap()
    }

    /**
     * Converts RN array of category objects into SDK category list.
     *
     * Returns null for:
     * - null input
     * - empty input
     * - when all items are invalid
     */
    private fun ReadableArray?.toCategoryListOrNull(): List<DataClasses.CategoryData>? {
        if (this == null || this.size() == 0) return null

        val result = mutableListOf<DataClasses.CategoryData>()
        for (i in 0 until this.size()) {
            val item = this.getMap(i) ?: continue

            val name = if (item.hasKey("name") && !item.isNull("name")) item.getString("name") else null
            val title = if (item.hasKey("title") && !item.isNull("title")) item.getString("title") else null
            val steady = if (item.hasKey("steady") && !item.isNull("steady")) item.getBoolean("steady") else null
            val active = if (item.hasKey("active") && !item.isNull("active")) item.getBoolean("active") else null

            result.add(
                DataClasses.CategoryData(
                    name = name,
                    title = title,
                    steady = steady,
                    active = active
                )
            )
        }

        return if (result.isEmpty()) null else result
    }

    /**
     * Converts RN string array into Kotlin list.
     *
     * Returns empty list for null/empty input.
     */
    private fun ReadableArray?.toStringList(): List<String> {
        if (this == null || this.size() == 0) return emptyList()

        val res = mutableListOf<String>()
        for (i in 0 until this.size()) {
            if (!this.isNull(i)) {
                val v = this.getString(i)
                if (v != null) res.add(v)
            }
        }
        return res
    }

    /**
     * Converts RN map into Map<String, String>.
     *
     * - Skips null values and non-string values (ReadableMap.getString returns null).
     * - Returns null if map is null or results in empty output.
     */
    private fun ReadableMap?.toStringMapOrNull(): Map<String, String>? {
        if (this == null) return null
        val iterator = this.keySetIterator()
        if (!iterator.hasNextKey()) return null

        val result = mutableMapOf<String, String>()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            if (this.isNull(key)) continue
            val value = this.getString(key)
            if (value != null) {
                result[key] = value
            }
        }

        return if (result.isEmpty()) null else result.toMap()
    }

    // --------------------- subscription bridge ---------------------

    /**
     * Subscribes device/profile for push notifications.
     *
     * Params:
     * - [sync] — if true, performs sync behavior according to SDK rules (defaults to true).
     * - [profileFields] — profile fields for subscription.
     * - [customFields] — custom fields for subscription.
     * - [cats] — categories array.
     * - [replace] — replace existing fields/categories (SDK-specific).
     * - [skipTriggers] — skip triggers (SDK-specific).
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
            profileFields = profileFields.toMapOrNull(),
            customFields = customFields.toMapOrNull(),
            cats = cats.toCategoryListOrNull(),
            replace = replace,
            skipTriggers = skipTriggers
        )
    }

    /**
     * Suspends current push subscription (temporarily disables).
     *
     * Params are equivalent to [pushSubscribe].
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
            profileFields = profileFields.toMapOrNull(),
            customFields = customFields.toMapOrNull(),
            cats = cats.toCategoryListOrNull(),
            replace = replace,
            skipTriggers = skipTriggers
        )
    }

    /**
     * Unsubscribes (disables) current push subscription.
     *
     * Params are equivalent to [pushSubscribe].
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
            profileFields = profileFields.toMapOrNull(),
            customFields = customFields.toMapOrNull(),
            cats = cats.toCategoryListOrNull(),
            replace = replace,
            skipTriggers = skipTriggers
        )
    }

    // --------------------- async status bridges ---------------------

    /**
     * Tries to un-suspend push subscription (async request to backend).
     *
     * Promise:
     * - resolves ResponseWithHttpCode mapped to JS object:
     *   { httpCode: number|null, response: { ... } | null }
     * - resolves null if SDK returned null
     * - rejects on unexpected errors
     */
    override fun unSuspendPushSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val res = PublicPushSubscriptionFunctions.unSuspendPushSubscription(
                    reactApplicationContext
                )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject("unSuspendPushSubscription", e)
            }
        }
    }

    /**
     * Returns status of the latest subscription operation (async).
     *
     * Promise:
     * - resolves mapped ResponseWithHttpCode or null
     * - rejects on unexpected errors
     */
    override fun getStatusOfLatestSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val res = PublicPushSubscriptionFunctions.getStatusOfLatestSubscription(
                    reactApplicationContext
                )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject("getStatusOfLatestSubscription", e)
            }
        }
    }

    /**
     * Returns status of the latest subscription operation for a specific [provider] (async).
     *
     * Promise:
     * - resolves mapped ResponseWithHttpCode or null
     * - rejects on unexpected errors
     */
    override fun getStatusOfLatestSubscriptionForProvider(
        provider: String?,
        promise: Promise
    ) {
        coroutineScope.launch {
            try {
                val res = PublicPushSubscriptionFunctions.getStatusOfLatestSubscriptionForProvider(
                    context = reactApplicationContext,
                    provider = provider
                )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject("getStatusOfLatestSubscriptionForProvider", e)
            }
        }
    }

    /**
     * Returns status for current subscription (async).
     *
     * Promise:
     * - resolves mapped ResponseWithHttpCode or null
     * - rejects on unexpected errors
     */
    override fun getStatusForCurrentSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val res = PublicPushSubscriptionFunctions.getStatusForCurrentSubscription(
                    reactApplicationContext
                )
                promise.resolve(responseWithHttpCodeToWritableMap(res))
            } catch (e: Exception) {
                promise.reject("getStatusForCurrentSubscription", e)
            }
        }
    }

    /**
     * Maps SDK [DataClasses.ResponseWithHttpCode] into a JS-friendly [WritableMap].
     *
     * Output schema:
     * - httpCode: Int?
     * - response: {
     *     error: Int?,
     *     errorText: String?,
     *     profile: {
     *       id: String?,
     *       status: String?,
     *       isTest: Boolean?,
     *       subscription: {
     *         subscriptionId: String?,
     *         hashId: String?,
     *         provider: String?,
     *         status: String?,
     *         fields: null,
     *         cats: null
     *       } | null
     *     } | null
     *   } | null
     */
    private fun responseWithHttpCodeToWritableMap(
        data: DataClasses.ResponseWithHttpCode?
    ): WritableMap? {
        if (data == null) return null

        val root = Arguments.createMap()

        val httpCode = data.httpCode
        if (httpCode != null) {
            root.putInt("httpCode", httpCode)
        } else {
            root.putNull("httpCode")
        }

        val resp = data.response
        if (resp == null) {
            root.putNull("response")
            return root
        }

        val respMap = Arguments.createMap()

        val error = resp.error
        if (error != null) {
            respMap.putInt("error", error)
        } else {
            respMap.putNull("error")
        }

        val errorText = resp.errorText
        if (errorText != null) {
            respMap.putString("errorText", errorText)
        } else {
            respMap.putNull("errorText")
        }

        val profile = resp.profile
        if (profile == null) {
            respMap.putNull("profile")
        } else {
            val profileMap = Arguments.createMap()

            val profileId = profile.id
            if (profileId != null) {
                profileMap.putString("id", profileId)
            } else {
                profileMap.putNull("id")
            }

            val status = profile.status
            if (status != null) {
                profileMap.putString("status", status)
            } else {
                profileMap.putNull("status")
            }

            val isTest = profile.isTest
            if (isTest != null) {
                profileMap.putBoolean("isTest", isTest)
            } else {
                profileMap.putNull("isTest")
            }

            val sub = profile.subscription
            if (sub == null) {
                profileMap.putNull("subscription")
            } else {
                val subMap = Arguments.createMap()

                val subscriptionId = sub.subscriptionId
                if (subscriptionId != null) {
                    subMap.putString("subscriptionId", subscriptionId)
                } else {
                    subMap.putNull("subscriptionId")
                }

                val hashId = sub.hashId
                if (hashId != null) {
                    subMap.putString("hashId", hashId)
                } else {
                    subMap.putNull("hashId")
                }

                val provider = sub.provider
                if (provider != null) {
                    subMap.putString("provider", provider)
                } else {
                    subMap.putNull("provider")
                }

                val subStatus = sub.status
                if (subStatus != null) {
                    subMap.putString("status", subStatus)
                } else {
                    subMap.putNull("status")
                }

                // Kept as is (reserved for future schema extension).
                subMap.putNull("fields")
                subMap.putNull("cats")

                profileMap.putMap("subscription", subMap)
            }

            respMap.putMap("profile", profileMap)
        }

        root.putMap("response", respMap)
        return root
    }

    companion object {
        const val NAME: String = "Sdk"
    }
}

/**
 * Internal RN initializer entry point.
 *
 * Converts RN config -> [AltcraftConfiguration] and performs [AltcraftSDK.initialization].
 * All errors are mapped into RN Promise rejections with stable error codes.
 */
internal object AltcraftRnInitializer {

    /**
     * Initializes Altcraft SDK with mapped configuration.
     *
     * Promise contract:
     * - resolve(null) on success
     * - reject("ALTCRAFT_INIT_INVALID_CONFIG", ...) if config mapping failed
     * - reject("ALTCRAFT_INIT_ERROR", ...) if SDK init failed
     */
    fun initialize(
        reactContext: ReactApplicationContext,
        config: ReadableMap,
        promise: Promise
    ) {
        try {
            val configuration = AltcraftRnConfigMapper.buildConfiguration(config)

            AltcraftSDK.initialization(
                reactContext,
                configuration
            ) { result ->
                reactContext.runOnUiQueueThread {
                    if (result.isSuccess) {
                        promise.resolve(null)
                    } else {
                        val throwable = result.exceptionOrNull()
                        if (throwable != null) {
                            promise.reject(
                                "ALTCRAFT_INIT_ERROR",
                                throwable.message ?: "Altcraft initialization error",
                                throwable
                            )
                        } else {
                            promise.reject(
                                "ALTCRAFT_INIT_ERROR",
                                "Altcraft initialization failed with unknown error"
                            )
                        }
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject(
                "ALTCRAFT_INIT_INVALID_CONFIG",
                e.message ?: "Invalid Altcraft configuration",
                e
            )
        }
    }
}

/**
 * Maps React Native configuration object to native [AltcraftConfiguration].
 *
 * Notes:
 * - `apiUrl` is required.
 * - `enableLogging` is nullable to keep SDK default behavior when not provided.
 * - android-only keys are prefixed with `android_*` so iOS can safely ignore them.
 */
internal object AltcraftRnConfigMapper {

    /**
     * Builds native SDK configuration from RN map.
     *
     * @throws IllegalArgumentException if required fields are missing or invalid.
     */
    fun buildConfiguration(config: ReadableMap): AltcraftConfiguration {
        if (!config.hasKey("apiUrl") || config.isNull("apiUrl")) {
            throw IllegalArgumentException("apiUrl is required for AltcraftConfiguration")
        }

        val apiUrl = config.getString("apiUrl")
            ?: throw IllegalArgumentException("apiUrl must be a non-null string")

        // ---------------- COMMON ----------------

        val rToken: String? =
            if (config.hasKey("rToken") && !config.isNull("rToken")) {
                config.getString("rToken")
            } else {
                null
            }

        val appInfo: DataClasses.AppInfo? =
            if (config.hasKey("appInfo") && !config.isNull("appInfo")) {
                val appInfoMap = config.getMap("appInfo")
                if (appInfoMap == null) {
                    null
                } else {
                    val appID =
                        if (appInfoMap.hasKey("appID") && !appInfoMap.isNull("appID")) {
                            appInfoMap.getString("appID") ?: ""
                        } else {
                            ""
                        }

                    val appIID =
                        if (appInfoMap.hasKey("appIID") && !appInfoMap.isNull("appIID")) {
                            appInfoMap.getString("appIID") ?: ""
                        } else {
                            ""
                        }

                    val appVer =
                        if (appInfoMap.hasKey("appVer") && !appInfoMap.isNull("appVer")) {
                            appInfoMap.getString("appVer") ?: ""
                        } else {
                            ""
                        }

                    DataClasses.AppInfo(
                        appID = appID,
                        appIID = appIID,
                        appVer = appVer
                    )
                }
            } else {
                null
            }

        val providerPriorityList: List<String>? =
            if (config.hasKey("providerPriorityList") && !config.isNull("providerPriorityList")) {
                val array = config.getArray("providerPriorityList")
                if (array == null) null else readableStringArrayToList(array)
            } else {
                null
            }

        val enableLogging: Boolean? =
            if (config.hasKey("enableLogging") && !config.isNull("enableLogging")) {
                config.getBoolean("enableLogging")
            } else {
                null
            }

        // ---------------- ANDROID-ONLY ----------------

        val icon: Int? =
            if (config.hasKey("android_icon") && !config.isNull("android_icon")) {
                config.getInt("android_icon")
            } else {
                null
            }

        val usingService: Boolean =
            if (config.hasKey("android_usingService") && !config.isNull("android_usingService")) {
                config.getBoolean("android_usingService")
            } else {
                false
            }

        val serviceMessage: String? =
            if (config.hasKey("android_serviceMessage") && !config.isNull("android_serviceMessage")) {
                config.getString("android_serviceMessage")
            } else {
                null
            }

        val pushReceiverModules: List<String>? =
            if (config.hasKey("android_pushReceiverModules") && !config.isNull("android_pushReceiverModules")) {
                val array = config.getArray("android_pushReceiverModules")
                if (array == null) null else readableStringArrayToList(array)
            } else {
                null
            }

        val pushChannelName: String? =
            if (config.hasKey("android_pushChannelName") && !config.isNull("android_pushChannelName")) {
                config.getString("android_pushChannelName")
            } else {
                null
            }

        val pushChannelDescription: String? =
            if (config.hasKey("android_pushChannelDescription") && !config.isNull("android_pushChannelDescription")) {
                config.getString("android_pushChannelDescription")
            } else {
                null
            }

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
        ).build()
    }

    /**
     * Converts RN string array into Kotlin list of strings.
     *
     * Skips null elements.
     */
    private fun readableStringArrayToList(array: ReadableArray): List<String> {
        val result = ArrayList<String>()
        for (i in 0 until array.size()) {
            if (!array.isNull(i)) {
                val value = array.getString(i)
                if (value != null) {
                    result.add(value)
                }
            }
        }
        return result
    }
}