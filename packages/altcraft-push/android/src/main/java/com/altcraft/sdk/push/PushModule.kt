package com.altcraft.sdk.push

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.core.AltcraftInitRegistry
import com.altcraft.sdk.core.rn.getBooleanOrNull
import com.altcraft.sdk.core.rn.getArrayOrNull
import com.altcraft.sdk.core.rn.getMapOrNull
import com.altcraft.sdk.core.rn.getStringOrNull
import com.altcraft.sdk.core.rn.toStringList
import com.altcraft.sdk.core.utilities.Converter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.PermissionAwareActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// ---------------------- Constants ----------------------

internal object PushConstants {
    // Module
    const val MODULE_NAME: String = "Push"

    // Promise reject codes
    const val ERR_UNSUSPEND: String = "unSuspendPushSubscription"
    const val ERR_GET_LATEST_STATUS: String = "getStatusOfLatestSubscription"
    const val ERR_GET_CURRENT_STATUS: String = "getStatusForCurrentSubscription"
    const val ERR_GET_LATEST_STATUS_PROVIDER: String = "getStatusOfLatestSubscriptionForProvider"
    const val ERR_GET_PUSH_TOKEN: String = "getPushToken"
    const val ERR_SET_PUSH_TOKEN: String = "setPushToken"
    const val ERR_FORCED_TOKEN_UPDATE: String = "forcedTokenUpdate"
    const val ERR_DELETE_DEVICE_TOKEN: String = "deleteDeviceToken"
    const val ERR_CHANGE_PROVIDER_PRIORITY: String = "changePushProviderPriorityList"
    const val ERR_SDK: String = "SDK_ERROR"

    // Promise reject messages
    const val MSG_PROVIDER_IS_BLANK: String = "provider is blank"

    // Notification permission request code
    const val PERMISSION_REQUEST_CODE: Int = 54321

    // Keys: TokenData map
    const val KEY_PROVIDER: String = "provider"
    const val KEY_TOKEN: String = "token"

    // Keys: ResponseWithHttpCode -> JS map
    const val KEY_HTTP_CODE: String = "httpCode"
    const val KEY_RESPONSE: String = "response"

    // Keys: subscribe options
    const val KEY_SYNC: String = "sync"
    const val KEY_PROFILE_FIELDS: String = "profileFields"
    const val KEY_CUSTOM_FIELDS: String = "customFields"
    const val KEY_CATS: String = "cats"
    const val KEY_REPLACE: String = "replace"
    const val KEY_SKIP_TRIGGERS: String = "skipTriggers"

    // Keys: push event options
    const val KEY_MESSAGE: String = "message"
    const val KEY_MESSAGE_UID: String = "messageUID"

    // Keys: status provider options
    const val KEY_PROVIDER_OPTION: String = "provider"
}

@ReactModule(name = PushConstants.MODULE_NAME)
class PushModule(reactContext: ReactApplicationContext) : NativePushSpec(reactContext) {

    init {
        // Contribute the push configuration to the shared SDK builder used by
        // the core module during initialization.
        AltcraftInitRegistry.register(
            PushInitContributor(reactContext.applicationContext)
        )
    }

    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun getName(): String = PushConstants.MODULE_NAME

    // ---------------------- Subscription ----------------------

