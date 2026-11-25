//  SDKEventEmitter.mm
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

#import "SDKEventEmitter.h"

#if __has_include(<React/RCTEventEmitter.h>)
#import <React/RCTEventEmitter.h>
#endif

@implementation SDKEventEmitter {
  BOOL _hasListeners;
}

static SDKEventEmitter *_sharedEmitter = nil;
static NSMutableArray<NSArray<id> *> *_pendingEvents = nil;
static NSLock *_pendingLock = nil;

RCT_EXPORT_MODULE(SDKEventEmitter)

- (NSArray<NSString *> *)supportedEvents {
  return @[ @"AltcraftSdkEvent", @"altcraftJwtRequest", @"AltcraftInAppJsonContent" ];
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    _sharedEmitter = self;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      _pendingEvents = [NSMutableArray new];
      _pendingLock = [NSLock new];
    });
  }
  return self;
}

- (void)dealloc {
  if (_sharedEmitter == self) {
    _sharedEmitter = nil;
  }
}

- (void)startObserving {
  _hasListeners = YES;
  [self flushPendingIfPossible];
}

- (void)stopObserving {
  _hasListeners = NO;
}

+ (void)emitWithName:(NSString *)name body:(id)body {
  void (^deliver)(void) = ^{
    SDKEventEmitter *emitter = _sharedEmitter;
    if (emitter && emitter->_hasListeners) {
      [emitter sendEventWithName:name body:body];
    } else {
      [self bufferName:name body:body];
    }
  };

  if ([NSThread isMainThread]) {
    deliver();
  } else {
    dispatch_async(dispatch_get_main_queue(), deliver);
  }
}

+ (void)bufferName:(NSString *)name body:(id)body {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    _pendingEvents = [NSMutableArray new];
    _pendingLock = [NSLock new];
  });

  [_pendingLock lock];
  [_pendingEvents addObject:@[ name, body ?: [NSNull null] ]];
  [_pendingLock unlock];
}

- (void)flushPendingIfPossible {
  if (!_sharedEmitter || !_pendingEvents || !_pendingLock) return;

  if (![NSThread isMainThread]) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [self flushPendingIfPossible];
    });
    return;
  }

  if (!_hasListeners) return;

  [_pendingLock lock];
  NSArray<NSArray<id> *> *toSend = _pendingEvents;
  _pendingEvents = [NSMutableArray new];
  [_pendingLock unlock];

  for (NSArray<id> *item in toSend) {
    if (item.count >= 2) {
      [self sendEventWithName:item[0] body:(item[1] == [NSNull null] ? nil : item[1])];
    }
  }
}

@end
