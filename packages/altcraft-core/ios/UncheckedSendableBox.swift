import Foundation

/// Thread-unsafe value box used to move values across concurrency domains.
public final class UncheckedSendableBox<T>: @unchecked Sendable {
  private let stored: T

  /// Stores a value inside the box.
  ///
  /// - Parameter value: Value to capture.
  public init(_ value: T) { self.stored = value }

  /// Returns the stored value.
  public func get() -> T { stored }
}
