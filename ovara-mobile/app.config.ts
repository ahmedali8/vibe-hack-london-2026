import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Ovara',
  slug: 'ovara',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'ovara',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FEF9F2',
    imageWidth: 200,
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.ovara.app',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#FEF9F2',
    },
    package: 'com.ovara.app',
    edgeToEdgeEnabled: true,
  },
  web: {
    favicon: './assets/icon.png',
    bundler: 'metro',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: { origin: false },
    eas: { projectId: 'YOUR_EAS_PROJECT_ID' },
  },
  owner: 'zamaniziba18',
};

export default config;
