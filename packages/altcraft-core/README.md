# Altcraft React Native SDK — Core

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg) [![React Native](https://img.shields.io/badge/React_Native-0.75%2B-blue?style=flat-square)](https://reactnative.dev/) [![Platforms](https://img.shields.io/badge/Platforms-Android_iOS-green?style=flat-square)](#) [![npm](https://img.shields.io/npm/v/@altcraft/core.svg?style=flat-square)](https://www.npmjs.com/package/@altcraft/core)

Altcraft React Native SDK is a library for interacting with the **Altcraft Marketing Platform**. The **Core** package is one of its modular components.

---

## Core

The Core module is the foundation of the SDK: it connects your application to the Altcraft platform and makes the optional modules available.

- [x] SDK initialization and configuration.
- [x] Authentication with JWT or a role token (**RToken**).
- [x] Works with anonymous and registered users; supports multiple profiles on one device (JWT).
- [x] Transmission of requests to the platform with automatic retry of failed requests.
- [x] SDK event stream for monitoring SDK behavior in the app.
- [x] Native event message catalog per module (`moduleEvents`).
- [x] SDK data cleanup and background tasks termination.

---

## Dependencies

Add the **Core** package to your React Native application:

```sh
npm install @altcraft/core
```

---

## Requirements

- React Native 0.75+ (tested with 0.81.1).
- Android 7.1+ (API 25).
- iOS 13.0+.
