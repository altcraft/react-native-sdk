// ios/Sdk.mm
#import "Sdk.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <ReactCommon/RCTTurboModule.h>
#endif

#import <Foundation/Foundation.h>
#import <objc/message.h>
#import <objc/runtime.h>

#include <optional>
#include <type_traits>

#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#endif

#if __has_include(<React/RCTUtils.h>)
#import <React/RCTUtils.h>
#endif

#if __has_include(<React/RCTCallableJSModules.h>)
#import <React/RCTCallableJSModules.h>
#else
/// Minimal protocol for calling JS from native when headers are not available.
@protocol RCTCallableJSModules <NSObject>
- (void)invokeModule:(NSString *)moduleName
              method:(NSString *)methodName
            withArgs:(NSArray *)args;
@end
#endif

#ifndef RCTPromiseResolveBlock
/// React Native promise resolver.
typedef void (^RCTPromiseResolveBlock)(id _Nullable result);
#endif

#ifndef RCTPromiseRejectBlock
/// React Native promise rejecter.
typedef void (^RCTPromiseRejectBlock)(NSString * _Nonnull code,
                                      NSString * _Nullable message,
                                      NSError * _Nullable error);
#endif

#pragma mark - Runtime helpers

/// Builds selector from string.
static SEL SdkSel(NSString *name) {
  return NSSelectorFromString(name);
}

/// Returns YES if instance responds to selector.
static BOOL SdkResponds(id obj, SEL sel) {
  return obj && sel && [obj respondsToSelector:sel];
}

/// Returns YES if class responds to selector.
static BOOL SdkClassResponds(Class cls, SEL sel) {
  return cls && sel && [cls respondsToSelector:sel];
}

#pragma mark - NSNull -> nil

/// Converts NSNull / kCFNull to nil (keeps other values as-is).
static inline id SdkNilIfNSNull(id v) {
  return (v == (id)kCFNull || [v isKindOfClass:[NSNull class]]) ? nil : v;
}

#pragma mark - Swift runtime bridge (no Sdk-Swift.h needed)

/// Returns SdkModule class if present (resolved by name at runtime).
static Class SdkAppModuleClass(void) {
  Class cls = NSClassFromString(@"SdkModule");

#ifdef DEBUG
  // Debug-only: attempt to discover module name with namespace suffix.
  if (!cls) {
    int count = objc_getClassList(NULL, 0);
    if (count > 0) {
      Class *classes = (Class *)malloc(sizeof(Class) * (NSUInteger)count);
      if (classes) {
        objc_getClassList(classes, count);
        for (int i = 0; i < count; i++) {
          NSString *name = NSStringFromClass(classes[i]);
          if ([name hasSuffix:@".SdkModule"] || [name isEqualToString:@"SdkModule"]) {
            if ([name hasSuffix:@".SdkModule"]) {
              cls = classes[i];
              break;
            }
          }
        }
        free(classes);
      }
    }
  }
#endif // DEBUG

  return cls;
}

/// Returns shared Swift module instance via +[SdkModule shared].
static id SdkAppModuleSharedInstance(void) {
  Class cls = SdkAppModuleClass();
  if (!cls) return nil;

  SEL sel = SdkSel(@"shared");
  if (!SdkClassResponds(cls, sel)) return nil;

  IMP imp = [cls methodForSelector:sel];
  if (!imp) return nil;

  id (*func)(id, SEL) = (id (*)(id, SEL))imp;
  return func((id)cls, sel);
}

/// Ensures push providers are installed/configured inside Swift module.
static void EnsureProvidersInstalled(id instance) {
  if (!instance) return;

  SEL sel = SdkSel(@"ensureProvidersInstalled");
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL) = (void (*)(id, SEL))imp;
  func(instance, sel);
}

/// Sets token on Swift module using a selector name.
static void CallSetToken(id instance, NSString *selectorName, NSString * _Nullable token) {
  if (!instance) return;

  SEL sel = SdkSel(selectorName);
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL, id) = (void (*)(id, SEL, id))imp;
  func(instance, sel, token);
}

/// Sets App Group name on Swift module.
static void CallSetAppGroup(id instance, NSString * _Nullable groupName) {
  if (!instance) return;

  SEL sel = SdkSel(@"setAppGroupWithName:");
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL, id) = (void (*)(id, SEL, id))imp;
  func(instance, sel, groupName);
}

