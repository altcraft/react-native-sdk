# Altcraft React Native SDK

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg)

[![React Native](https://img.shields.io/badge/React_Native-0.75%2B-blue?style=flat-square)](https://reactnative.dev/)
[![Platforms](https://img.shields.io/badge/Platforms-Android_iOS-green?style=flat-square)](#)
[![npm](https://img.shields.io/npm/v/@altcraft/react-native-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@altcraft/react-native-sdk)

Altcraft React Native SDK is a library for interacting with the **Altcraft Marketing Platform**. It uses a modular architecture in which each component provides a specific set of capabilities.

---

## SDK Modules

### Core

The Core module is the foundation of the SDK: it connects your application to the Altcraft platform and makes the optional modules available.

* [x] SDK initialization and configuration.
* [x] Authentication with JWT or a role token (*RToken*).
* [x] Works with anonymous and registered users; supports multiple profiles on one device (JWT).
* [x] Transmission of requests to the platform with automatic retry of failed requests.
* [x] SDK event stream for monitoring SDK behavior in the app.
* [x] Native event message catalog per module (`moduleEvents`).
* [x] SDK data cleanup and background tasks termination.

### Push

The Push module is responsible for push notifications.

* [x] Push subscription management: subscribe, suspend, unsubscribe.
* [x] Automatic display of push notifications configured in the platform.
* [x] Push token management: automatic update when the token changes, manual token operations.
* [x] Automatic transmission of notification delivery and open events.
* [x] Support for push providers: APNs, Firebase, Huawei, RuStore (platform-dependent).
* [x] Custom push notification handling and access to all message data fields.
* [x] Notification permission request for Android 13+ devices.
* [x] Native event message catalog (`moduleEvents`).

### Target

The Target module is responsible for mobile events: it sends target events to the platform to record goal achievements.

* [x] Sending target events (goal conversions) from the app.
* [x] Attaching event payloads, matching parameters, profile fields, and channel subscriptions to a target event.
* [x] Attaching UTM tags to target events for attribution.
* [x] `sendTarget` entry point matching the native SDKs.
* [x] Native event message catalog (`moduleEvents`).

### Profile

The Profile module is responsible for user profile fields.

* [x] Updating profile fields from the app.
* [x] Native event message catalog (`moduleEvents`).

### In-App

The In-App module is responsible for in-app campaigns.

* [x] Automatic display of in-app campaigns configured in the platform.
* [x] In-App subscription management: subscribe and unsubscribe.
* [x] Placement requests, current screen matching, and custom triggers.
* [x] In-app view animation customization (fade, offset, scale per campaign).
* [x] Native event message catalog (`moduleEvents`).

---

## Dependencies

Altcraft React Native SDK packages are published on npm. The SDK is modular; the umbrella package provides the full `AltcraftSDK` API over the module packages.

| Package | Description |
|---|---|
| [@altcraft/react-native-sdk](packages/altcraft) | Umbrella package with the full SDK API |
| [@altcraft/core](packages/altcraft-core) | Core: initialization, events, authentication |
| [@altcraft/push](packages/altcraft-push) | Push subscriptions, tokens, providers |
| [@altcraft/inapp](packages/altcraft-inapp) | In-App campaigns, placements, screens, triggers |
| [@altcraft/target](packages/altcraft-target) | Target events and UTM |
| [@altcraft/profile](packages/altcraft-profile) | Profile fields |

Install the full SDK:

```sh
npm install @altcraft/react-native-sdk
```

To use only a subset of the modules, install the required packages. The `@altcraft/core` package must be listed as a direct dependency because the other modules build on it.

---

## Authorization Types

### JWT-Authorization (recommended approach)

JWT is added to the header of every request. The SDK requests the current token from the app through the JWT provider registered in the SDK.

**Advantages:**

* Enhanced security of API requests.
* Profile lookup by any identifier (email, phone, custom ID).
* Support for multiple users on a single device.
* Profile persists after app reinstallation.
* Unified user identity across devices.

### Authorization with a role token (*rToken*)

The role token is specified in the SDK configuration.
Profile lookup is limited to the push token identifier.

**Limitations:**

* The link to a profile may be lost if the push token changes and the change isn't reflected on the platform.
* No multi-profile support.
* It's not possible to register the same user on another device.

---

## Requirements

* React Native 0.75+.
* Android 7.1+ (API 25).
* iOS 13.0+.
* A configured push provider (Firebase, Huawei, RuStore on Android; APNs on iOS) when using the Push module.

---

## Documentation

Detailed information on SDK setup, functionality, and usage is available on the Altcraft documentation portal:

- [**Altcraft React Native SDK**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/)

---

## License

### EULA

The SDK is distributed under the Altcraft End User License Agreement. See [LICENSE](LICENSE) for the full text.

Copyright © 2026 Altcraft LLC. All rights reserved.
