package com.altcraft.sdk

import androidx.activity.ComponentActivity
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

@ReactModule(name = SdkModule.NAME)
class SdkModule(
    reactContext: ReactApplicationContext
) : NativeSdkSpec(reactContext) {

    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = NAME

    // ---------------------- init / auth / providers ----------------------

    override fun initialize(config: ReadableMap, promise: Promise) {
        AltcraftRnInitializer.initialize(
            reactApplicationContext,
            config,
            promise
        )
    }

    override fun setJwt(token: String?) {
        if (token.isNullOrBlank()) {
            RnJWTProvider.clear()
            AltcraftSDK.setJWTProvider(null)
        } else {
            RnJWTProvider.setToken(token)
            AltcraftSDK.setJWTProvider(RnJWTProvider)
        }
    }

    override fun setAndroidFcmToken(token: String?) {
        if (token.isNullOrBlank()) {
            RnFCMProvider.clear()
            PublicPushTokenFunctions.setFCMTokenProvider(null)
        } else {
            RnFCMProvider.setToken(token)
            PublicPushTokenFunctions.setFCMTokenProvider(RnFCMProvider)
        }
    }

    override fun setIosFcmToken(token: String?) {
        // no-op on Android
    }

    override fun setAndroidHmsToken(token: String?) {
        if (token.isNullOrBlank()) {
            RnHMSProvider.clear()
            PublicPushTokenFunctions.setHMSTokenProvider(null)
        } else {
            RnHMSProvider.setToken(token)
            PublicPushTokenFunctions.setHMSTokenProvider(RnHMSProvider)
        }
    }

    override fun setIosHmsToken(token: String?) {
        // no-op on Android
    }

    override fun setApnsToken(token: String?) {
        // no-op on Android
    }

    override fun setUserDefaultsValue(suiteName: String?, key: String, value: String?) {
        // no-op on Android
    }

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

    override fun addListener(eventName: String) {
        // no-op
    }

    override fun removeListeners(count: Double) {
        // no-op
    }

    // ---------------------- token-API for RN ----------------------

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

    override fun changePushProviderPriorityList(priorityList: ReadableArray?, promise: Promise) {
        val list = Converter.toStringList(priorityList)
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

    // ---------------------- AltcraftSDK: clear / initial ops / permission ----------------------

    override fun clear(promise: Promise) {
        try {
            AltcraftSDK.clear(reactApplicationContext) {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("clear", e)
        }
    }

    override fun unlockInitOperationsInThisSession() {
        try {
            AltcraftSDK.unlockInitOperationsInThisSession()
        } catch (_: Exception) {
        }
    }

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

    override fun mobileEvent(
        sid: String,
        eventName: String,
        sendMessageId: String?,
        payload: ReadableMap?,
        matching: ReadableMap?,
        matchingType: String?,
        profileFields: ReadableMap?,
        utm: ReadableMap?
    ) {
        try {
            val utmData = utm?.let {
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
                subscription = null,
                utm = utmData
            )
        } catch (_: Exception) {
        }
    }

    // ---------------------- push payload bridge ----------------------

    override fun takePush(message: ReadableMap?) {
        if (message == null) return
        val map = Converter.toStringMapOrNull(message) ?: return
        if (map.isNotEmpty()) {
            AltcraftSDK.PushReceiver.takePush(reactApplicationContext, map)
        }
    }

    override fun deliveryEvent(message: ReadableMap?, messageUID: String?) {
        try {
            val map = Converter.toStringMapOrNull(message)
            PublicPushEventFunctions.deliveryEvent(
                context = reactApplicationContext,
                message = map,
                messageUID = messageUID
            )
        } catch (_: Exception) {
        }
    }

    override fun openEvent(message: ReadableMap?, messageUID: String?) {
        try {
            val map = Converter.toStringMapOrNull(message)
            PublicPushEventFunctions.openEvent(
                context = reactApplicationContext,
                message = map,
                messageUID = messageUID
            )
        } catch (_: Exception) {
        }
    }

    // --------------------- Events bridge for RN ---------------------

    override fun subscribeToEvents() {
        Events.subscribe { event -> sendEventToJs(event) }
    }

    override fun unsubscribeFromEvent() {
        Events.unsubscribe()
    }

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

    // --------------------- subscription bridge ---------------------

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
 */
internal object AltcraftRnInitializer {

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
 */
internal object AltcraftRnConfigMapper {

    fun buildConfiguration(config: ReadableMap): AltcraftConfiguration {
        if (!config.hasKey("apiUrl") || config.isNull("apiUrl")) {
            throw IllegalArgumentException("apiUrl is required for AltcraftConfiguration")
        }

        val apiUrl = config.getString("apiUrl")
            ?: throw IllegalArgumentException("apiUrl must be a non-null string")

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
                        } else ""
                    val appIID =
                        if (appInfoMap.hasKey("appIID") && !appInfoMap.isNull("appIID")) {
                            appInfoMap.getString("appIID") ?: ""
                        } else ""
                    val appVer =
                        if (appInfoMap.hasKey("appVer") && !appInfoMap.isNull("appVer")) {
                            appInfoMap.getString("appVer") ?: ""
                        } else ""

                    DataClasses.AppInfo(appID = appID, appIID = appIID, appVer = appVer)
                }
            } else {
                null
            }

        val providerPriorityList: List<String>? =
            if (config.hasKey("providerPriorityList") && !config.isNull("providerPriorityList")) {
                val array = config.getArray("providerPriorityList")
                if (array == null) null else readableStringArrayToList(array)
            } else null

        val enableLogging: Boolean? =
            if (config.hasKey("enableLogging") && !config.isNull("enableLogging")) {
                config.getBoolean("enableLogging")
            } else null

        val icon: Int? =
            if (config.hasKey("android_icon") && !config.isNull("android_icon")) {
                config.getInt("android_icon")
            } else null

        val usingService: Boolean =
            if (config.hasKey("android_usingService") && !config.isNull("android_usingService")) {
                config.getBoolean("android_usingService")
            } else false

        val serviceMessage: String? =
            if (config.hasKey("android_serviceMessage") && !config.isNull("android_serviceMessage")) {
                config.getString("android_serviceMessage")
            } else null

        val pushReceiverModules: List<String>? =
            if (config.hasKey("android_pushReceiverModules") && !config.isNull("android_pushReceiverModules")) {
                val array = config.getArray("android_pushReceiverModules")
                if (array == null) null else readableStringArrayToList(array)
            } else null

        val pushChannelName: String? =
            if (config.hasKey("android_pushChannelName") && !config.isNull("android_pushChannelName")) {
                config.getString("android_pushChannelName")
            } else null

        val pushChannelDescription: String? =
            if (config.hasKey("android_pushChannelDescription") && !config.isNull("android_pushChannelDescription")) {
                config.getString("android_pushChannelDescription")
            } else null

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

    private fun readableStringArrayToList(array: ReadableArray): List<String> {
        val result = ArrayList<String>()
        for (i in 0 until array.size()) {
            if (!array.isNull(i)) {
                val value = array.getString(i)
                if (value != null) result.add(value)
            }
        }
        return result
    }
}
