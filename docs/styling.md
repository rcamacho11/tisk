# Styling & Theming

## Approach

All styling uses **React Native `StyleSheet.create()`**. There is no Tailwind, CSS Modules, or styled-components. Styles are co-located with components in the same file unless they are very long.

## Color System

Colors are defined in **`constants/theme.ts`** (or `constants/Colors.ts` — Expo's default). Two palettes: `light` and `dark`.

```typescript
// Approximate palette
const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',        // primary blue
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
}
```

**Accent colors used across screens** (defined inline, not in the palette — consider centralizing):
- **Primary action / success:** `#4CAF50` (green)
- **Error / overdue / destructive:** `#ff6b6b` (soft red)
- **Warning:** `#ff9800` (orange, for medium priority)
- **Info:** `#2196F3` (blue, for low priority)
- **High priority:** `#f44336` (red)

## Dark Mode

Dark mode is read via the **`useColorScheme()`** hook from `react-native`. The `ThemedText` and `ThemedView` components use a `useThemeColor()` helper:

```typescript
// hooks/useThemeColor.ts (Expo default)
function useThemeColor(props: { light?: string; dark?: string }, colorName: keyof typeof Colors.light) {
  const theme = useColorScheme() ?? 'light'
  return props[theme] ?? Colors[theme][colorName]
}
```

To theme a custom component, use `useThemeColor` directly:
```typescript
const color = useThemeColor({ light: '#000', dark: '#fff' }, 'text')
```

There is currently no user-controlled dark mode toggle wired up to `useColorScheme` — it follows the system setting. The `user_settings.dark_mode` field exists in the DB but is not yet applied at runtime.

## Themed Base Components

Use these instead of raw `<Text>` and `<View>` when the color should adapt to the theme:

| Component | Usage |
|-----------|-------|
| `<ThemedText>` | Drop-in for `<Text>`, accepts optional `lightColor`/`darkColor` props |
| `<ThemedView>` | Drop-in for `<View>`, same props |

For screens that have complex, mostly fixed-color layouts (e.g., tasks screen with priority color coding), use raw `StyleSheet` with explicit color values and handle theming per-element where needed.

## Icons

Icons are rendered via `<IconSymbol>` in `components/ui/IconSymbol.tsx`.

- **iOS:** Uses SF Symbols via `expo-symbols`
- **Android / Web:** Uses `MaterialIcons` from `@expo/vector-icons`

The component maps a single icon name to the correct library per platform:
```typescript
<IconSymbol name="house.fill" size={24} color={color} />
```

For icons only needed on one platform, import `@expo/vector-icons` directly.

## Layout Patterns

### Tab screen layout
```tsx
<SafeAreaView style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={styles.container}>
    {/* content */}
  </ScrollView>
</SafeAreaView>
```

### Modal
Modals are rendered as React Native `<Modal>` components with `animationType="slide"` and `transparent` background overlay:
```tsx
<Modal visible={isOpen} animationType="slide" transparent>
  <View style={styles.overlay}>
    <View style={styles.modalContainer}>
      {/* form */}
    </View>
  </View>
</Modal>
```

### Cards
Task cards and profile items use `borderRadius: 12`, subtle `shadowColor` / `elevation` for depth, and `marginBottom: 12` vertical rhythm.

## Fonts

Uses the default Expo font stack (system fonts). No custom fonts are loaded unless added to `app/_layout.tsx` via `expo-font`.

## Spacing Conventions

No formal spacing scale — values are written inline. Common values observed: `8`, `12`, `16`, `20`, `24`. Consider extracting to `constants/spacing.ts` if the codebase grows.

## Animations

- `react-native-reanimated` is installed for complex gesture-driven animations.
- `expo-haptics` is used for tab press feedback (via `HapticTab` component).
- Simple UI feedback (button press states) uses React Native's built-in `Animated` API or `TouchableOpacity` opacity feedback.
