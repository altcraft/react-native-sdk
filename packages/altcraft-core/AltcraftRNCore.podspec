require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "AltcraftRNCore"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = { :type => "Altcraft EULA", :file => "LICENSE" }
  s.authors      = package["author"]

  s.platform     = :ios, min_ios_version_supported

  s.source       = {
    :git => "https://github.com/altcraft/react-native-sdk.git",
    :tag => s.version.to_s
  }

  # --- Sources ---
  s.source_files = "ios/**/*.{h,m,mm,cpp,swift}"
  s.public_header_files = "ios/**/*.h"

  # --- Swift / Module settings ---
  s.swift_version = "6.0"
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
    "CLANG_ENABLE_MODULES" => "YES",
    "SWIFT_INSTALL_OBJC_HEADER" => "YES"
  }

  # --- Native SDK dependency (SPM) ---
  # React Native's `spm_dependency` helper registers the Swift package in the
  # generated Pods project during `pod install`, so the native iOS SDK is
  # fetched from GitHub automatically. Requires React Native >= 0.75.
  unless respond_to?(:spm_dependency, true)
    raise "Altcraft: spm_dependency is unavailable. React Native >= 0.75 is required."
  end

  # Core is the single owner of the SPM package. Module pods register their own
  # products on this pod target, so native code is linked exactly once and only
  # for the modules installed by the application.
  spm_dependency(
    s,
    url: "https://github.com/altcraft/ios-sdk.git",
    requirement: { kind: "exactVersion", version: "2.0.1" },
    products: ["AltcraftCore"]
  )

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
