# Building Tisk — APK & IPA

This doc covers producing release builds for Android (APK/AAB) and iOS (IPA) using **EAS Build** (the recommended Expo path) and the **local** build alternative for when you need a binary without an Expo account.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node ≥ 18 | `node -v` |
| Expo CLI | `npm install -g expo-cli` |
| EAS CLI | `npm install -g eas-cli` |
| Expo account | [expo.dev](https://expo.dev) — free tier works |
| Android: Java 17 + Android SDK | Required for local builds only |
| iOS: Xcode 15+ on macOS | Required for local builds and IPA signing |

---

## One-time setup

```bash
# Log in to Expo
eas login

# Initialize EAS in the project (creates eas.json)
eas build:configure
```

`eas build:configure` writes an `eas.json` at the repo root. The default looks like:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## Android — APK / AAB

### EAS cloud build (recommended)

```bash
# AAB (required for Play Store)
eas build --platform android --profile production

# APK (for direct install / testing)
eas build --platform android --profile preview
```

To force an APK instead of AAB on any profile, add `"android": { "buildType": "apk" }` to the profile in `eas.json`:

```json
"preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  }
}
```

The build runs in the cloud. When it finishes EAS prints a download URL. You can also find it at **expo.dev → your project → Builds**.

### Local build (no EAS account needed)

```bash
# Generates the native android/ directory first
npx expo prebuild --platform android --clean

# Debug APK
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Release APK (requires a keystore — see signing below)
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk

# Release AAB
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

#### Android signing (release only)

Generate a keystore once and keep it out of git:

```bash
keytool -genkeypair -v \
  -keystore tisk-release.keystore \
  -alias tisk \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Then in `android/gradle.properties`:

```
MYAPP_RELEASE_STORE_FILE=tisk-release.keystore
MYAPP_RELEASE_KEY_ALIAS=tisk
MYAPP_RELEASE_STORE_PASSWORD=<your-password>
MYAPP_RELEASE_KEY_PASSWORD=<your-password>
```

And in `android/app/build.gradle` under `android > signingConfigs`:

```groovy
release {
    storeFile file(MYAPP_RELEASE_STORE_FILE)
    storePassword MYAPP_RELEASE_STORE_PASSWORD
    keyAlias MYAPP_RELEASE_KEY_ALIAS
    keyPassword MYAPP_RELEASE_KEY_PASSWORD
}
```

---

## iOS — IPA

> **macOS required** for all iOS builds (EAS cloud runs on macOS workers; local builds need Xcode locally).

### EAS cloud build (recommended)

```bash
# Production IPA (App Store / TestFlight)
eas build --platform ios --profile production

# Ad-hoc IPA for internal testers (no App Store)
eas build --platform ios --profile preview
```

EAS handles provisioning profiles and certificates automatically when you follow the prompts. For the first build it will ask to create or reuse credentials stored in your Expo account.

### Local build (macOS only)

```bash
# Generate the native ios/ directory
npx expo prebuild --platform ios --clean

# Open in Xcode to configure signing, then archive
open ios/tisk.xcworkspace
```

In Xcode:

1. Select the **tisk** target → **Signing & Capabilities**.
2. Set your **Team** and ensure **Automatically manage signing** is on (or supply your own provisioning profile).
3. Choose **Product → Archive**.
4. In the Organizer, click **Distribute App** → follow the wizard to export an IPA.

For CI / scripted export without opening Xcode:

```bash
xcodebuild -workspace ios/tisk.xcworkspace \
  -scheme tisk \
  -configuration Release \
  -archivePath build/tisk.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/tisk.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ios/ExportOptions.plist
# IPA is at build/ipa/tisk.ipa
```

`ExportOptions.plist` controls the export method (`app-store`, `ad-hoc`, `development`, `enterprise`). A minimal ad-hoc example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>         <string>ad-hoc</string>
  <key>teamID</key>         <string>YOUR_TEAM_ID</string>
  <key>compileBitcode</key> <false/>
</dict>
</plist>
```

---

## Bundle identifiers

Before submitting to a store, replace the placeholder identifiers in `app.json`:

```json
"ios": {
  "bundleIdentifier": "com.yourcompany.tisk"
},
"android": {
  "package": "com.yourcompany.tisk"
}
```

The current value `com.anonymous.tisk` will be rejected by both stores.

---

## Submitting to stores

```bash
# Submit the latest EAS build to Google Play
eas submit --platform android --latest

# Submit the latest EAS build to App Store Connect
eas submit --platform ios --latest
```

Both commands require store credentials configured in `eas.json` under the `submit` key (service account JSON for Google Play; App Store Connect API key for Apple).

---

## Quick reference

| Goal | Command |
|------|---------|
| Android APK (cloud) | `eas build -p android --profile preview` |
| Android AAB for Play Store (cloud) | `eas build -p android --profile production` |
| iOS IPA for TestFlight (cloud) | `eas build -p ios --profile production` |
| Both platforms at once | `eas build --platform all --profile production` |
| Local Android debug APK | `npx expo prebuild && cd android && ./gradlew assembleDebug` |
| Submit Android to Play | `eas submit -p android --latest` |
| Submit iOS to App Store | `eas submit -p ios --latest` |
