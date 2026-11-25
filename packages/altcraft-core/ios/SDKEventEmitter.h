//  SDKEventEmitter.h
//  AltcraftRnBridge
//
//  Created by Andrey Pogodin.
//
//  Copyright © 2026 Altcraft. All rights reserved.

#import <Foundation/Foundation.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Event emitter module for NativeEventEmitter on the JS side.
 * Bridge modules call +emitWithName:body: to forward SDK events to JS.
 */
@interface SDKEventEmitter : RCTEventEmitter

/** Emits an event to JS. If the emitter is not ready, the event is buffered. */
+ (void)emitWithName:(NSString *)name body:(nullable id)body;

@end

NS_ASSUME_NONNULL_END