    /**
     * Creates or updates push subscription.
     *
     * @param options Subscription operation options.
     */
    override fun pushSubscribe(options: ReadableMap?) {
        try {
            AltcraftSDK.push.subscription.subscribe(
                context = reactApplicationContext,
                sync = options?.getBooleanOrNull(PushConstants.KEY_SYNC) ?: true,
                profileFields = Converter.toKotlinMap(
                    options?.getMapOrNull(PushConstants.KEY_PROFILE_FIELDS)
                ),
                customFields = Converter.toKotlinMap(
                    options?.getMapOrNull(PushConstants.KEY_CUSTOM_FIELDS)
                ),
                cats = Converter.toCategoryListOrNull(
                    options?.getArrayOrNull(PushConstants.KEY_CATS)
                ),
                replace = options?.getBooleanOrNull(PushConstants.KEY_REPLACE),
                skipTriggers = options?.getBooleanOrNull(PushConstants.KEY_SKIP_TRIGGERS)
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Suspends active push subscription.
     *
     * @param options Subscription operation options.
     */
    override fun pushSuspend(options: ReadableMap?) {
        try {
            AltcraftSDK.push.subscription.suspend(
                context = reactApplicationContext,
                sync = options?.getBooleanOrNull(PushConstants.KEY_SYNC) ?: true,
                profileFields = Converter.toKotlinMap(
                    options?.getMapOrNull(PushConstants.KEY_PROFILE_FIELDS)
                ),
                customFields = Converter.toKotlinMap(
                    options?.getMapOrNull(PushConstants.KEY_CUSTOM_FIELDS)
                ),
                cats = Converter.toCategoryListOrNull(
                    options?.getArrayOrNull(PushConstants.KEY_CATS)
                ),
                replace = options?.getBooleanOrNull(PushConstants.KEY_REPLACE),
                skipTriggers = options?.getBooleanOrNull(PushConstants.KEY_SKIP_TRIGGERS)
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Unsubscribes from push notifications.
     *
     * @param options Subscription operation options.
     */
    override fun pushUnSubscribe(options: ReadableMap?) {
        try {
            AltcraftSDK.push.subscription.unsubscribe(
                context = reactApplicationContext,
                sync = options?.getBooleanOrNull(PushConstants.KEY_SYNC) ?: true,
                profileFields = Converter.toKotlinMap(
                    options?.getMapOrNull(PushConstants.KEY_PROFILE_FIELDS)
                ),
                customFields = Converter.toKotlinMap(
                    options?.getMapOrNull(PushConstants.KEY_CUSTOM_FIELDS)
                ),
                cats = Converter.toCategoryListOrNull(
                    options?.getArrayOrNull(PushConstants.KEY_CATS)
                ),
                replace = options?.getBooleanOrNull(PushConstants.KEY_REPLACE),
                skipTriggers = options?.getBooleanOrNull(PushConstants.KEY_SKIP_TRIGGERS)
            )
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Unsuspends current push subscription.
     *
     * @param promise Resolves to response with HTTP code or `null` if
     * the request fails.
     */
    override fun unSuspendPushSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val response = AltcraftSDK.push.subscription.unSuspend(reactApplicationContext)
                withContext(Dispatchers.Main) {
                    promise.resolve(Converter.responseWithHttpCodeToWritableMap(response))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_UNSUSPEND, e)
                }
            }
        }
    }

    /**
     * Returns status of the latest subscription.
     *
     * @param promise Resolves to response with HTTP code or `null` if
     * the request fails.
     */
    override fun getStatusOfLatestSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val response = AltcraftSDK.push.subscription.status.latest(reactApplicationContext)
                withContext(Dispatchers.Main) {
                    promise.resolve(Converter.responseWithHttpCodeToWritableMap(response))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_GET_LATEST_STATUS, e)
                }
            }
        }
    }

