require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "Sdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platform     = :ios, min_ios_version_supported

  s.source       = {
    :git => "https://github.com/altcraft/react-native-sdk.git",
    :tag => s.version.to_s
  }

  # --- Sources ---
  s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
  s.public_header_files = "ios/**/*.h"

  # --- Swift / Module settings (critical for <Sdk/Sdk-Swift.h>) ---
  s.swift_version = "5.0"
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "CLANG_ENABLE_MODULES" => "YES",
    "SWIFT_INSTALL_OBJC_HEADER" => "YES"
  }

  # --- Native dependency ---
  s.dependency "Altcraft", "0.1.2"

  # --- React Native module deps ---
  install_modules_dependencies(s)

  if ENV["RCT_NEW_ARCH_ENABLED"] == "1"
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
    s.dependency "RCTRequired"
    s.dependency "RCTTypeSafety"
    s.dependency "ReactCommon/turbomodule/core"
    s.dependency "React-RCTFabric"
    s.dependency "React-NativeModulesApple"
  end
end

