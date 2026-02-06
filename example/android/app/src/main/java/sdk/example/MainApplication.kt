package sdk.example

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
import com.altcraft.sdk.interfaces.JWTInterface
import com.altcraft.sdk.AltcraftSDK
import sdk.example.FCMProvider


class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
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
    AltcraftSDK.setJWTProvider(JWTProvider(this))
    AltcraftSDK.pushTokenFunctions.setFCMTokenProvider(FCMProvider())
  }
}

class JWTProvider(private val context: Application) : JWTInterface {
  companion object {
    private const val PREFS_NAME = "group.altcraft.react.native.example"
    private const val JWT_KEY = "JWT_KEY"
  }

  override fun getJWT(): String? {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val token = prefs.getString(JWT_KEY, null)
    return token?.takeIf { it.isNotBlank() }
  }
}