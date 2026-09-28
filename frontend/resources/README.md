# Android artwork

No final PRime artwork is available yet, so the generated Android project keeps
Capacitor's default icon and splash assets for development builds.

Before a public release, provide:

- `icon-only.png`: square 1024 × 1024 PNG, transparent or solid background, no rounded corners.
- `splash.png`: square 2732 × 2732 PNG with the logo centered inside the safe area.

Generate Android assets from those source files with the official Capacitor
assets tool, then review every density in Android Studio before signing a release.