/// Deletes device token for a provider on Swift module.
static void CallDeleteDeviceToken(id instance, NSString * _Nullable provider, void (^completion)(BOOL ok)) {
  if (!instance) { completion(NO); return; }

  SEL sel = SdkSel(@"deleteDeviceTokenWithProvider:completion:");
  if (!SdkResponds(instance, sel)) { completion(NO); return; }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) { completion(NO); return; }

  void (*func)(id, SEL, id, id) = (void (*)(id, SEL, id, id))imp;
  func(instance, sel, provider, completion);
}

/// Retrieves current push token from Swift module.
static void CallGetPushToken(id instance, void (^completion)(id _Nullable tokenObjC)) {
  if (!instance) { completion(nil); return; }

  SEL sel = SdkSel(@"getPushTokenWithCompletion:");
  if (!SdkResponds(instance, sel)) { completion(nil); return; }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) { completion(nil); return; }

  void (*func)(id, SEL, id) = (void (*)(id, SEL, id))imp;
  func(instance, sel, completion);
}

/// Forces token update on Swift module.
static void CallForcedTokenUpdate(id instance, void (^completion)(void)) {
  if (!instance) { completion(); return; }

  SEL sel = SdkSel(@"forcedTokenUpdateWithCompletion:");
  if (!SdkResponds(instance, sel)) { completion(); return; }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) { completion(); return; }

  void (*func)(id, SEL, id) = (void (*)(id, SEL, id))imp;
  func(instance, sel, completion);
}

/// Changes push provider priority list on Swift module.
static void CallChangeProviderPriorityList(id instance, NSArray * _Nullable list, void (^completion)(BOOL ok)) {
  if (!instance) { completion(NO); return; }

  SEL sel = SdkSel(@"changePushProviderPriorityListWithList:completion:");
  if (!SdkResponds(instance, sel)) { completion(NO); return; }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) { completion(NO); return; }

  void (*func)(id, SEL, id, id) = (void (*)(id, SEL, id, id))imp;
  func(instance, sel, list, completion);
}

/// Sets push token with provider on Swift module.
static void CallSetPushToken(id instance, NSString *provider, NSString * _Nullable token) {
  if (!instance) return;

  SEL sel = SdkSel(@"setPushTokenWithProvider:pushToken:");
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL, id, id) = (void (*)(id, SEL, id, id))imp;
  func(instance, sel, provider, token);
}

#pragma mark - Push subscription calls

/// Invokes subscription-related methods on Swift module.
static void CallPushSubscription(id instance,
                                 NSString *selectorName,
                                 NSNumber *sync,
                                 NSDictionary *profileFields,
                                 NSDictionary *customFields,
                                 NSArray *cats,
                                 NSNumber *replace,
                                 NSNumber *skipTriggers) {
  if (!instance) return;

  SEL sel = SdkSel(selectorName);
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL, id, id, id, id, id, id) =
      (void (*)(id, SEL, id, id, id, id, id, id))imp;

  func(instance, sel, sync, profileFields, customFields, cats, replace, skipTriggers);
}

#pragma mark - Mobile Event calls

/// Sends mobile event to Swift module.
static void CallMobileEvent(id instance,
                            NSString *sid,
                            NSString *eventName,
                            NSString * _Nullable sendMessageId,
                            NSDictionary * _Nullable payload,
                            NSDictionary * _Nullable matching,
                            NSString * _Nullable matchingType,
                            NSDictionary * _Nullable profileFields) {
  if (!instance) return;

  SEL sel = SdkSel(@"mobileEvent:eventName:sendMessageId:payload:matching:matchingType:profileFields:");
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL, id, id, id, id, id, id, id) =
      (void (*)(id, SEL, id, id, id, id, id, id, id))imp;

  func(instance, sel, sid, eventName, sendMessageId, payload, matching, matchingType, profileFields);
}

#pragma mark - Promise helpers

