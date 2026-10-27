# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started with the project, make sure you have the correct version of [Node.js](https://nodejs.org/) installed. See the [`.nvmrc`](./.nvmrc) file for the version used in this project.

Run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development without manually migrating.

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

To run the example app on Web:

```sh
yarn example web
```

Make sure your code passes TypeScript:

```sh
yarn typecheck
```

To check for linting errors, run the following:

```sh
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

and in several time zones:

```sh
yarn test:tz
```

### Example app

The [example app](/example/) is an Expo app with one demo per feature (each shows its current value). It imports the library from `src/`, so changes show up without a rebuild. Run it in Expo Go with `yarn example start`. To check that it bundles for both platforms:

```sh
yarn example expo export --platform ios --platform android
```



### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with [ESLint](https://eslint.org/).
- `yarn test`: run unit tests with [Jest](https://jestjs.io/).
- `yarn test:tz`: run the unit tests four times, under `TZ=UTC`, `Asia/Kolkata`, `America/Los_Angeles` and `Pacific/Auckland`. Date code is easy to break for zones east or west of UTC, so run this before sending a change; CI runs it too.
- `yarn prepare`: build the package with [react-native-builder-bob](https://github.com/callstack/react-native-builder-bob) into `lib/` (CommonJS, ES modules and type definitions).
- `scripts/scrub-check.sh`: fail if any tracked file mentions names from the code this package was extracted from (CI runs it).
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.
- `yarn example web`: run the example app on Web.
- `yarn example build:web`: build the example app for Web.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

### Releasing

Releases are published to npm by the `Release` workflow (`.github/workflows/release.yml`) when a GitHub release is published. It runs the same checks as CI, then `npm publish --provenance --access public`.

The workflow signs in to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers), so no npm token is stored. On npmjs.com, the package's Settings → Trusted Publisher lists this repository and the `release.yml` workflow. The private scrub terms go in the `SCRUB_PATTERNS` repository secret (Settings → Secrets and variables → Actions). Provenance needs the repository to be public.

To release:

1. On a branch, update `version` in `package.json` and add a dated section for it to `CHANGELOG.md`. Merge it into `main` once CI passes.
2. Releases → Draft a new release → create the tag `vX.Y.Z` on `main`.
3. Write the release notes: the highlights of the version, then a link to its `CHANGELOG.md` section. Publish the release. That starts the `Release` workflow.
4. Check that the new version shows on https://www.npmjs.com/package/rn-grid-date-time-picker.

### Live demo (Expo Snack)

Snack installs packages from npm, so the demo can only be made after a version is published.

1. Open https://snack.expo.dev, sign in, and pick the newest Expo SDK it offers.
2. Replace `App.js` with `example/src/App.tsx` (rename it `App.tsx`), and add the `example/src/playground/` folder next to it (`config.ts`, `fixtures.tsx`, `ui.tsx`, `CodeSheet.tsx`). Snack adds the imported packages (`rn-grid-date-time-picker`, `expo-font`, `@expo-google-fonts/inter`, `expo-status-bar`, `expo-clipboard`, `react-native-safe-area-context`) to its dependencies; check that `rn-grid-date-time-picker` is at the published version.
3. Run it on the iOS, Android and Web previews, then save it as public with a name like `rn-grid-date-time-picker`.
4. Put the Snack's URL in the "Live demo" link at the top of `README.md` and uncomment it.

