import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts as useSerif,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import {
  useFonts as useSans,
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { colors } from './src/theme/colors';
import { AppProvider, useApp } from './src/context/AppContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ConsentScreen } from './src/screens/ConsentScreen';

function Loader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={colors.accentRose} />
    </View>
  );
}

function Gate({ fontsReady }: { fontsReady: boolean }) {
  const { ready, consented } = useApp();
  if (!fontsReady || !ready) return <Loader />;
  if (!consented) return <ConsentScreen />;
  return <RootNavigator />;
}

export default function App() {
  const [serifReady] = useSerif({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  });
  const [sansReady] = useSans({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <Gate fontsReady={serifReady && sansReady} />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
