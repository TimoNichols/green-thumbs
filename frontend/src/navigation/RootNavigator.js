import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadows, fonts, gradients } from '../utils/theme';
import * as Ico from '../components/Ico';
import { useAuth } from '../context/AuthContext';
import NoConnectionScreen from '../components/NoConnectionScreen';

import HomeScreen from '../screens/HomeScreen';
import MyPlantsScreen from '../screens/MyPlantsScreen';
import GardenScreen from '../screens/GardenScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalyzingScreen from '../screens/AnalyzingScreen';
import ReportScreen from '../screens/ReportScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HealthTimelineScreen from '../screens/HealthTimelineScreen';

const Stack    = createNativeStackNavigator();
const Tab      = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

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
  const bottomMargin = Math.max(24, insets.bottom + 6);
  const activeRoute = state.routes[state.index].name;

  const handlePress = (name, index) => {
    if (name === 'Scan') {
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
    <View style={styles.wrapper} pointerEvents="box-none">
      <LinearGradient
        colors={gradients.cream}
        style={styles.fade}
        pointerEvents="none"
      />
      <View
        style={[
          styles.shadowCarrier,
          { marginBottom: bottomMargin },
          Platform.OS === 'android' && styles.shadowCarrierAndroid,
        ]}
      >
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

// ─── Auth navigator ───────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"    component={LoginScreen}    />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────
export default function RootNavigator() {
  const { user, loading, netError, retryConnection } = useAuth();

  if (netError) {
    return <NoConnectionScreen onRetry={retryConnection} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.pine} />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

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
          gestureEnabled: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="HealthTimeline"
        component={HealthTimelineScreen}
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
    shadowColor: shadows.bar.shadowColor,
    shadowOpacity: shadows.bar.shadowOpacity,
    shadowRadius: shadows.bar.shadowRadius,
    shadowOffset: shadows.bar.shadowOffset,
  },
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
