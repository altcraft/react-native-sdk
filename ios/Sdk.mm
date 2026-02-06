// Sdk.mm

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
@protocol RCTCallableJSModules <NSObject>
- (void)invokeModule:(NSString *)moduleName
              method:(NSString *)methodName
            withArgs:(NSArray *)args;
@end
#endif

#ifndef RCTPromiseResolveBlock
typedef void (^RCTPromiseResolveBlock)(id _Nullable result);
#endif

#ifndef RCTPromiseRejectBlock
typedef void (^RCTPromiseRejectBlock)(NSString * _Nonnull code,
                                      NSString * _Nullable message,
                                      NSError * _Nullable error);
#endif

#pragma mark - Runtime helpers

static SEL SdkSel(NSString *name) {
  return NSSelectorFromString(name);
}

static BOOL SdkResponds(id obj, SEL sel) {
  return obj && sel && [obj respondsToSelector:sel];
}

static BOOL SdkClassResponds(Class cls, SEL sel) {
  return cls && sel && [cls respondsToSelector:sel];
}

#pragma mark - NSNull -> nil

static inline id SdkNilIfNSNull(id v) {
  return (v == (id)kCFNull || [v isKindOfClass:[NSNull class]]) ? nil : v;
}

#pragma mark - Swift runtime bridge (no Sdk-Swift.h needed)

static Class SdkAppModuleClass(void) {
  Class cls = NSClassFromString(@"SdkModule");

#ifdef DEBUG
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

static void EnsureProvidersInstalled(id instance) {
  if (!instance) return;

  SEL sel = SdkSel(@"ensureProvidersInstalled");
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL) = (void (*)(id, SEL))imp;
  func(instance, sel);
}

#pragma mark - Swift calls (UserDefaults)

static void CallSetUserDefaultsValue(id instance,
                                     NSString * _Nullable suiteName,
                                     NSString *key,
                                     id _Nullable value) {
  if (!instance) return;

  SEL sel = SdkSel(@"setUserDefaultsValueWithSuiteName:key:value:");
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL, id, id, id) = (void (*)(id, SEL, id, id, id))imp;
  func(instance, sel, suiteName, key, value);
}

#pragma mark - Push token API (ONLY getPushToken / setPushToken)

static void CallGetPushToken(id instance, void (^completion)(id _Nullable tokenObjC)) {
  if (!instance) { completion(nil); return; }

  SEL sel = SdkSel(@"getPushTokenWithCompletion:");
  if (!SdkResponds(instance, sel)) { completion(nil); return; }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) { completion(nil); return; }

  void (*func)(id, SEL, id) = (void (*)(id, SEL, id))imp;
  func(instance, sel, completion);
}

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

#pragma mark - Mobile Event calls (with subscription param)

static void CallMobileEvent(id instance,
                            NSString *sid,
                            NSString *eventName,
                            NSString * _Nullable sendMessageId,
                            NSDictionary * _Nullable payload,
                            NSDictionary * _Nullable matching,
                            NSString * _Nullable matchingType,
                            NSDictionary * _Nullable profileFields,
                            NSDictionary * _Nullable subscription,
                            NSDictionary * _Nullable utm) {
  if (!instance) return;

  SEL sel = SdkSel(@"mobileEvent:eventName:sendMessageId:payload:matching:matchingType:profileFields:subscription:utm:");
  if (!SdkResponds(instance, sel)) return;

  IMP imp = [instance methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL, id, id, id, id, id, id, id, id, id) =
      (void (*)(id, SEL, id, id, id, id, id, id, id, id, id))imp;

  func(instance, sel, sid, eventName, sendMessageId, payload, matching, matchingType, profileFields, subscription, utm);
}

#pragma mark - Promise helpers

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

  if (![NSThread isMainThread]) {
    dispatch_async(dispatch_get_main_queue(), ^{
      CallPromise0Args(instance, selectorName, resolve, reject);
    });
    return;
  }

  IMP imp = [instance methodForSelector:sel];
  if (!imp) {
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

static void CallClear(id instance,
                      RCTPromiseResolveBlock resolve,
                      RCTPromiseRejectBlock reject) {
  CallPromise0Args(instance, @"clearWithResolver:rejecter:", resolve, reject);
}

#pragma mark - Typed config -> NSDictionary (New Arch)

#ifdef RCT_NEW_ARCH_ENABLED

template <typename T>
struct SdkIsStdOptional : std::false_type {};

template <typename T>
struct SdkIsStdOptional<std::optional<T>> : std::true_type {};

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

#pragma mark - UTM typed (New Arch) -> NSDictionary

static inline NSString *SdkNonEmptyOrNil(NSString *s) {
  if (!s) return nil;
  return (s.length > 0) ? s : nil;
}

static NSDictionary * _Nullable SdkConvertUTMToNSDictionary(JS::NativeSdk::UTM &utm) {
  NSString *campaign = SdkNonEmptyOrNil(utm.campaign());
  NSString *content  = SdkNonEmptyOrNil(utm.content());
  NSString *keyword  = SdkNonEmptyOrNil(utm.keyword());
  NSString *medium   = SdkNonEmptyOrNil(utm.medium());
  NSString *source   = SdkNonEmptyOrNil(utm.source());
  NSString *temp     = SdkNonEmptyOrNil(utm.temp());

  if (!campaign && !content && !keyword && !medium && !source && !temp) {
    return nil;
  }

  return @{
    @"campaign": campaign ?: (id)kCFNull,
    @"content":  content  ?: (id)kCFNull,
    @"keyword":  keyword  ?: (id)kCFNull,
    @"medium":   medium   ?: (id)kCFNull,
    @"source":   source   ?: (id)kCFNull,
    @"temp":     temp     ?: (id)kCFNull,
  };
}

#endif  // RCT_NEW_ARCH_ENABLED

#pragma mark - Module implementation

@implementation Sdk

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeSdkSpecJSI>(params);
}
#endif  // RCT_NEW_ARCH_ENABLED

