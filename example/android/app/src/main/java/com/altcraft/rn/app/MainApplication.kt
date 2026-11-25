package com.altcraft.rn.app

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.altcraft.sdk.AltcraftSDK
import com.altcraft.sdk.platform.authenticate.external.jwt.JWTInterface
import com.altcraft.sdk.push.push

@Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
        AltcraftSDK.auth.setJWTProvider(JWTProvider(this))
        AltcraftSDK.push.token.setFCMTokenProvider(FCMProvider())
    }
}

class JWTProvider(private val context: Application) : JWTInterface {
    private val prefs by lazy {
        context.getSharedPreferences("altcraft_sdk", Application.MODE_PRIVATE)
    }

    private val defaultJWT = ""

    override fun getJWT(): String? {
        return prefs.getString("JWT_KEY", null) ?: defaultJWT
    }
}
