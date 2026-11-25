# Altcraft React Native SDK — Push

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg) [![React Native](https://img.shields.io/badge/React_Native-0.75%2B-blue?style=flat-square)](https://reactnative.dev/) [![Platforms](https://img.shields.io/badge/Platforms-Android_iOS-green?style=flat-square)](#) [![npm](https://img.shields.io/npm/v/@altcraft/push.svg?style=flat-square)](https://www.npmjs.com/package/@altcraft/push)

Altcraft React Native SDK is a library for interacting with the **Altcraft Marketing Platform**. The **Push** package is one of its modular components.

---

## Push

The Push module is responsible for push notifications.

- [x] Push subscription management: subscribe, suspend, unsubscribe.
- [x] Automatic display of push notifications configured in the platform.
- [x] Push token management: automatic update when the token changes, manual token operations.
- [x] Automatic transmission of notification delivery and open events.
- [x] Support for push providers: APNs, Firebase, Huawei, RuStore (platform-dependent).
- [x] Custom push notification handling and access to all message data fields.
- [x] Notification permission request for Android 13+ devices.
- [x] Native event message catalog (`moduleEvents`).

---

## Dependencies

Add the **Push** package and Core to your React Native application:

```sh
npm install @altcraft/push @altcraft/core
```

A configured push provider is required: Firebase, Huawei, or RuStore on Android; APNs on iOS.

---

## Requirements

- React Native 0.75+ (tested with 0.81.1).
- Android 7.1+ (API 25).
- iOS 13.0+.
