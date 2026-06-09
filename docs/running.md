# Running Tisk with Expo

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — install globally:
  ```bash
  npm install -g expo-cli
  ```
- **For iOS:** macOS with Xcode installed (App Store), and an iOS simulator or physical device
- **For Android:** Android Studio with an emulator set up, or a physical device with USB debugging enabled
- **For physical devices:** Install the [Expo Go](https://expo.dev/go) app on your phone

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Set Up Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_API_URL=https://<your-project>.supabase.co/functions/v1/rapid-task
EXPO_PUBLIC_SUPABASE_KEY=sb_publishable_...
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 3. Start the Dev Server

```bash
npx expo start
```

This opens the Expo developer menu in your terminal. From here you can press:

| Key | Action |
|-----|--------|
| `a` | Open on Android emulator / device |
| `i` | Open on iOS simulator / device |
| `w` | Open in web browser |
| `r` | Reload the app |
| `m` | Toggle the in-app developer menu |

---

## 4. Running on iOS

### iOS Simulator (macOS only)

```bash
npx expo run:ios
```

Or press `i` in the Expo dev server terminal after running `npx expo start`.

> Requires Xcode and the iOS Simulator. First run will take a few minutes to build.

### Physical iPhone

1. Install **Expo Go** from the App Store
2. Run `npx expo start`
3. Scan the QR code shown in the terminal with your iPhone camera

---

## 5. Running on Android

### Android Emulator

1. Open **Android Studio → Virtual Device Manager** and start an emulator
2. Then run:
   ```bash
   npx expo run:android
   ```
   Or press `a` in the Expo dev server terminal.

### Physical Android Device

1. Enable **Developer Options** and **USB Debugging** on your device
2. Connect via USB
3. Run `npx expo run:android` — it will detect the device automatically

### Expo Go (no build required)

1. Install **Expo Go** from the Play Store
2. Run `npx expo start`
3. Scan the QR code with the Expo Go app

---

## 6. Development Tips

**Type checking:**
```bash
npx tsc --noEmit
```

**Linting:**
```bash
npx expo lint
```

**Clear Metro bundler cache** (if you hit stale module errors):
```bash
npx expo start --clear
```

**Reset the project to a clean state:**
```bash
npm run reset-project
```

---

## 7. Supabase Edge Functions (local dev)

To run the backend edge function locally:

```bash
# Requires Docker
npx supabase start

# Serve the function locally
npx supabase functions serve rapid-task --env-file .env.local
```

Update `EXPO_PUBLIC_API_URL` in `.env` to point at `http://localhost:54321/functions/v1/rapid-task` while developing locally.

To deploy to remote Supabase:
```bash
npx supabase functions deploy rapid-task
```
