# Altcraft React Native SDK — Full SDK

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg) [![React Native](https://img.shields.io/badge/React_Native-0.75%2B-blue?style=flat-square)](https://reactnative.dev/) [![Platforms](https://img.shields.io/badge/Platforms-Android_iOS-green?style=flat-square)](#) [![npm](https://img.shields.io/npm/v/@altcraft/react-native-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@altcraft/react-native-sdk)

Altcraft React Native SDK is a library for interacting with the **Altcraft Marketing Platform**. The **Full SDK** package combines all modular components into a single dependency.

---

## SDK Modules

The `@altcraft/react-native-sdk` package includes:

- **Core**: SDK initialization, authentication, events, and data management.
- **Push**: push subscriptions, tokens, providers, and notification events.
- **In-App**: in-app subscriptions, placements, screens, triggers, and JSON content.
- **Target**: target events with payload, matching, subscriptions, and UTM data.
- **Profile**: profile field updates.
- All modules expose their native event catalog through the module event catalog (`moduleEvents`).

---

## Dependencies

Add the **Full SDK** package to your React Native application:

```sh
npm install @altcraft/react-native-sdk
```

The package includes all modules and links the native Altcraft SDK components automatically. To depend only on the modules used by the application, use the individual `@altcraft/*` packages instead.

---

## Requirements

- React Native 0.75+ (tested with 0.81.1).
- Android 7.1+ (API 25).
- iOS 13.0+.
- A configured push provider (Firebase, Huawei, RuStore on Android; APNs on iOS) when using the Push module.
