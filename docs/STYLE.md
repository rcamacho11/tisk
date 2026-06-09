# Style Guide

## Styling Approach

All styles use `StyleSheet.create` — no CSS-in-JS libraries, no NativeWind, no Tamagui. Styles are co-located with the screen file they belong to, defined at the bottom of each file.

## Color Palette

The app has two color systems that are not fully unified:

**Feature/brand colors** (used directly in screens):
| Usage | Hex |
|---|---|
| Primary action / success / tasks green | `#4CAF50` |
| iOS blue / links / profile screen primary | `#007AFF` |
| Danger / delete / high priority | `#ff6b6b` |
| Medium priority / warning | `#ffa500` |
| Low priority | `#4CAF50` (same as primary) |
| Borders / placeholders / secondary text | `#ddd` / `#888` / `#999` |
| Overdue text | `#ff6b6b` |
| Friend accepted | `#34C759` |
| Friend rejected | `#FF3B30` |

**Theme tokens** (`constants/theme.ts` → `Colors`):
Used by `ThemedText` and `ThemedView` to adapt to light/dark mode. These are the standard Expo starter palette (`#11181C` text on light, `#ECEDEE` on dark, etc.) and are mostly used by the shared components, not the feature screens.

## Theming

`useColorScheme()` (from `hooks/use-color-scheme.ts`) returns `'light' | 'dark'` based on the OS setting. The dark mode toggle in Settings is persisted to the database but **does not override the OS preference** — this is a known gap (see `docs/ROADMAP.md`).

`ThemedText` and `ThemedView` use `useThemeColor` internally to swap between `Colors.light` and `Colors.dark`. Use these components in any new screen that should respect the device theme.

`profile.tsx` uses plain `Text`/`View` with hardcoded light-mode colors — new additions to that screen should follow the same convention for now (or migrate the whole screen to Themed components).

## Fonts

Defined in `constants/theme.ts` as `Fonts` (platform-selected). No custom fonts are loaded. System font stack on all platforms.

## Icons

`@expo/vector-icons` Ionicons. Platform-split `icon-symbol` components exist for SF Symbols on iOS but are not used in the main feature screens — prefer Ionicons for consistency.

## Layout Conventions

- Screens use `flex: 1` containers.
- Horizontal padding is generally `16`.
- Cards/items use `borderRadius: 8`, `borderWidth: 1`, `borderColor: '#ddd'`.
- Modals slide up from the bottom with `borderTopLeftRadius: 16, borderTopRightRadius: 16`.
- Buttons: primary = `#4CAF50` background white text; secondary = `#f0f0f0` background dark text.
