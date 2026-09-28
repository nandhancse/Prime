# Android build guide

PRime's Android package ID is fixed as:

```text
com.prime.workout
```

Changing it later requires new Google Android OAuth credentials.

The first release is `versionName 1.0.0`, `versionCode 1`. Increment
`versionCode` for every future release, even when only `versionName` changes.

## Requirements

- Node.js and npm
- Android Studio with Android SDK 36
- JDK 21 (the current Gradle wrapper does not run with JDK 25)

Select JDK 21 under Android Studio's **Gradle JDK** setting or set `JAVA_HOME`
for the terminal before running Gradle. On this workstation the compatible JDK
is `C:\Users\user\.jdks\jbr-21.0.11`.

For local browser development, Vite reads `frontend/.env.development` and uses
the local `/api/` proxy. For an Android build, set the production values in the
shell that runs Vite:

```powershell
cd frontend
$env:VITE_API_BASE_URL="https://your-backend.example/api/"
$env:VITE_GOOGLE_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
```

The URL must be the deployed HTTPS Django API and include `/api/`. Never use
`localhost`, `127.0.0.1`, or `10.0.2.2` in a distributable APK.

## Development sync

```powershell
cd frontend
npm install
npm run build
npx cap sync android
```

Run those commands after every web build that should be copied into Android.
You can confirm the URL was embedded with:

```powershell
rg "your-backend.example" android\app\src\main\assets\public
```

## Open Android Studio

```powershell
cd frontend
npx cap open android
```

Allow Gradle to finish syncing before building.

## Debug APK

In Android Studio choose **Build → Build APK(s)**, or run:

```powershell
cd frontend\android
.\gradlew.bat assembleDebug
```

The debug APK is created at:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## Release APK

Generate the private release key once. Choose and securely store your own
passwords when `keytool` prompts:

```powershell
keytool -genkeypair -v -keystore prime-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias prime
```

Copy `frontend/android/key.properties.example` to
`frontend/android/key.properties` and fill in the four values. `storeFile` is
relative to `frontend/android/`, so the example expects the key there. Both
files are ignored by Git.

```powershell
cd frontend\android
.\gradlew.bat assembleRelease
```

The signed output should be:

```text
frontend/android/app/build/outputs/apk/release/app-release.apk
```

Keep the keystore and passwords backed up securely. Never commit `.jks`,
`.keystore`, `key.properties`, signing passwords, or `local.properties`.
Losing this key can prevent future PRime versions from updating an existing
installation.

If `key.properties` is absent, debug builds still work and release builds are
not signed for distribution.

## Install on a phone

Enable installation from the file/browser app used to open the APK, then open
`prime-v1.0.0.apk`. Android normally warns when installing an APK distributed
outside Google Play. Only proceed with an APK you built or downloaded from the
official PRime GitHub Release.

## Icon and splash

Development builds currently use Capacitor's generated default artwork. Read
`frontend/resources/README.md` for the source images needed before a public
release. Missing custom artwork does not block a debug APK.