/// Calls a Swift method with signature (resolver, rejecter).
static void CallPromise0Args(id instance,
                             NSString *selectorName,
                             RCTPromiseResolveBlock resolve,
                             RCTPromiseRejectBlock reject) {
  if (!instance) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule is nil"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule instance is nil", err);
    return;
  }

  SEL sel = SdkSel(selectorName);
  if (!SdkResponds(instance, sel)) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:22 userInfo:@{NSLocalizedDescriptionKey:@"Swift selector not found"}];
    reject(@"METHOD_NOT_FOUND", @"method not found", err);
    return;
  }

  // React Native expects promise calls on main thread.
  if (![NSThread isMainThread]) {
    dispatch_async(dispatch_get_main_queue(), ^{
      CallPromise0Args(instance, selectorName, resolve, reject);
    });
    return;
  }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) {
    // Fallback for cases where methodForSelector returns NULL in mixed ObjC/Swift builds.
    NSMethodSignature *sig = [instance methodSignatureForSelector:sel];
    if (!sig) {
      NSError *err = [NSError errorWithDomain:@"Sdk" code:20 userInfo:@{NSLocalizedDescriptionKey:@"No signature"}];
      reject(@"METHOD_SIGNATURE_NOT_FOUND", @"method signature not found", err);
      return;
    }

    NSInvocation *inv = [NSInvocation invocationWithMethodSignature:sig];
    [inv setTarget:instance];
    [inv setSelector:sel];
    RCTPromiseResolveBlock res = resolve;
    RCTPromiseRejectBlock rej = reject;
    [inv setArgument:&res atIndex:2];
    [inv setArgument:&rej atIndex:3];
    [inv invoke];
    return;
  }

  void (*func)(id, SEL, RCTPromiseResolveBlock, RCTPromiseRejectBlock) =
      (void (*)(id, SEL, RCTPromiseResolveBlock, RCTPromiseRejectBlock))imp;

  func(instance, sel, resolve, reject);
}

/// Calls a Swift method with signature (String?, resolver, rejecter).
static void CallPromise1StringArg(id instance,
                                  NSString *selectorName,
                                  NSString * _Nullable arg,
                                  RCTPromiseResolveBlock resolve,
                                  RCTPromiseRejectBlock reject) {
  if (!instance) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule is nil"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule instance is nil", err);
    return;
  }

  SEL sel = SdkSel(selectorName);
  if (!SdkResponds(instance, sel)) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:23 userInfo:@{NSLocalizedDescriptionKey:@"Swift selector not found"}];
    reject(@"METHOD_NOT_FOUND", @"method not found", err);
    return;
  }

  // React Native expects promise calls on main thread.
  if (![NSThread isMainThread]) {
    NSString *a = arg;
    dispatch_async(dispatch_get_main_queue(), ^{
      CallPromise1StringArg(instance, selectorName, a, resolve, reject);
    });
    return;
  }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) {
    NSMethodSignature *sig = [instance methodSignatureForSelector:sel];
    if (!sig) {
      NSError *err = [NSError errorWithDomain:@"Sdk" code:21 userInfo:@{NSLocalizedDescriptionKey:@"No signature"}];
      reject(@"METHOD_SIGNATURE_NOT_FOUND", @"method signature not found", err);
      return;
    }

    NSInvocation *inv = [NSInvocation invocationWithMethodSignature:sig];
    [inv setTarget:instance];
    [inv setSelector:sel];
    NSString *a = arg;
    RCTPromiseResolveBlock res = resolve;
    RCTPromiseRejectBlock rej = reject;
    [inv setArgument:&a atIndex:2];
    [inv setArgument:&res atIndex:3];
    [inv setArgument:&rej atIndex:4];
    [inv invoke];
    return;
  }

  void (*func)(id, SEL, NSString *, RCTPromiseResolveBlock, RCTPromiseRejectBlock) =
      (void (*)(id, SEL, NSString *, RCTPromiseResolveBlock, RCTPromiseRejectBlock))imp;

  func(instance, sel, arg, resolve, reject);
}

#pragma mark - Initialize / Clear

/// Calls Swift initializer selector on the main thread.
static void CallInitializeBySelector(id instance,
                                     SEL sel,
                                     NSDictionary *config,
                                     RCTPromiseResolveBlock resolve,
                                     RCTPromiseRejectBlock reject) {
  if (![NSThread isMainThread]) {
    NSDictionary *cfg = config ?: @{};
    dispatch_async(dispatch_get_main_queue(), ^{
      CallInitializeBySelector(instance, sel, cfg, resolve, reject);
    });
    return;
  }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) {
    NSMethodSignature *sig = [instance methodSignatureForSelector:sel];
    if (!sig) {
      NSError *err = [NSError errorWithDomain:@"Sdk" code:7 userInfo:@{NSLocalizedDescriptionKey:@"No signature"}];
      reject(@"INIT_SIGNATURE_NOT_FOUND", @"initialize signature not found", err);
      return;
    }
    NSInvocation *inv = [NSInvocation invocationWithMethodSignature:sig];
    [inv setTarget:instance];
    [inv setSelector:sel];
    NSDictionary *cfg = config ?: @{};
    RCTPromiseResolveBlock res = resolve;
    RCTPromiseRejectBlock rej = reject;
    [inv setArgument:&cfg atIndex:2];
    [inv setArgument:&res atIndex:3];
    [inv setArgument:&rej atIndex:4];
    [inv invoke];
    return;
  }

  void (*func)(id, SEL, NSDictionary *, RCTPromiseResolveBlock, RCTPromiseRejectBlock) =
      (void (*)(id, SEL, NSDictionary *, RCTPromiseResolveBlock, RCTPromiseRejectBlock))imp;

  NSDictionary *safeCfg = config ?: @{};
  func(instance, sel, safeCfg, resolve, reject);
}

