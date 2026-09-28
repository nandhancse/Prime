# Google login setup

PRime uses Google Identity Services in browsers and Android Credential Manager
inside the Capacitor app. Both flows send a Google ID token to Django. Django
verifies it and returns PRime access and refresh tokens.

No Google password or Google access token is stored by PRime.

## A. Create a Google Cloud project

1. Open the Google Cloud Console.
2. Create or select a project for PRime.
3. Open **Google Auth Platform**.

Keep development and production credentials in the same project only if that
matches your release process. Never paste client IDs into source files.

## B. Configure branding and audience

1. Set the app name to **PRime**.
2. Choose **External** as the audience.
3. Add a support email and developer contact email.
4. While the app is in testing, add the Google accounts that may sign in.
5. Complete Google's verification steps before a public release if requested.

PRime requests basic identity only; it does not request Drive, Calendar, or
other Google API scopes.

## C. Create the Web OAuth client

Create an OAuth client of type **Web application**.

Add authorized JavaScript origins for the environments that render the web
button, for example:

```text
http://localhost:5173
https://your-web-domain.example
```

Put this Web client ID in:

```text
frontend/.env.local
VITE_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

The same Web client ID is passed to Android Credential Manager as its
`serverClientId`, as required by Google's current Android documentation.

Configure Django with the same trusted audience:

```text
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## D. Create the Android OAuth client

Create a second OAuth client of type **Android** with:

```text
Package name: com.prime.workout
```

Google also requires the signing certificate SHA-1. For the standard debug
keystore on Windows, run:

```powershell
keytool -list -v -alias androiddebugkey -keystore "$env:USERPROFILE\.android\debug.keystore" -storepass android -keypass android
```

You can also run the Gradle signing report after Java and the Android SDK are
installed:

```powershell
cd frontend\android
.\gradlew.bat signingReport
```

If `java` is not on PATH but Android Studio is installed in its default Windows
location, run:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat signingReport
```

Copy only the SHA-1 fingerprint into Google Cloud. Do not commit a keystore.

Release APKs use the release-signing certificate, whose SHA-1 is normally
different from the debug certificate. Create an additional Android OAuth
client for the release SHA-1 when necessary. Debug and release Android OAuth
credentials may both be required.

To inspect the release certificate after creating the keystore:

```powershell
keytool -list -v -keystore prime-release-key.jks -alias prime
```

The Android client identifies the package/signing pair. Credential Manager
still requests a server ID token using the Web client ID. Django supports an
additional explicitly trusted Android audience through:

```text
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

Only configured client IDs are accepted by the backend.

## E. Configure Django

Set these environment variables in the environment that runs Django:

```text
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

For local PowerShell development:

```powershell
$env:GOOGLE_WEB_CLIENT_ID="your-web-client-id.apps.googleusercontent.com"
$env:GOOGLE_ANDROID_CLIENT_ID="your-android-client-id.apps.googleusercontent.com"
```

Then restart Django. A missing client ID intentionally makes Google login fail
closed. Username/password registration and login remain available.

## Verify the setup

1. Start Django and the Vite frontend.
2. Open `/login` in the browser.
3. Confirm Google's rendered **Continue with Google** button appears.
4. Sign in with an allowed test account.
5. Confirm PRime redirects to the dashboard.
6. Repeat on an Android debug build made with the registered debug SHA-1.
7. Before publishing, repeat with the signed release APK and its release SHA-1.

Google Identity Services does not support authentication inside ordinary
WebViews, so the Android app uses its native Credential Manager bridge instead
of trying to run the browser button in the WebView.
