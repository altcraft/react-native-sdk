import Foundation
import Altcraft

@objcMembers
final class RNAPNSProvider: NSObject, APNSInterface {
  private let get: (@escaping (String?) -> Void) -> Void

  init(get: @escaping (@escaping (String?) -> Void) -> Void) {
    self.get = get
  }

  func getToken(completion: @escaping (String?) -> Void) {
    get(completion)
  }
}