/// Initializes Swift module with config.
static void CallInitialize(id instance,
                           NSDictionary *config,
                           RCTPromiseResolveBlock resolve,
                           RCTPromiseRejectBlock reject) {
  if (!instance) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule is nil"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule instance is nil", err);
    return;
  }

  SEL sel = SdkSel(@"initializeWithConfig:resolver:rejecter:");
  if (!SdkResponds(instance, sel)) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:6 userInfo:@{NSLocalizedDescriptionKey:@"initialize selector not found"}];
    reject(@"INIT_METHOD_NOT_FOUND", @"initialize method not found", err);
    return;
  }

  CallInitializeBySelector(instance, sel, config, resolve, reject);
}

/// Clears SDK state in Swift module.
static void CallClear(id instance,
                      RCTPromiseResolveBlock resolve,
                      RCTPromiseRejectBlock reject) {
  CallPromise0Args(instance, @"clearWithResolver:rejecter:", resolve, reject);
}

#pragma mark - Events: Swift -> NotificationCenter -> ObjC++ -> JS

/// Notification name used by Swift layer to publish events.
static NSString * const SdkEventsNotificationName = @"AltcraftSdkEventNotification";

static id _Nullable gSdkEventsObserver = nil;
static id<RCTCallableJSModules> _Nullable gCallableJSModules = nil;

/// Returns callableJSModules from a module instance if present.
static id<RCTCallableJSModules> _Nullable SdkGetCallableFromModule(id moduleInstance) {
  if (!moduleInstance) return nil;

  SEL sel = SdkSel(@"callableJSModules");
  if (![moduleInstance respondsToSelector:sel]) return nil;

  id (*msgSend)(id, SEL) = (id (*)(id, SEL))objc_msgSend;
  id v = msgSend(moduleInstance, sel);
  return (id<RCTCallableJSModules>)v;
}

/// Returns bridge from a module instance if present (Old Arch).
static id _Nullable SdkGetBridgeAny(id moduleInstance) {
  if (!moduleInstance) return nil;

  SEL sel = SdkSel(@"bridge");
  if (![moduleInstance respondsToSelector:sel]) return nil;

  id (*msgSend)(id, SEL) = (id (*)(id, SEL))objc_msgSend;
  return msgSend(moduleInstance, sel);
}

/// Checks if bridge supports enqueueing JS calls.
static BOOL SdkBridgeCanEnqueue(id bridgeObj) {
  if (!bridgeObj) return NO;

  SEL sel = SdkSel(@"enqueueJSCall:method:args:completion:");
  return [bridgeObj respondsToSelector:sel];
}

/// Emits event using bridge enqueue (Old Arch).
static void SdkBridgeEnqueueEmit(id bridgeObj, NSDictionary *payload) {
  SEL sel = SdkSel(@"enqueueJSCall:method:args:completion:");
  if (![bridgeObj respondsToSelector:sel]) return;

  NSArray *args = @[@"AltcraftSdkEvent", payload ?: @{}];

  void (*func)(id, SEL, id, id, id, id) = (void (*)(id, SEL, id, id, id, id))objc_msgSend;
  func(bridgeObj, sel, @"RCTDeviceEventEmitter", @"emit", args, (id)nil);
}

/// Emits event to JS via callableJSModules (preferred) or bridge enqueue.
static void SdkEmitEventToJS(id moduleInstance, NSDictionary *payload) {
  NSDictionary *safePayload = (payload && [payload isKindOfClass:[NSDictionary class]]) ? payload : @{};

  // 1) New Arch: callableJSModules.
  id<RCTCallableJSModules> callable = gCallableJSModules;
  if (!callable) {
    callable = SdkGetCallableFromModule(moduleInstance);
    if (callable) gCallableJSModules = callable;
  }
  if (callable) {
    [callable invokeModule:@"RCTDeviceEventEmitter"
                    method:@"emit"
                  withArgs:@[@"AltcraftSdkEvent", safePayload]];
    return;
  }

  // 2) Old Arch: bridge enqueueJSCall.
  id bridgeObj = SdkGetBridgeAny(moduleInstance);
  if (SdkBridgeCanEnqueue(bridgeObj)) {
    SdkBridgeEnqueueEmit(bridgeObj, safePayload);
  }
}

