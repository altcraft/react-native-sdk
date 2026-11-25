package com.altcraft.sdk.core

//  Created by Andrey Pogodin.
//
//  Copyright © 2025 Altcraft. All rights reserved.

import android.content.Context
import android.os.Looper
import com.altcraft.sdk.data.models.CoreModels.SDKEventModel
import com.altcraft.sdk.events.Events
import com.altcraft.sdk.platform.authenticate.external.jwt.JWTInterface
import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.core.utilities.Converter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.core.content.edit

// ---------------------- Constants ----------------------

internal object CoreConstants {
    // Module
    const val MODULE_NAME: String = "Core"

    // Promise reject codes
    const val ERR_INIT_INVALID_CONFIG: String = "ALTCRAFT_INIT_INVALID_CONFIG"
    const val ERR_INIT_ERROR: String = "ALTCRAFT_INIT_ERROR"
    const val ERR_CLEAR: String = "clear"
    const val ERR_IS_AUTHENTICATED: String = "isAuthenticated"
    const val ERR_SDK: String = "SDK_ERROR"

    // Promise reject messages
    const val MSG_INIT_UNKNOWN: String = "Altcraft initialization failed with unknown error"
    const val MSG_INIT_ERROR: String = "Altcraft initialization error"

    // Keys: SDK event map
    const val KEY_FUNCTION: String = "function"
    const val KEY_CODE: String = "code"
    const val KEY_MESSAGE: String = "message"
    const val KEY_TYPE: String = "type"
    const val KEY_VALUE: String = "value"
    const val KEY_TIMESTAMP: String = "timestamp"

    // Event types for JS
    const val TYPE_EVENT: String = "event"
    const val TYPE_ERROR: String = "error"
    const val TYPE_RETRY_ERROR: String = "retryError"
}

@ReactModule(name = CoreConstants.MODULE_NAME)
class CoreModule(reactContext: ReactApplicationContext) : NativeCoreSpec(reactContext) {

    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** Bridges the native JWT provider to JS: the SDK requests a token
     * synchronously, the bridge emits an "altcraftJwtRequest" event and
     * blocks until JS replies via resolveJwt (bounded by a timeout). */
    private val jwtProvider = object : JWTInterface {
        override fun getJWT(): String? {
            if (Looper.myLooper() == Looper.getMainLooper()) return null

            val requestId = JwtBridge.nextRequestId()
            val latch = CountDownLatch(1)
            JwtBridge.register(requestId, latch)

            SdkEventEmitter.emit(
                    SdkConstants.JWT_REQUEST_EVENT_NAME,
                    JwtBridge.requestMap(requestId)
            )

            JwtBridge.await(latch)
            return JwtBridge.complete(requestId)
        }
    }

