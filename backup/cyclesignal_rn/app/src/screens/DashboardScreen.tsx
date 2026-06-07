import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircleHeart } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts, type } from '../theme/typography';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { ParticleField } from '../components/ParticleField';
import { MoonGlyph } from '../components/MoonGlyph';
import { PrimaryButton } from '../components/Button';
import { Heatmap } from '../components/Heatmap';
import { PatternInsightCard } from '../components/PatternInsightCard';
import { Card } from '../components/Card';
import { currentPosition } from '../lib/phase';

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { cycles, heatmap, pattern } = useApp();
  const pos = currentPosition(cycles);

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          onPressLock={() => navigation.navigate('Privacy')}
          onPressSettings={() => navigation.navigate('Privacy')}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero zone — PRD 0.5 */}
        <LinearGradient colors={colors.gradientHero} style={styles.hero}>
          <ParticleField />
          <View style={styles.heroInner}>
            <Text style={styles.heroGreeting}>Good to see you, Amara</Text>
            <View style={styles.heroDayRow}>
              <MoonGlyph size={40} phase={pos.moonPhase} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.heroDay}>{pos.cycleDay}</Text>
                <Text style={styles.heroDayLabel}>cycle day</Text>
              </View>
            </View>
            <Text style={styles.heroPhase}>{pos.phase}</Text>
            <PrimaryButton
              label="Talk to CycleSignal"
              icon={<MessageCircleHeart size={18} color={colors.textPrimary} strokeWidth={1.5} />}
              onPress={() => navigation.navigate('CheckIn')}
              style={styles.heroCta}
            />
          </View>
        </LinearGradient>

        {/* Content zone */}
        <View style={styles.content}>
          <PatternInsightCard pattern={pattern} />

          <Card style={styles.heatmapCard}>
            <Text style={styles.sectionTitle}>Cycle Timeline</Text>
            <Text style={styles.sectionSub}>
              Symptoms across your last {cycles.length} cycles
            </Text>
            <View style={{ marginTop: 16 }}>
              <Heatmap cycles={cycles} rows={heatmap.rows} maxDay={heatmap.maxDay} />
            </View>
          </Card>

          <Text style={styles.disclaimer}>
            CycleSignal helps you prepare evidence for a clinician. It is not a diagnosis and
            not a medical device.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgBase },
  hero: { overflow: 'hidden', paddingBottom: 28 },
  heroInner: { paddingHorizontal: 20, paddingTop: 16 },
  heroGreeting: { ...type.label, color: colors.textSecondary, marginBottom: 8 },
  heroDayRow: { flexDirection: 'row', alignItems: 'center' },
  heroDay: { fontFamily: fonts.serif, fontSize: 56, lineHeight: 58, color: colors.textPrimary },
  heroDayLabel: { ...type.label, color: colors.textSecondary, marginTop: -4 },
  heroPhase: { ...type.title, color: colors.accentVioletSoft, marginTop: 4, marginBottom: 20 },
  heroCta: { alignSelf: 'flex-start' },
  content: { padding: 16, gap: 16 },
  heatmapCard: {},
  sectionTitle: { ...type.title, color: colors.textPrimary },
  sectionSub: { ...type.label, color: colors.textSecondary, marginTop: 2 },
  disclaimer: { ...type.caption, color: colors.textMuted, marginTop: 4 },
});