/// Installs NotificationCenter observer to forward events to JS.
static void SdkInstallEventsObserverIfNeeded(id moduleInstance) {
  // Refresh callable cache if possible.
  id<RCTCallableJSModules> callable = SdkGetCallableFromModule(moduleInstance);
  if (callable) gCallableJSModules = callable;

  if (gSdkEventsObserver != nil) return;

  gSdkEventsObserver =
    [[NSNotificationCenter defaultCenter] addObserverForName:SdkEventsNotificationName
                                                      object:nil
                                                       queue:[NSOperationQueue mainQueue]
                                                  usingBlock:^(NSNotification *note) {
    NSDictionary *payload = note.userInfo;

    // Debug visibility for event flow (safe to keep).
    NSLog(@"[AltcraftSdk] event %@", payload);

    SdkEmitEventToJS(moduleInstance, payload);
  }];
}

/// Removes NotificationCenter observer.
static void SdkRemoveEventsObserverIfNeeded(void) {
  if (!gSdkEventsObserver) return;

  [[NSNotificationCenter defaultCenter] removeObserver:gSdkEventsObserver];
  gSdkEventsObserver = nil;
  gCallableJSModules = nil;
}

#pragma mark - Typed config -> NSDictionary (New Arch)

#ifdef RCT_NEW_ARCH_ENABLED

template <typename T>
struct SdkIsStdOptional : std::false_type {};

template <typename T>
struct SdkIsStdOptional<std::optional<T>> : std::true_type {};

/// Converts NSString* / optional NSString* to NSString* or nil.
template <typename T>
static NSString *SdkGetStringOrNil(const T &v) {
  using D = std::decay_t<T>;
  if constexpr (std::is_same_v<D, NSString *>) {
    return v;
  } else if constexpr (SdkIsStdOptional<D>::value) {
    return v.has_value() ? v.value() : nil;
  } else {
    return nil;
  }
}

/// Converts bool / optional bool to NSNumber* or nil.
template <typename T>
static NSNumber *SdkGetBoolNumberOrNil(const T &v) {
  using D = std::decay_t<T>;
  if constexpr (std::is_same_v<D, bool>) {
    return @(v);
  } else if constexpr (SdkIsStdOptional<D>::value) {
    return v.has_value() ? @(v.value()) : nil;
  } else {
    return nil;
  }
}

#import <limits.h>

/// Converts LazyVector<NSString*> to NSArray (capped to INT_MAX).
static NSArray *SdkLazyVectorToNSArray(const facebook::react::LazyVector<NSString *> &vec) {
  const size_t n = vec.size();
  const size_t capped = (n > (size_t)INT_MAX) ? (size_t)INT_MAX : n;

  NSMutableArray *arr = [NSMutableArray arrayWithCapacity:(NSUInteger)capped];
  for (int i = 0; i < (int)capped; i++) {
    NSString *s = vec[i];
    [arr addObject:(s ? s : (id)kCFNull)];
  }

  return arr;
}

/// Converts LazyVector / optional LazyVector to NSArray* or nil.
template <typename T>
static NSArray *SdkGetStringArrayOrNil(const T &v) {
  using D = std::decay_t<T>;
  if constexpr (std::is_same_v<D, facebook::react::LazyVector<NSString *>>) {
    return SdkLazyVectorToNSArray(v);
  } else if constexpr (SdkIsStdOptional<D>::value) {
    return v.has_value() ? SdkLazyVectorToNSArray(v.value()) : nil;
  } else {
    return nil;
  }
}

/// Converts appInfo struct to NSDictionary* or nil.
template <typename T>
static NSDictionary *SdkGetAppInfoDictOrNil(const T &v) {
  using D = std::decay_t<T>;

  auto makeDict = [](NSString *appID, NSString *appIID, NSString *appVer) -> NSDictionary * {
    if ((!appID || appID.length == 0) && (!appIID || appIID.length == 0) && (!appVer || appVer.length == 0)) {
      return nil;
    }
    return @{
      @"appID": appID ?: (id)kCFNull,
      @"appIID": appIID ?: (id)kCFNull,
      @"appVer": appVer ?: (id)kCFNull,
    };
  };

  if constexpr (SdkIsStdOptional<D>::value) {
    if (!v.has_value()) return nil;
    const auto &info = v.value();
    return makeDict(info.appID(), info.appIID(), info.appVer());
  } else {
    return makeDict(v.appID(), v.appIID(), v.appVer());
  }
}