    override fun getName(): String = CoreConstants.MODULE_NAME

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
     * Initializes the Altcraft SDK core with the given configuration.
     *
     * Module packages contribute their configuration through
     * [AltcraftInitRegistry]; the core module forwards the generic module map
     * without depending on concrete modules.
     *
     * @param config React Native configuration object.
     * @param promise Resolved on success; rejected on invalid config
     * or initialization failure.
     */
    override fun initialize(config: ReadableMap, promise: Promise) {
        try {
            val builder = AltRnConfigMapper.coreConfigurationBuilder(config)
            AltcraftInitRegistry.applyAll(
                builder,
                AltRnConfigMapper.moduleConfigs(config)
            )
            val configuration = builder.build()

            AltcraftSDK.initialization(reactApplicationContext, configuration) { result ->
                reactApplicationContext.runOnUiQueueThread {
                    if (result.isSuccess) {
                        promise.resolve(null)
                    } else {
                        val throwable = result.exceptionOrNull()
                        if (throwable != null) {
                            promise.reject(
                                    CoreConstants.ERR_INIT_ERROR,
                                    throwable.message ?: CoreConstants.MSG_INIT_ERROR,
                                    throwable
                            )
                        } else {
                            promise.reject(
                                    CoreConstants.ERR_INIT_ERROR,
                                    CoreConstants.MSG_INIT_UNKNOWN
                            )
                        }
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject(
                    CoreConstants.ERR_INIT_INVALID_CONFIG,
                    e.message ?: "Invalid Altcraft configuration",
                    e
            )
        }
    }

    // ---------------------- SDK events ----------------------

    /**
     * Subscribes native SDK events stream and forwards events to JS via
     * DeviceEventEmitter. Calling from JS multiple times replaces handler
     * on JS side (native always emits to the same event name).
     */
    override fun subscribeToEvents() {
        AltcraftSDK.sdkEvents.subscription.subscribe { event ->
            SdkEventEmitter.emit(
                    SdkConstants.JS_EVENT_NAME,
                    eventToWritableMap(event)
            )
        }
    }

    /** Unsubscribes native SDK events stream. */
    override fun unsubscribeFromEvents() {
        Events.Subscription.unsubscribe()
    }

    // ---------------------- State ----------------------

    /**
     * Clears SDK local state and stored data (native).
     *
     * @param promise Resolves after cleanup is finished.
     */
    override fun clear(promise: Promise) {
        try {
            AltcraftSDK.clear(reactApplicationContext) { promise.resolve(null) }
        } catch (e: Exception) {
            promise.reject(CoreConstants.ERR_CLEAR, e)
        }
    }

    // ---------------------- Session (Android) ----------------------

    /**
     * Allows re-running initial retry/scheduling/token-check logic
     * in this process on the next [initialize].
     */
    override fun unlockInitialOperationsInThisSession() {
        AltcraftSDK.unlockInitialOperationsInThisSession()
    }

    // ---------------------- UserDefaults ----------------------

    /**
     * Stores a string value in native storage.
     *
     * Note: suiteName is iOS-only (App Group). On Android, values are always
     * stored in the library's private SharedPreferences ("altcraft_sdk").
     *
     * @param suiteName Storage namespace / suite name (platform-dependent).
     * @param key Storage key.
     * @param value Value to store or `null` to remove.
     */
    override fun setUserDefaultsValue(suiteName: String?, key: String, value: String?) {
        try {
            val prefs = reactApplicationContext.getSharedPreferences(
                    "altcraft_sdk",
                    Context.MODE_PRIVATE
            )
            prefs.edit {
                if (value == null) {
                    remove(key)
                } else {
                    putString(key, value)
                }
            }
        } catch (_: Exception) {
            // ignore
        }
    }

    /**
     * Sets the App Group for UserDefaults (iOS-only, no-op on Android).
     *
     * @param groupName App Group name.
     */
    override fun setAppGroup(groupName: String?) {
        // no-op on Android
    }

    // ---------------------- Authentication ----------------------

    /**
     * Registers a JWT provider: native requests tokens via
     * "altcraftJwtRequest" events.
     */
    override fun setJwtProvider() {
        AltcraftSDK.auth.setJWTProvider(jwtProvider)
    }

    /**
     * Resolves a pending JWT request issued by the native provider.
     *
     * @param requestId Identifier of the pending request.
     * @param token JWT token or `null` if unavailable.
     */
    override fun resolveJwt(requestId: Double, token: String?) {
        JwtBridge.resolve(requestId.toInt(), token)
    }

    /** Starts SDK authentication. */
    override fun authenticate() {
        AltcraftSDK.auth.authenticate(reactApplicationContext)
    }

    /** Logs the user out. */
    override fun logOut() {
        AltcraftSDK.auth.logOut(reactApplicationContext)
    }

    /**
     * Returns whether the user is authenticated.
     *
     * @param promise Resolves to `true` if the current SDK user is
     * authenticated, otherwise `false`.
     */
    override fun isAuthenticated(promise: Promise) {
        coroutineScope.launch {
            try {
                val authenticated = AltcraftSDK.auth.isAuthenticated(reactApplicationContext)
                withContext(Dispatchers.Main) { promise.resolve(authenticated) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    promise.reject(CoreConstants.ERR_IS_AUTHENTICATED, e)
                }
            }
        }
    }

    // ---------------------- Helpers ----------------------

    /**
     * Converts an SDK event into a RN-safe [WritableMap].
     */
    private fun eventToWritableMap(event: SDKEventModel.Event): WritableMap {
        val type = when (event) {
            is SDKEventModel.RetryError -> CoreConstants.TYPE_RETRY_ERROR
            is SDKEventModel.Error -> CoreConstants.TYPE_ERROR
            else -> CoreConstants.TYPE_EVENT
        }

        val map = Arguments.createMap()
        map.putString(CoreConstants.KEY_FUNCTION, event.function)
        val code = event.eventValue?.get("http_code") as? Int
        if (code != null) map.putInt(CoreConstants.KEY_CODE, code)
        else map.putNull(CoreConstants.KEY_CODE)
        map.putString(CoreConstants.KEY_MESSAGE, event.eventMessage ?: "")
        map.putString(CoreConstants.KEY_TYPE, type)
        map.putMap(
                CoreConstants.KEY_VALUE,
                Converter.writableFromAny(event.eventValue) as? WritableMap
        )
        map.putString(
                CoreConstants.KEY_TIMESTAMP,
                Converter.formatDateToTimestampString(event.date)
        )
        return map
    }

    companion object {
        const val NAME: String = CoreConstants.MODULE_NAME
    }
}

/** Pending JWT request bridge between the native SDK and JS. */
internal object JwtBridge {

    /** Timeout for a JWT token request forwarded to JS. */
    private const val JWT_REQUEST_TIMEOUT_SECONDS = 10L

    private val requestSequence = AtomicInteger(0)

    private val pendingRequests = java.util.concurrent.ConcurrentHashMap<Int, CountDownLatch>()

    private val resolvedTokens = java.util.concurrent.ConcurrentHashMap<Int, String?>()

    /** Generates the next request identifier. */
    fun nextRequestId(): Int = requestSequence.incrementAndGet()

    /** Registers a pending request latch. */
    fun register(requestId: Int, latch: CountDownLatch) {
        pendingRequests[requestId] = latch
    }

    /** Blocks the calling thread until JS resolves the request or timeout. */
    fun await(latch: CountDownLatch) {
        latch.await(JWT_REQUEST_TIMEOUT_SECONDS, TimeUnit.SECONDS)
    }

    /** Completes the request and returns the resolved token (or `null`). */
    fun complete(requestId: Int): String? {
        pendingRequests.remove(requestId)
        return resolvedTokens.remove(requestId)
    }

    /** Resolves the pending request with the token from JS. */
    fun resolve(requestId: Int, token: String?) {
        resolvedTokens[requestId] = token
        pendingRequests.remove(requestId)?.countDown()
    }

    /** Builds the "altcraftJwtRequest" event payload. */
    fun requestMap(requestId: Int): WritableMap = Arguments.createMap().apply {
        putInt("requestId", requestId)
    }
}
