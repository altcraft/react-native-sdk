# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces). It contains the following packages:

- The SDK packages in the `packages/` directory.
- An example app in the `example/` directory.

To get started with the project, make sure you have the correct version of [Node.js](https://nodejs.org/) installed. See the [`.nvmrc`](./.nvmrc) file for the version used in this project.

Run `npm install` in the root directory to install the required dependencies for each package:

```sh
npm install
```

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or Xcode to edit the native code, you can open the `example/android` or `example/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `example/ios/SdkExample.xcworkspace` in Xcode and find the source files at `Pods > Development Pods > react-native-sdk`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `react-native-sdk` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
cd example && npm start
```

To run the example app on Android:

```sh
cd example && npm run android
```

To run the example app on iOS:

```sh
cd example && npm run ios
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "SdkExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

Make sure your code passes TypeScript:

```sh
npm run typecheck
```

## Building and packaging

Each published package is compiled with [react-native-builder-bob](https://github.com/callstack/react-native-builder-bob). The generated `lib/` directories are not committed.

Build all packages in dependency order (core, push, inapp, target, profile, umbrella):

```sh
npm run build
```

To inspect what would be published for a package:

```sh
npm pack --workspace @altcraft/core --dry-run
```

## Releasing

The release script publishes packages in dependency order. It runs a dry run by default:

```sh
npm run release
```

To publish to npm (maintainers only):

```sh
npm run release:publish
```

The script builds all packages before publishing and stops on the first failure. Native SDK versions are pinned in the podspecs (`ios-sdk` `2.0.1`) and Gradle files (`android-sdk-*` `1.0.1`); changing them is a separate release decision.

## Example app and umbrella autolinking

The umbrella package `@altcraft/react-native-sdk` ships a `postinstall` step that adds the installed `@altcraft/*` modules to the consumer application's `react-native.config.js`. Set `ALTCRAFT_SKIP_AUTOLINK=1` to opt out. In this monorepo the step is skipped because the example app depends on the module packages directly.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that `npm run typecheck` and `npm run build` pass.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