/// Converts typed RN config to NSDictionary for Swift module.
static NSDictionary *SdkConvertAltcraftConfigToNSDictionary(JS::NativeSdk::AltcraftConfig &cfg) {
  NSString *apiUrl = cfg.apiUrl();
  NSString *rToken = SdkGetStringOrNil(cfg.rToken());
  NSNumber *enableLogging = SdkGetBoolNumberOrNil(cfg.enableLogging());
  NSArray *providerPriorityList = SdkGetStringArrayOrNil(cfg.providerPriorityList());
  NSDictionary *appInfo = SdkGetAppInfoDictOrNil(cfg.appInfo());

  NSMutableDictionary *dict = [NSMutableDictionary new];
  dict[@"apiUrl"] = apiUrl ?: @"";
  dict[@"rToken"] = rToken ?: (id)kCFNull;
  dict[@"appInfo"] = appInfo ?: (id)kCFNull;
  dict[@"providerPriorityList"] = providerPriorityList ?: (id)kCFNull;
  dict[@"enableLogging"] = enableLogging ?: (id)kCFNull;
  return dict;
}

#endif  // RCT_NEW_ARCH_ENABLED

#pragma mark - Module implementation

@implementation Sdk

#ifdef RCT_NEW_ARCH_ENABLED
/// Returns TurboModule instance for New Architecture.
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeSdkSpecJSI>(params);
}
#endif  // RCT_NEW_ARCH_ENABLED

/// React Native module name.
+ (NSString *)moduleName { return @"Sdk"; }

#ifdef RCT_NEW_ARCH_ENABLED
/// Initializes SDK using typed config (New Architecture).
- (void)initialize:(JS::NativeSdk::AltcraftConfig &)config
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  NSDictionary *swiftConfig = SdkConvertAltcraftConfigToNSDictionary(config);
  CallInitialize(module, swiftConfig, resolve, reject);
}
#endif  // RCT_NEW_ARCH_ENABLED

/// Required by RN event emitter API (no-op).
- (void)addListener:(NSString *)eventName { (void)eventName; }

/// Required by RN event emitter API (no-op).
- (void)removeListeners:(double)count { (void)count; }

#pragma mark - Events API

/// Subscribes to SDK events and forwards them to JS.
- (void)subscribeToEvents
{
  // Install observer and keep emitting to JS.
  SdkInstallEventsObserverIfNeeded(self);

  // Ask Swift to subscribe and start posting notifications.
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  SEL sel = SdkSel(@"subscribeToEvents");
  if (!SdkResponds(module, sel)) return;

  IMP imp = [module methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL) = (void (*)(id, SEL))imp;
  func(module, sel);
}

/// Unsubscribes from SDK events and stops forwarding to JS.
- (void)unsubscribeFromEvent
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  SEL sel = SdkSel(@"unsubscribeFromEvent");
  if (SdkResponds(module, sel)) {
    IMP imp = [module methodForSelector:sel];
    if (imp) {
      void (*func)(id, SEL) = (void (*)(id, SEL))imp;
      func(module, sel);
    }
  }

  SdkRemoveEventsObserverIfNeeded();
}

#pragma mark - Common (JWT / AppGroup)

/// Sets JWT used by SDK requests.
- (void)setJwt:(NSString * _Nullable)token {
  id module = SdkAppModuleSharedInstance();
  CallSetToken(module, @"setJWT:", token);
}

/// Sets App Group name for shared storage.
- (void)setAppGroup:(NSString * _Nullable)groupName
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  if (!module) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule not found"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule class not found", err);
    return;
  }

  CallSetAppGroup(module, groupName);
  resolve((id)kCFNull);
}

#pragma mark - Platform-specific tokens

/// Android-only API stub (no-op on iOS).
- (void)setAndroidFcmToken:(NSString * _Nullable)token { (void)token; }

/// Android-only API stub (no-op on iOS).
- (void)setAndroidHmsToken:(NSString * _Nullable)token { (void)token; }

/// Sets iOS FCM token in Swift module.
- (void)setIosFcmToken:(NSString * _Nullable)token {
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallSetToken(module, @"setFCM:", token);
}

/// Sets iOS HMS token in Swift module (if used).
- (void)setIosHmsToken:(NSString * _Nullable)token {
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallSetToken(module, @"setHMS:", token);
}

/// Sets APNs token in Swift module.
- (void)setApnsToken:(NSString * _Nullable)token {
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallSetToken(module, @"setAPNS:", token);
}

/// RuStore-only API stub (no-op on iOS).
- (void)setRustoreToken:(NSString * _Nullable)token { (void)token; }

#pragma mark - Subscription (void)

