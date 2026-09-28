# Publish an APK with GitHub Releases

Do not commit APK files into the normal source tree. Use a GitHub Release asset.

## Manual signed-release flow

1. Set the production API URL and Google Web client ID, then rebuild and sync.
2. Build a signed release APK with `gradlew.bat assembleRelease`.
3. Verify that `app-release.apk` exists, is non-empty, and is signed.
4. Install and test that release APK on a physical Android phone.
5. Commit and push the matching source.
6. Create and push the `v1.0.0` tag.
7. Open **GitHub → Releases → Draft a new release** and select the tag.
8. Rename the tested APK to:

   ```text
   prime-v1.0.0.apk
   ```

   A Git-ignored staging copy can be created with:

   ```powershell
   New-Item -ItemType Directory -Force frontend\release
   Copy-Item frontend\android\app\build\outputs\apk\release\app-release.apk frontend\release\prime-v1.0.0.apk
   ```

9. Upload the APK as a release asset.
10. Publish the release.

Users can then download the APK from the repository's Releases page.
Android may warn that the file came from outside Google Play. That is normal
for a GitHub-distributed APK; users should install only from the official
repository release page.

Keep the signing keystore private and backed up. Losing it may prevent future
updates from installing over the existing app.

## Automated debug artifact

The optional `android-debug.yml` workflow builds an unsigned/debug APK when run
manually. It uploads `app-debug.apk` as a workflow artifact for testing. It does
not publish or sign a production release.
