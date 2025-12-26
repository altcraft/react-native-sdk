# Altcraft React Native SDK (Android)

![Altcraft SDK Logo](https://guides.altcraft.com/img/logo.svg)

[![npm version](https://img.shields.io/npm/v/altcraft-react-native-sdk?style=flat-square)](https://www.npmjs.com/package/altcraft-react-native-sdk)
[![npm downloads](https://img.shields.io/npm/dm/altcraft-react-native-sdk?style=flat-square)](https://www.npmjs.com/package/altcraft-react-native-sdk)
[![React Native](https://img.shields.io/badge/React%20Native-0.70%2B-blue?style=flat-square)](#)
[![Platforms](https://img.shields.io/badge/Platform-Android-green?style=flat-square)](#)
[![Push](https://img.shields.io/badge/Push-Firebase%20FCM%20%7C%20Huawei%20HMS%20%7C%20RuStore-green?style=flat-square)](#)

Altcraft React Native SDK is a bridge to the native **Altcraft Mobile SDK** for Android.
It helps manage push subscriptions, tokens, SDK events, and sending mobile events to the Altcraft platform.

> This README intentionally covers **Android only** (no iOS setup here).

---

## Features

- Push subscription management:
  - `pushSubscribe`
  - `pushSuspend`
  - `pushUnSubscribe`
  - `getStatus...` APIs
- Push token management:
  - get current token (`getPushToken`)
  - set/delete token, force update, provider priority list
- JWT support (`setJwt`)
- Mobile events (`mobileEvent`)
- SDK event stream from native to JS (`subscribeToEvents`)
- Push intake forwarding (`takePush`) to native SDK

---

## Requirements

- React Native: depends on your RN version and New Architecture setup (TurboModules).
- Android:
  - `minSdk` and `compileSdk` depend on your app configuration
  - Push provider integrated in the host app (FCM / HMS / RuStore)

---

## Installation

```sh
yarn add altcraft-react-native-sdk
# or
npm i altcraft-react-native-sdk
