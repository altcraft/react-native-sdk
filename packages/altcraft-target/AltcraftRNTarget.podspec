require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "AltcraftRNTarget"
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
    "SWIFT_INSTALL_OBJC_HEADER" => "YES",
    # The native Altcraft SPM products are registered by the Core pod
    # (AltcraftRNCore); this pod only needs their Swift module search path.
    "SWIFT_INCLUDE_PATHS" => "$(inherited) $(SYMROOT)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)/"
  }

  # --- Shared native code lives in the core pod ---
  s.dependency "AltcraftRNCore"

  # --- Native SDK dependency (SPM) ---
  # `spm_dependency` keys registrations by `pod_spec.name`. Register this
  # module's product on the Core pod target so AltcraftCore is linked once.
  unless respond_to?(:spm_dependency, true)
    raise "Altcraft: spm_dependency is unavailable. React Native >= 0.75 is required."
  end

  altcraft_core_target = Struct.new(:name).new("AltcraftRNCore")
  spm_dependency(
    altcraft_core_target,
    url: "https://github.com/altcraft/ios-sdk.git",
    requirement: { kind: "exactVersion", version: "2.0.1" },
    products: ["AltcraftTarget"]
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
