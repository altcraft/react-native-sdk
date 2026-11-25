package com.altcraft.sdk.core

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

/** Registers the altcraft-core native module(s) with React Native. */
class AltcraftCorePackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return when (name) {
      CoreModule.NAME -> CoreModule(reactContext)
      SdkEventEmitter.NAME -> SdkEventEmitter(reactContext)
      else -> null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfos[CoreModule.NAME] = ReactModuleInfo(
        CoreModule.NAME,
        CoreModule.NAME,
        false,
        false,
        false,
        true
      )
      moduleInfos[SdkEventEmitter.NAME] = ReactModuleInfo(
        SdkEventEmitter.NAME,
        SdkEventEmitter.NAME,
        false,
        false,
        false,
        true
      )
      moduleInfos
    }
  }
}
