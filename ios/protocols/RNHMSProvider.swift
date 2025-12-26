import Foundation
import Altcraft

@objcMembers
final class RNHMSProvider: NSObject, HMSInterface {
  private let get: (@escaping (String?) -> Void) -> Void
  private let del: (@escaping (Bool) -> Void) -> Void

  init(
    get: @escaping (@escaping (String?) -> Void) -> Void,
    del: @escaping (@escaping (Bool) -> Void) -> Void
  ) {
    self.get = get
    self.del = del
  }

  func getToken(completion: @escaping (String?) -> Void) {
    get(completion)
  }

  func deleteToken(completion: @escaping (Bool) -> Void) {
    del(completion)
  }
}
