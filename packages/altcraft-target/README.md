# Altcraft React Native SDK — Target

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg) [![React Native](https://img.shields.io/badge/React_Native-0.75%2B-blue?style=flat-square)](https://reactnative.dev/) [![Platforms](https://img.shields.io/badge/Platforms-Android_iOS-green?style=flat-square)](#) [![npm](https://img.shields.io/npm/v/@altcraft/target.svg?style=flat-square)](https://www.npmjs.com/package/@altcraft/target)

Altcraft React Native SDK is a library for interacting with the **Altcraft Marketing Platform**. The **Target** package is one of its modular components.

---

## Target

The Target module is responsible for mobile events: it sends target events to the platform to record goal achievements.

- [x] Sending target events (goal conversions) from the app.
- [x] Attaching event payloads, matching parameters, profile fields, and channel subscriptions to a target event.
- [x] Attaching UTM tags to target events for attribution.
- [x] `sendTarget` entry point matching the native SDKs.
- [x] Native event message catalog (`moduleEvents`).

---

## Dependencies

Add the **Target** package, Core, and Push to your React Native application:

```sh
npm install @altcraft/target @altcraft/core @altcraft/push
```

---

## Requirements

- React Native 0.75+ (tested with 0.81.1).
- Android 7.1+ (API 25).
- iOS 13.0+.
