# Altcraft React Native SDK

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg)

[![npm version](https://img.shields.io/npm/v/altcraft-react-native-sdk?style=flat-square)](https://www.npmjs.com/package/@altcraft/altcraft-react-native-sdk)
[![npm downloads](https://img.shields.io/npm/dm/altcraft-react-native-sdk?style=flat-square)](https://www.npmjs.com/package/@altcraft/altcraft-react-native-sdk)
[![React Native](https://img.shields.io/badge/React%20Native-0.70%2B-blue?style=flat-square)](#)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20iOS-green?style=flat-square)](#)
[![Push Providers](https://img.shields.io/badge/Push-APNs%20%7C%20FCM%20%7C%20HMS%20%7C%20RuStore-orange?style=flat-square)](#)

Altcraft React Native SDK is a React Native bridge for the native **Altcraft Mobile SDK** on iOS and Android. It provides a unified API for push subscription management, token handling, user authorization, and mobile event tracking in the **Altcraft Marketing platform**.

---

## Features

* [x] Works on iOS and Android.
* [x] Push subscription management: subscribe, suspend, unsubscribe.
* [x] Push token management and provider priority setup.
* [x] JWT-based authorization support.
* [x] Mobile events registration.
* [x] Native-to-JS SDK event stream subscription.
* [x] Forwarding of push intake payloads to the native SDK.

---

## Requirements

* React Native 0.70+.
* iOS 13.0+.
* Android 7.1+ (API 25).
* Push provider SDK integrated in the host app:
  * iOS: APNs (optionally Firebase/Huawei if used in your setup).
  * Android: Firebase FCM / Huawei HMS / RuStore.

---

## Installation

```sh
yarn add altcraft-react-native-sdk
# or
npm i altcraft-react-native-sdk
```

---

## Authorization Types

### JWT-Authorization (recommended approach)

JWT is added to the header of every request. The SDK receives the current token from the app and applies it to native requests.

**Advantages:**

* Enhanced security of API requests.
* Profile lookup by any identifier (email, phone, custom ID).
* Support for multiple users on a single device.
* Profile persists after app reinstallation.
* Unified user identity across devices.

### Authorization with a role token (rToken)

The role token is configured on the native side.

**Limitations:**

* Profile lookup is limited to the push token identifier.
* No multi-profile support.
* It’s not possible to register the same user on another device.

---

## Documentation

Detailed information on SDK setup, functionality, and usage is available on the Altcraft documentation portal:

* [**Quick Start**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/quick-start)
* [**SDK Functionality**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/functionality)
* [**SDK Configuration**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/setup)
* [**API Reference**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/api)

---

## License

### EULA

END USER LICENSE AGREEMENT

Copyright © 2024 Altcraft LLC. All rights reserved.

1. LICENSE GRANT
   This agreement grants you certain rights to use the Altcraft Mobile SDK (hereinafter referred to as the “Software”).
   All rights not expressly granted by this agreement remain with the copyright holder.

2. USE
   You are permitted to use and distribute the Software for both commercial and non-commercial purposes.

3. MODIFICATION WITHOUT PUBLICATION
   You may modify the Software for your own internal purposes without any obligation to publish such modifications.

4. MODIFICATION WITH PUBLICATION
   Publication of modified Software requires prior written permission from the copyright holder.

5. DISCLAIMER OF WARRANTIES
   The Software is provided “as is,” without any warranties, express or implied, including but not limited to
   warranties of merchantability, fitness for a particular purpose, and non-infringement of third-party rights.

6. LIMITATION OF LIABILITY
   Under no circumstances shall the copyright holder be liable for any direct, indirect, incidental, special,
   punitive, or consequential damages (including but not limited to: procurement of substitute goods or services;
   loss of data, profits, or business interruption) arising in any way from the use of this Software,
   even if the copyright holder has been advised of the possibility of such damages.

7. DISTRIBUTION
   When distributing the Software, you must provide all recipients with a copy of this license agreement.

8. COPYRIGHT AND THIRD-PARTY COMPONENTS
   This Software may include components distributed under other licenses. The full list of such components
   and their respective licenses is provided below:

Apache License 2.0

* [React Native](https://reactnative.dev)
* [Swift](https://swift.org)
* [Kotlin](https://kotlinlang.org)
