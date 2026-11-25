import Foundation
import AltcraftCore

/// Contributes a module configuration to the SDK builder during initialization.
///
/// Implemented by module RN packages (push, in-app) and registered in
/// ``AltcraftInitRegistry``. The core package never references concrete
/// modules.
public protocol AltcraftInitContributor: AnyObject {
  /// Applies this module's configuration to the shared builder.
  ///
  /// - Parameters:
  ///   - builder: SDK configuration builder shared by all contributors.
  ///   - moduleConfigs: Module configurations received from JS, keyed by
  ///     module identifier (for example `push` or `inapp`).
  func contribute(
    builder: AltcraftConfiguration.Builder,
    moduleConfigs: [String: [String: Any]]
  )
}

/// Process-wide registry of module initialization contributors.
///
/// Module RN packages register themselves when their native modules are
/// created; the core module applies all registered contributors right before
/// calling `AltcraftSDK.initialization`, keeping the core package unaware of
/// concrete modules.
public final class AltcraftInitRegistry: @unchecked Sendable {
  /// Shared registry instance.
  public static let shared = AltcraftInitRegistry()

  private let lock = NSLock()
  private var contributors: [AltcraftInitContributor] = []

  private init() {}

  /// Registers a module contributor.
  ///
  /// Registration is idempotent by contributor type.
  public func register(_ contributor: AltcraftInitContributor) {
    lock.lock()
    defer { lock.unlock() }
    let contributorType = type(of: contributor)
    guard !contributors.contains(where: { type(of: $0) == contributorType }) else {
      return
    }
    contributors.append(contributor)
  }

  /// Applies all registered contributors to the SDK configuration builder.
  public func applyAll(
    builder: AltcraftConfiguration.Builder,
    moduleConfigs: [String: [String: Any]]
  ) {
    lock.lock()
    let snapshot = contributors
    lock.unlock()
    for contributor in snapshot {
      contributor.contribute(builder: builder, moduleConfigs: moduleConfigs)
    }
  }
}
