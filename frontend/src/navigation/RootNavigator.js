import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, fonts, gradients } from '../utils/theme';
import * as Ico from '../components/Ico';

import HomeScreen from '../screens/HomeScreen';
import MyPlantsScreen from '../screens/MyPlantsScreen';
import GardenScreen from '../screens/GardenScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalyzingScreen from '../screens/AnalyzingScreen';
import ReportScreen from '../screens/ReportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Occupies the center slot in the tab list so the layout math is right.
// The CustomTabBar intercepts its press and routes to the Camera modal instead.
function ScanPlaceholder() {
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

const TAB_CONFIG = [
  { name: 'Home',    Component: HomeScreen,     Icon: Ico.Home,    label: 'Home'   },
  { name: 'Plants',  Component: MyPlantsScreen,  Icon: Ico.List,    label: 'Plants' },
  { name: 'Scan',    Component: ScanPlaceholder, Icon: Ico.Scan,    label: '',      primary: true },
  { name: 'Garden',  Component: GardenScreen,    Icon: Ico.Garden,  label: 'Garden' },
  { name: 'Profile', Component: ProfileScreen,   Icon: Ico.User,    label: 'You'    },
];

// ─── Custom tab bar ───────────────────────────────────────────
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  // Sit at least 24px above the home indicator, or more if the safe area is taller
  const bottomMargin = Math.max(24, insets.bottom + 6);
  const activeRoute = state.routes[state.index].name;

  const handlePress = (name, index) => {
    if (name === 'Scan') {
      // Scan lives in the parent Stack — bubble up to reach it
      navigation.getParent()?.navigate('Camera');
      return;
    }
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[index].key,
      canPreventDefault: true,
    });
    if (activeRoute !== name && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  return (
    // box-none lets touches fall through the transparent wrapper to content below
    <View style={styles.wrapper} pointerEvents="box-none">
      {/* Gradient fades scroll content into the cream bg — not interactive */}
      <LinearGradient
        colors={gradients.cream}
        style={styles.fade}
        pointerEvents="none"
      />

      {/* Shadow carrier — no overflow:hidden so the shadow renders on iOS */}
      <View
        style={[
          styles.shadowCarrier,
          { marginBottom: bottomMargin },
          Platform.OS === 'android' && styles.shadowCarrierAndroid,
        ]}
      >
        {/* BlurView clips content to the pill shape */}
        <BlurView intensity={20} tint="light" style={styles.blur}>
          <View style={styles.inner}>
            {TAB_CONFIG.map((tab, index) => {
              const isActive = activeRoute === tab.name;
              const ic = isActive ? colors.pine : colors.textMute;

              if (tab.primary) {
                return (
                  <Pressable
                    key={tab.name}
                    onPress={() => handlePress(tab.name, index)}
                    style={styles.scanWrap}
                    hitSlop={8}
                  >
                    <LinearGradient colors={gradients.cta} style={styles.scanBtn}>
                      <Ico.Scan color="#FBFAF3" size={22} />
                    </LinearGradient>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={tab.name}
                  onPress={() => handlePress(tab.name, index)}
                  style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
                >
                  <tab.Icon color={ic} size={22} />
                  {tab.label ? (
                    <Text style={[styles.tabLabel, { color: ic }]}>{tab.label}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

// ─── Tab navigator ────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.Component} />
      ))}
    </Tab.Navigator>
  );
}

// ─── Root stack ───────────────────────────────────────────────
// Camera and Analyzing are fullScreenModals — tab bar is not visible.
// Report uses a card slide so it feels like a "result arriving", not a modal.
// From MyPlants: navigation.navigate('Report', { report }) — bubbles up here.
// From Analyzing: navigation.replace('Report', { report }) — replaces Analyzing so
//   the back gesture skips the loading screen and returns straight to the tabs.
export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="Analyzing"
        component={AnalyzingScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false, // no accidental swipe-down mid-analysis
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  fade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  shadowCarrier: {
    marginHorizontal: 12,
    borderRadius: radii['3xl'],
    // iOS drop shadow
    shadowColor: shadows.bar.shadowColor,
    shadowOpacity: shadows.bar.shadowOpacity,
    shadowRadius: shadows.bar.shadowRadius,
    shadowOffset: shadows.bar.shadowOffset,
  },
  // Android needs a background on the elevation carrier for the shadow to render
  shadowCarrierAndroid: {
    elevation: shadows.bar.elevation,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radii['3xl'],
    overflow: 'hidden',
  },
  blur: {
    borderRadius: radii['3xl'],
    overflow: 'hidden',
    height: 64,
    borderWidth: 1,
    borderColor: colors.line,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  scanWrap: {
    marginTop: -16,
    borderRadius: radii.pill,
    // Scan button has its own lift
    shadowColor: '#2E5238',
    shadowOpacity: 0.35,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  scanBtn: {
    width: 50,
    height: 50,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  tabLabel: {
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
