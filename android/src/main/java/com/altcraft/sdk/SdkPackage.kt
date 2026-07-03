package com.altcraft.sdk

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

class SdkPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return when (name) {
      SdkModule.NAME -> SdkModule(reactContext)
      SdkEventEmitter.NAME -> SdkEventEmitter(reactContext)
      else -> null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfos[SdkModule.NAME] = ReactModuleInfo(
        SdkModule.NAME,
        SdkModule.NAME,
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
        false
      )
      moduleInfos
    }
  }
}
