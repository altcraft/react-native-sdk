import Foundation
import AltcraftRNCore
import AltcraftCore
import AltcraftInApp

/// Applies the In-App module configuration to the shared SDK builder.
///
/// Registered by the core module's initialization registry when the React
/// Native In-App module is created. The core package remains independent of
/// the In-App module.
final class InAppInitContributor: AltcraftInitContributor {
  /// Applies the In-App configuration through the native In-App module
  /// extension. When no options were provided, native defaults are applied
  /// explicitly.
  func contribute(
    builder: AltcraftConfiguration.Builder,
    moduleConfigs: [String: [String: Any]]
  ) {
    let config = moduleConfigs["inapp"] ?? [:]
    let autoRequest = config["inAppAutoRequest"] as? Bool ?? true
    let intervalMs =
      (config["placementsRequestIntervalMs"] as? NSNumber)?.doubleValue
      ?? 1_800_000
    let maxPlacements =
      (config["maxPlacements"] as? NSNumber)?.intValue ?? 500
    builder.inAppConfig(
      inAppAutoRequest: autoRequest,
      placementsRequestInterval: Measurement(
        value: intervalMs,
        unit: UnitDuration.milliseconds
      ),
      maxPlacements: maxPlacements
    )
  }
}
