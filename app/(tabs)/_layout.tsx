import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, usePathname, router } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_ORDER = ['/(tabs)/explore', '/(tabs)', '/(tabs)/profile'] as const;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 400;

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const bgColor = Colors[colorScheme ?? 'light'].background;
  const pathname = usePathname();
  const navigating = useRef(false);
  const translateX = useSharedValue(0);

  const getCurrentIndex = useCallback(() => {
    if (pathname === '/explore') return 0;
    if (pathname === '/profile') return 2;
    return 1;
  }, [pathname]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      if (navigating.current) return;
      const idx = getCurrentIndex();
      const atStart = idx === 0 && event.translationX > 0;
      const atEnd = idx === TAB_ORDER.length - 1 && event.translationX < 0;
      translateX.value = (atStart || atEnd)
        ? event.translationX * 0.15
        : event.translationX;
    })
    .onEnd((event) => {
      if (navigating.current) return;
      const idx = getCurrentIndex();
      const goRight = event.velocityX < -VELOCITY_THRESHOLD ||
        (event.translationX < -SWIPE_THRESHOLD && event.velocityX < 0);
      const goLeft = event.velocityX > VELOCITY_THRESHOLD ||
        (event.translationX > SWIPE_THRESHOLD && event.velocityX > 0);

      const canGoRight = goRight && idx < TAB_ORDER.length - 1;
      const canGoLeft = goLeft && idx > 0;

      if (canGoRight || canGoLeft) {
        navigating.current = true;
        const target = canGoRight ? idx + 1 : idx - 1;
        const enterFrom = canGoRight ? SCREEN_WIDTH : -SCREEN_WIDTH;

        router.navigate(TAB_ORDER[target]);
        translateX.value = enterFrom;
        translateX.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });

        setTimeout(() => { navigating.current = false; }, 260);
      } else {
        translateX.value = withTiming(0, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
        });
      }
    })
    .runOnJS(true);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: translateX.value }],
  }));

  const tabBarCounterStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -translateX.value }],
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: bgColor }}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={contentAnimatedStyle} collapsable={false}>
          <Tabs
            tabBar={(props: BottomTabBarProps) => (
              <Animated.View style={tabBarCounterStyle}>
                <BottomTabBar {...props} />
              </Animated.View>
            )}
            screenOptions={{
              tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
              headerShown: false,
              tabBarButton: HapticTab,
            }}>
            <Tabs.Screen
              name="explore"
              options={{
                title: 'Map',
                tabBarIcon: ({ color }) => <Ionicons size={26} name="map-outline" color={color} />,
              }}
            />
            <Tabs.Screen
              name="index"
              options={{
                title: 'Tasks',
                tabBarIcon: ({ color }) => <Ionicons size={26} name="checkmark-circle-outline" color={color} />,
              }}
            />
            <Tabs.Screen
              name="profile"
              options={{
                title: 'Profile',
                tabBarIcon: ({ color }) => <Ionicons size={26} name="person-outline" color={color} />,
              }}
            />
          </Tabs>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
