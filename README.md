# Altcraft React Native SDK

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg)

[![npm version](https://img.shields.io/npm/v/react-native-sdk?style=flat-square)](https://www.npmjs.com/package/react-native-sdk)
[![React Native](https://img.shields.io/badge/React_Native-0.70%2B-blue?style=flat-square)](https://reactnative.dev/)
[![Platforms](https://img.shields.io/badge/Platforms-Android_%7C_iOS-green?style=flat-square)](#)
[![Push Providers](https://img.shields.io/badge/Push-FCM_%7C_APNs-orange?style=flat-square)](#)

Altcraft React Native SDK is a bridge to the native **Altcraft Mobile SDK** for Android and iOS. The SDK automates push notification delivery, event submission, request retries, and supports flexible workflows with JWT or role-based tokens.

---

## Features

* [x] Compatible with TypeScript and JavaScript.
* [x] Works with anonymous and registered users; supports multiple profiles on one device (JWT).
* [x] Push subscription management: push subscribe, push suspend, push unsubscribe.
* [x] Automatic push token update when it changes.
* [x] Automatic transmission of notification delivery and open events.
* [x] Mobile events registration.
* [x] Update profile fields.
* [x] Automatic retry of failed requests.
* [x] Support for push providers: Firebase FCM (Android), APNs (iOS).
* [x] Secure requests using JWT and flexible identifier matching.
* [x] Support for rToken for simple subscription scenarios.
* [x] SDK data cleanup and background tasks termination.

---

## Dependency

`react-native-sdk:0.0.5`

---

## Authorization Types

### JWT-Authorization (recommended approach)

JWT is added to the header of every request. The SDK requests the current token from the app via the `JWTInterface`.

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

* React Native 0.70+.
* Android 7.1+ (API 25).
* iOS 13.0+.
* Push provider integrated in the host app (FCM for Android, APNs for iOS).

---

## Documentations

Detailed information on SDK setup, functionality, and usage is available on the Altcraft documentation portal. You can navigate to the required section using the links below:

- [**Quick Start**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/quick-start)
- [**SDK Functionality**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/functionality)
- [**SDK Configuration**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/setup)
- [**Classes and Structures**](https://guides.altcraft.com/en/developer-guide/sdk/mobile/react-native/api)

**Provider Setup**

- [FCM](https://guides.altcraft.com/en/developer-guide/sdk/mobile/android/providers/fcm/)
- [APNs](https://guides.altcraft.com/en/developer-guide/sdk/mobile/ios/providers/apns/)

---

## License

### EULA

END USER LICENSE AGREEMENT

Copyright © 2024 Altcraft LLC. All rights reserved.

1. LICENSE GRANT
   This agreement grants you certain rights to use the Altcraft Mobile SDK (hereinafter referred to as the "Software").
   All rights not expressly granted by this agreement remain with the copyright holder.

2. USE
   You are permitted to use and distribute the Software for both commercial and non-commercial purposes.

3. MODIFICATION WITHOUT PUBLICATION
   You may modify the Software for your own internal purposes without any obligation to publish such modifications.

4. MODIFICATION WITH PUBLICATION
   Publication of modified Software requires prior written permission from the copyright holder.

5. DISCLAIMER OF WARRANTIES
   The Software is provided "as is," without any warranties, express or implied, including but not limited to
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

### Third-party libraries and licenses

  **Apache License 2.0**
Licensed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

* [React Native](https://github.com/facebook/react-native)
* [TypeScript](https://www.typescriptlang.org/)

**MIT License**

* [React](https://github.com/facebook/react)
