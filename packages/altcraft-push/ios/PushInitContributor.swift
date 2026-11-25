import Foundation
import AltcraftRNCore
import AltcraftCore
import AltcraftPush

/// Applies the push module configuration to the shared SDK builder.
///
/// Registered by the core module's initialization registry when the React
/// Native push module is created. The core package remains independent of the
/// push module.
final class PushInitContributor: AltcraftInitContributor {
  /// Applies the push configuration through the native push module extension.
  ///
  /// The contributor always adds a push configuration (with native defaults
  /// when no options were provided) so the native push module is registered.
  func contribute(
    builder: AltcraftConfiguration.Builder,
    moduleConfigs: [String: [String: Any]]
  ) {
    let config = moduleConfigs["push"] ?? [:]
    let providers = (config["providerPriority"] as? [Any])?
      .compactMap { $0 as? String } ?? []
    builder.pushConfig(providerPriority: providers)
  }
}