+ (NSString *)moduleName { return @"Sdk"; }

#ifdef RCT_NEW_ARCH_ENABLED
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

- (void)addListener:(NSString *)eventName { (void)eventName; }
- (void)removeListeners:(double)count { (void)count; }

#pragma mark - Events API (Swift emits; ObjC++ only forwards method calls)

- (void)subscribeToEvents
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  SEL sel = SdkSel(@"subscribeToEvents");
  if (!SdkResponds(module, sel)) return;

  IMP imp = [module methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL) = (void (*)(id, SEL))imp;
  func(module, sel);
}

- (void)unsubscribeFromEvent
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  SEL sel = SdkSel(@"unsubscribeFromEvent");
  if (!SdkResponds(module, sel)) return;

  IMP imp = [module methodForSelector:sel];
  if (!imp) return;

  void (*func)(id, SEL) = (void (*)(id, SEL))imp;
  func(module, sel);
}

#pragma mark - Subscription (void)

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

#pragma mark - MobileEvent (void) with subscription

#ifdef RCT_NEW_ARCH_ENABLED

- (void)mobileEvent:(NSString *)sid
          eventName:(NSString *)eventName
       sendMessageId:(NSString * _Nullable)sendMessageId
            payload:(NSDictionary * _Nullable)payload
           matching:(NSDictionary * _Nullable)matching
       matchingType:(NSString * _Nullable)matchingType
      profileFields:(NSDictionary * _Nullable)profileFields
       subscription:(NSDictionary * _Nullable)subscription
                utm:(JS::NativeSdk::UTM &)utm
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  NSDictionary *utmDict = SdkConvertUTMToNSDictionary(utm);

  CallMobileEvent(module,
                  (NSString *)SdkNilIfNSNull(sid),
                  (NSString *)SdkNilIfNSNull(eventName),
                  (NSString *)SdkNilIfNSNull(sendMessageId),
                  (NSDictionary *)SdkNilIfNSNull(payload),
                  (NSDictionary *)SdkNilIfNSNull(matching),
                  (NSString *)SdkNilIfNSNull(matchingType),
                  (NSDictionary *)SdkNilIfNSNull(profileFields),
                  (NSDictionary *)SdkNilIfNSNull(subscription),
                  (NSDictionary *)SdkNilIfNSNull(utmDict));
}

#else  // OLD ARCH

- (void)mobileEvent:(NSString *)sid
          eventName:(NSString *)eventName
       sendMessageId:(NSString * _Nullable)sendMessageId
            payload:(NSDictionary * _Nullable)payload
           matching:(NSDictionary * _Nullable)matching
       matchingType:(NSString * _Nullable)matchingType
      profileFields:(NSDictionary * _Nullable)profileFields
       subscription:(NSDictionary * _Nullable)subscription
                utm:(NSDictionary * _Nullable)utm
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
                  (NSDictionary *)SdkNilIfNSNull(profileFields),
                  (NSDictionary *)SdkNilIfNSNull(subscription),
                  (NSDictionary *)SdkNilIfNSNull(utm));
}

#endif

#pragma mark - Promises

- (void)unSuspendPushSubscription:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallPromise0Args(module, @"unSuspendPushSubscriptionWithResolver:rejecter:", resolve, reject);
}

- (void)getStatusOfLatestSubscription:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallPromise0Args(module, @"getStatusOfLatestSubscriptionWithResolver:rejecter:", resolve, reject);
}

- (void)getStatusForCurrentSubscription:(RCTPromiseResolveBlock)resolve
                                 reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallPromise0Args(module, @"getStatusForCurrentSubscriptionWithResolver:rejecter:", resolve, reject);
}

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

- (void)clear:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);
  CallClear(module, resolve, reject);
}

#pragma mark - Push token API (ONLY getPushToken / setPushToken)

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

#pragma mark - UserDefaults

- (void)setUserDefaultsValue:(NSString * _Nullable)suiteName
                         key:(NSString *)key
                       value:(NSString * _Nullable)value
{
  id module = SdkAppModuleSharedInstance();
  EnsureProvidersInstalled(module);

  NSString *sn = (NSString *)SdkNilIfNSNull(suiteName);
  NSString *k  = (NSString *)SdkNilIfNSNull(key);
  id v         = SdkNilIfNSNull(value);

  if (!module) return;
  if (!k || k.length == 0) return;

  if (![NSThread isMainThread]) {
    dispatch_async(dispatch_get_main_queue(), ^{
      CallSetUserDefaultsValue(module, sn, k, v);
    });
    return;
  }

  CallSetUserDefaultsValue(module, sn, k, v);
}

#pragma mark - iOS-only stubs (kept if present in spec / facade)

- (void)deliveryEvent:(NSDictionary * _Nullable)message
           messageUID:(NSString * _Nullable)messageUID
{
  (void)message;
  (void)messageUID;
}

- (void)openEvent:(NSDictionary * _Nullable)message
       messageUID:(NSString * _Nullable)messageUID
{
  (void)message;
  (void)messageUID;
}

- (void)requestNotificationPermission
{
}

- (void)takePush:(NSDictionary * _Nullable)message
{
  (void)message;
}

@end

