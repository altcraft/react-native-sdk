# Altcraft React Native SDK Example

Example app for local development of `@altcraft/react-native-sdk`.

## Requirements

- Node.js 20+
- Yarn 4.11.0 via Corepack
- Android Studio / Android SDK for Android
- Xcode and CocoaPods for iOS

## Install

Run from the repository root:

```sh
yarn install
```

## Start Metro

```sh
yarn example start
```

## Run Android

In a second terminal, run from the repository root:

```sh
yarn example android
```

## Run iOS

In a second terminal, run from the repository root:

```sh
yarn example ios
```

If CocoaPods are not installed yet, run once:

```sh
cd example/ios
bundle install
bundle exec pod install
cd ../..
yarn example ios
```
