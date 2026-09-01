import type { ExpoConfig, ConfigContext } from 'expo/config';

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'chamamoto-app',
  slug: 'chamamoto-app',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'chamamoto',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Precisamos da sua localização para mostrar o mapa e calcular a corrida.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    ...(apiKey
      ? {
          config: {
            googleMaps: { apiKey },
          },
        }
      : {}),
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
});