    /**
     * Returns status of current subscription.
     *
     * @param promise Resolves to response with HTTP code or `null` if
     * the request fails.
     */
    override fun getStatusForCurrentSubscription(promise: Promise) {
        coroutineScope.launch {
            try {
                val response = AltcraftSDK.push.subscription.status.current(reactApplicationContext)
                withContext(Dispatchers.Main) {
                    promise.resolve(Converter.responseWithHttpCodeToWritableMap(response))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_GET_CURRENT_STATUS, e)
                }
            }
        }
    }

    /**
     * Returns subscription status for specific provider.
     *
     * @param options Options with the provider identifier.
     * @param promise Resolves to response with HTTP code or `null` if
     * the request fails.
     */
    override fun getStatusOfLatestSubscriptionForProvider(
        options: ReadableMap?,
        promise: Promise
    ) {
        coroutineScope.launch {
            try {
                val provider = options?.getStringOrNull(PushConstants.KEY_PROVIDER_OPTION)
                val response = AltcraftSDK.push.subscription.status.latestForProvider(
                    reactApplicationContext,
                    provider
                )
                withContext(Dispatchers.Main) {
                    promise.resolve(Converter.responseWithHttpCodeToWritableMap(response))
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_GET_LATEST_STATUS_PROVIDER, e)
                }
            }
        }
    }

    // ---------------------- Push payload (string-only) ----------------------

    /**
     * Handles incoming push payload (string-only).
     *
     * @param message Push payload map (string-only).
     */
    override fun takePush(message: ReadableMap?) {
        if (message == null) return
        val map = Converter.toStringMapOrNull(message) ?: return
        if (map.isNotEmpty()) {
            AltcraftSDK.push.receiver.takePush(reactApplicationContext, map)
        }
    }

    // ---------------------- Token API ----------------------

    /**
     * Returns current push token.
     *
     * @param promise Resolves to `{ provider, token }` or `null` if
     * token is not available.
     */
    override fun getPushToken(promise: Promise) {
        coroutineScope.launch {
            try {
                val tokenData = AltcraftSDK.push.token.getToken(reactApplicationContext)
                withContext(Dispatchers.Main) {
                    if (tokenData == null) {
                        promise.resolve(null)
                    } else {
                        val map = Arguments.createMap()
                        map.putString(PushConstants.KEY_PROVIDER, tokenData.provider)
                        map.putString(PushConstants.KEY_TOKEN, tokenData.token)
                        promise.resolve(map)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_GET_PUSH_TOKEN, e)
                }
            }
        }
    }

    /**
     * Sets push token for provider.
     *
     * @param options Options with provider identifier and token value
     * (`null` clears the token, native expects String; `null` is converted
     * to empty string).
     */
    override fun setPushToken(options: ReadableMap?) {
        coroutineScope.launch {
            try {
                val provider = options?.getStringOrNull(PushConstants.KEY_PROVIDER) ?: ""
                if (provider.isBlank()) return@launch

                val token = options?.getStringOrNull(PushConstants.KEY_TOKEN) ?: ""
                AltcraftSDK.push.token.setToken(reactApplicationContext, provider, token)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // ---------------------- Token management ----------------------

    /**
     * Forces a push token refresh (delete + re-register).
     *
     * @param promise Resolves when the token update flow completes.
     */
    override fun forcedTokenUpdate(promise: Promise) {
        coroutineScope.launch {
            try {
                AltcraftSDK.push.token.forcedTokenUpdate(reactApplicationContext)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_FORCED_TOKEN_UPDATE, e)
                }
            }
        }
    }

    /**
     * Deletes the device token for a given provider.
     *
     * @param provider Provider identifier (e.g. `android-firebase`).
     * @param promise Resolves when the delete call is dispatched.
     */
    override fun deleteDeviceToken(provider: String, promise: Promise) {
        coroutineScope.launch {
            try {
                AltcraftSDK.push.token.deleteToken(reactApplicationContext, provider)
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_DELETE_DEVICE_TOKEN, e)
                }
            }
        }
    }

    /**
     * Changes the push provider priority list at runtime.
     *
     * @param priorityList Ordered list of provider identifiers.
     * @param promise Resolves when the priority list is updated and token
     * update is triggered.
     */
    override fun changePushProviderPriorityList(priorityList: ReadableArray, promise: Promise) {
        coroutineScope.launch {
            try {
                AltcraftSDK.push.token.changeProviderPriority(
                    reactApplicationContext,
                    priorityList.toStringList()
                )
                withContext(Dispatchers.Main) { promise.resolve(null) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(PushConstants.ERR_CHANGE_PROVIDER_PRIORITY, e)
                }
            }
        }
    }

    // ---------------------- Push receiver helpers ----------------------

    /**
     * Checks whether a push payload belongs to Altcraft.
     *
     * @param message Push payload map (string-only).
     * @return `true` if the message contains the Altcraft marker key.
     */
    override fun isAltcraftPush(message: ReadableMap?): Boolean {
        if (message == null) return false
        val map = Converter.toStringMapOrNull(message) ?: return false
        return AltcraftSDK.push.receiver.isAltcraftPush(map)
    }

    // ---------------------- Permissions ----------------------

    /**
     * Requests notification permission; resolves to granted flag.
     *
     * @param promise Resolves to `true` when the permission is granted,
     * `false` otherwise.
     */
    override fun requestNotificationPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                promise.resolve(true)
                return
            }

            val activity = currentActivity
            if (activity == null) {
                promise.resolve(false)
                return
            }

            if (ContextCompat.checkSelfPermission(
                    activity,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                promise.resolve(true)
                return
            }

            val awareActivity = activity as? PermissionAwareActivity
            if (awareActivity == null) {
                promise.resolve(false)
                return
            }

            awareActivity.requestPermissions(
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                PushConstants.PERMISSION_REQUEST_CODE
            ) { _, _, grantResults ->
                val granted = grantResults.isNotEmpty() &&
                        grantResults[0] == PackageManager.PERMISSION_GRANTED
                promise.resolve(granted)
                true
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    // ---------------------- Push events ----------------------

    /**
     * Sends push delivery event.
     *
     * @param options Push event report options.
     */
    override fun deliveryEvent(options: ReadableMap?) {
        coroutineScope.launch {
            try {
                AltcraftSDK.push.pushEvents.deliveryEvent(
                    context = reactApplicationContext,
                    message = Converter.toStringMapOrNull(
                        options?.getMapOrNull(PushConstants.KEY_MESSAGE)
                    ),
                    messageUID = options?.getStringOrNull(PushConstants.KEY_MESSAGE_UID)
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    /**
     * Sends push open event.
     *
     * @param options Push event report options.
     */
    override fun openEvent(options: ReadableMap?) {
        coroutineScope.launch {
            try {
                AltcraftSDK.push.pushEvents.openEvent(
                    context = reactApplicationContext,
                    message = Converter.toStringMapOrNull(
                        options?.getMapOrNull(PushConstants.KEY_MESSAGE)
                    ),
                    messageUID = options?.getStringOrNull(PushConstants.KEY_MESSAGE_UID)
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    companion object {
        const val NAME: String = PushConstants.MODULE_NAME
    }
}