/// Subscribes device for push notifications.
- (void)pushSubscribe:(NSNumber *)sync
        profileFields:(NSDictionary *)profileFields
         customFields:(NSDictionary *)customFields
                 cats:(NSArray *)cats
              replace:(NSNumber *)replace
         skipTriggers:(NSNumber *)skipTriggers
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  CallPushSubscription(module,
                       @"pushSubscribe:profileFields:customFields:cats:replace:skipTriggers:",
                       (NSNumber *)SdkNilIfNSNull(sync),
                       (NSDictionary *)SdkNilIfNSNull(profileFields),
                       (NSDictionary *)SdkNilIfNSNull(customFields),
                       (NSArray *)SdkNilIfNSNull(cats),
                       (NSNumber *)SdkNilIfNSNull(replace),
                       (NSNumber *)SdkNilIfNSNull(skipTriggers));
}

/// Suspends push subscription.
- (void)pushSuspend:(NSNumber *)sync
      profileFields:(NSDictionary *)profileFields
       customFields:(NSDictionary *)customFields
               cats:(NSArray *)cats
            replace:(NSNumber *)replace
       skipTriggers:(NSNumber *)skipTriggers
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  CallPushSubscription(module,
                       @"pushSuspend:profileFields:customFields:cats:replace:skipTriggers:",
                       (NSNumber *)SdkNilIfNSNull(sync),
                       (NSDictionary *)SdkNilIfNSNull(profileFields),
                       (NSDictionary *)SdkNilIfNSNull(customFields),
                       (NSArray *)SdkNilIfNSNull(cats),
                       (NSNumber *)SdkNilIfNSNull(replace),
                       (NSNumber *)SdkNilIfNSNull(skipTriggers));
}

/// Unsubscribes device from push notifications.
- (void)pushUnSubscribe:(NSNumber *)sync
          profileFields:(NSDictionary *)profileFields
           customFields:(NSDictionary *)customFields
                   cats:(NSArray *)cats
                replace:(NSNumber *)replace
           skipTriggers:(NSNumber *)skipTriggers
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  CallPushSubscription(module,
                       @"pushUnSubscribe:profileFields:customFields:cats:replace:skipTriggers:",
                       (NSNumber *)SdkNilIfNSNull(sync),
                       (NSDictionary *)SdkNilIfNSNull(profileFields),
                       (NSDictionary *)SdkNilIfNSNull(customFields),
                       (NSArray *)SdkNilIfNSNull(cats),
                       (NSNumber *)SdkNilIfNSNull(replace),
                       (NSNumber *)SdkNilIfNSNull(skipTriggers));
}

#pragma mark - MobileEvent (void)

/// Sends a custom mobile event to backend.
- (void)mobileEvent:(NSString *)sid
          eventName:(NSString *)eventName
       sendMessageId:(NSString * _Nullable)sendMessageId
            payload:(NSDictionary *)payload
           matching:(NSDictionary *)matching
       matchingType:(NSString * _Nullable)matchingType
      profileFields:(NSDictionary *)profileFields
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  CallMobileEvent(module,
                  (NSString *)SdkNilIfNSNull(sid),
                  (NSString *)SdkNilIfNSNull(eventName),
                  (NSString *)SdkNilIfNSNull(sendMessageId),
                  (NSDictionary *)SdkNilIfNSNull(payload),
                  (NSDictionary *)SdkNilIfNSNull(matching),
                  (NSString *)SdkNilIfNSNull(matchingType),
                  (NSDictionary *)SdkNilIfNSNull(profileFields));
}

#pragma mark - Promises

/// Unsuspends current push subscription.
- (void)unSuspendPushSubscription:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallPromise0Args(module, @"unSuspendPushSubscriptionWithResolver:rejecter:", resolve, reject);
}

/// Returns status of latest subscription attempt.
- (void)getStatusOfLatestSubscription:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallPromise0Args(module, @"getStatusOfLatestSubscriptionWithResolver:rejecter:", resolve, reject);
}

/// Returns current subscription status.
- (void)getStatusForCurrentSubscription:(RCTPromiseResolveBlock)resolve
                                 reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallPromise0Args(module, @"getStatusForCurrentSubscriptionWithResolver:rejecter:", resolve, reject);
}

/// Returns status of latest subscription for a specific provider.
- (void)getStatusOfLatestSubscriptionForProvider:(NSString * _Nullable)provider
                                         resolve:(RCTPromiseResolveBlock)resolve
                                          reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  NSString *p = (NSString *)SdkNilIfNSNull(provider);
  CallPromise1StringArg(module,
                        @"getStatusOfLatestSubscriptionForProviderWithProvider:resolver:rejecter:",
                        p,
                        resolve,
                        reject);
}

