import Foundation
import Altcraft

@objcMembers
final class RNJWTProvider: NSObject, JWTInterface {
  private let get: () -> String?

  init(get: @escaping () -> String?) {
    self.get = get
  }

  func getToken() -> String? {
    get()
  }
}
