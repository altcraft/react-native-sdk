# Altcraft React Native SDK — In-App

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg) [![React Native](https://img.shields.io/badge/React_Native-0.75%2B-blue?style=flat-square)](https://reactnative.dev/) [![Platforms](https://img.shields.io/badge/Platforms-Android_iOS-green?style=flat-square)](#) [![npm](https://img.shields.io/npm/v/@altcraft/inapp.svg?style=flat-square)](https://www.npmjs.com/package/@altcraft/inapp)

Altcraft React Native SDK is a library for interacting with the **Altcraft Marketing Platform**. The **In-App** package is one of its modular components.

---

## In-App

The In-App module is responsible for in-app campaigns.

- [x] Automatic display of in-app campaigns configured in the platform.
- [x] In-App subscription management: subscribe and unsubscribe.
- [x] Placement requests, current screen matching, and custom triggers.
- [x] JSON in-app campaign emission to an external subscriber.
- [x] In-app view animation customization (fade, offset, scale per campaign).
- [x] JSON content subscription (`jsonContent`).
- [x] Native event message catalog (`moduleEvents`).

---

## Dependencies

Add the **In-App** package, Core, and Push to your React Native application:

```sh
npm install @altcraft/inapp @altcraft/core @altcraft/push
```

---

## Requirements

- React Native 0.75+ (tested with 0.81.1).
- Android 7.1+ (API 25).
- iOS 13.0+.