/// Clears SDK state (tokens, cached values, etc).
- (void)clear:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallClear(module, resolve, reject);
}

/// Returns current push token info {provider, token}.
- (void)getPushToken:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  if (!module) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule not found"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule class not found", err);
    return;
  }

  EnsureProvidersInstalled(module);

  CallGetPushToken(module, ^(id _Nullable tokenObjC) {
    if (!tokenObjC) { resolve((id)kCFNull); return; }

    NSString *provider = nil;
    NSString *token = nil;

    @try {
      provider = [tokenObjC valueForKey:@"provider"];
      token = [tokenObjC valueForKey:@"token"];
    } @catch (__unused NSException *e) {}

    if (!provider && !token) { resolve((id)kCFNull); return; }

    resolve(@{
      @"provider": provider ?: (id)kCFNull,
      @"token": token ?: (id)kCFNull
    });
  });
}

/// Deletes device token for provider.
- (void)deleteDeviceToken:(NSString * _Nullable)provider
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  if (!module) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule not found"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule class not found", err);
    return;
  }

  EnsureProvidersInstalled(module);

  CallDeleteDeviceToken(module, provider, ^(BOOL ok) {
    if (ok) resolve((id)kCFNull);
    else {
      NSError *err = [NSError errorWithDomain:@"Sdk" code:2 userInfo:@{NSLocalizedDescriptionKey:@"Unknown provider"}];
      reject(@"INVALID_PROVIDER", @"Unknown provider for deleteDeviceToken", err);
    }
  });
}

/// Forces push token update.
- (void)forcedTokenUpdate:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  if (!module) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule not found"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule class not found", err);
    return;
  }

  EnsureProvidersInstalled(module);

  CallForcedTokenUpdate(module, ^{
    resolve((id)kCFNull);
  });
}

/// Updates provider priority list used by SDK.
- (void)changePushProviderPriorityList:(NSArray * _Nullable)priorityList
                               resolve:(RCTPromiseResolveBlock)resolve
                                reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  if (!module) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule not found"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule class not found", err);
    return;
  }

  EnsureProvidersInstalled(module);

  NSArray *list = priorityList ?: @[];
  CallChangeProviderPriorityList(module, list, ^(BOOL ok) {
    if (ok) resolve((id)kCFNull);
    else {
      NSError *err = [NSError errorWithDomain:@"Sdk" code:3 userInfo:@{NSLocalizedDescriptionKey:@"Change priority failed"}];
      reject(@"CHANGE_PRIORITY_FAILED", @"Failed to change provider priority list", err);
    }
  });
}

/// Sets push token for explicit provider (advanced usage).
- (void)setPushToken:(NSString *)provider
               token:(NSString * _Nullable)token
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  if (!module) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:1 userInfo:@{NSLocalizedDescriptionKey:@"SdkAppModule not found"}];
    reject(@"SWIFT_MODULE_NOT_FOUND", @"SdkAppModule class not found", err);
    return;
  }

  EnsureProvidersInstalled(module);

  if (!provider || provider.length == 0) {
    NSError *err = [NSError errorWithDomain:@"Sdk" code:4 userInfo:@{NSLocalizedDescriptionKey:@"Provider is empty"}];
    reject(@"INVALID_PROVIDER", @"Provider is empty", err);
    return;
  }

  CallSetPushToken(module, provider, token);
  resolve((id)kCFNull);
}

#pragma mark - iOS-only stubs (not implemented)

/// iOS stub: delivery tracking is handled by server/other platforms.
- (void)deliveryEvent:(NSDictionary * _Nullable)message
           messageUID:(NSString * _Nullable)messageUID
{
  (void)message;
  (void)messageUID;
  // Intentionally not implemented on iOS.
}

/// iOS stub: open tracking is handled by OS / deep-link flow.
- (void)openEvent:(NSDictionary * _Nullable)message
       messageUID:(NSString * _Nullable)messageUID
{
  (void)message;
  (void)messageUID;
  // Intentionally not implemented on iOS.
}

/// iOS stub: retry control is managed in Swift layer / system scheduling.
- (void)reinitializeRetryControlInThisSession
{
  // Intentionally not implemented on iOS.
}

/// iOS stub: permission prompt should be initiated by the host app UI.
- (void)requestNotificationPermission
{
  // Intentionally not implemented on iOS.
}

/// iOS stub: push handling is done via AppDelegate / UNUserNotificationCenter callbacks.
- (void)takePush:(NSDictionary * _Nullable)message
{
  (void)message;
  // Intentionally not implemented on iOS.
}

@end
