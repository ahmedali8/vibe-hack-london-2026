import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chip } from '../components/Chip';
import { saveProfile, addPeriodStart, todayISO } from '../lib/storage';
import { colors } from '../lib/colors';

type StepKey = 'welcome' | 'name' | 'cycle' | 'diagnosis' | 'symptoms' | 'diet' | 'fitness';
const STEPS: StepKey[] = ['welcome', 'name', 'cycle', 'diagnosis', 'symptoms', 'diet', 'fitness'];

const SYMPTOM_OPTIONS = ['Cramps', 'Bloating', 'Fatigue', 'Mood swings', 'Acne', 'Cravings', 'Pelvic pain', 'Brain fog', 'Tender breasts', 'Anxious'];
const DIAGNOSIS_OPTIONS = ['PCOS', 'Endometriosis', 'Both', 'Suspected', 'Just exploring'];
const CYCLE_OPTIONS = ['Regular', 'Irregular', 'Not sure', 'Not menstruating'];
const DIET_OPTIONS = ['Omnivore', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'No preference'];
const FITNESS_OPTIONS = ['Gentle', 'Moderate', 'Active'];

export default function Onboarding() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stepIdx, setStepIdx] = useState(0);
  const [name, setName] = useState('');
  const [cycleStatus, setCycleStatus] = useState('');
  const [diagnosis, setDiagnosis] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [diet, setDiet] = useState('');
  const [fitness, setFitness] = useState('');
  const opacity = useState(new Animated.Value(1))[0];

  const step = STEPS[stepIdx];

  const toggle = (arr: string[], set: (a: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const canAdvance = (() => {
    switch (step) {
      case 'welcome': return true;
      case 'name': return name.trim().length > 0;
      case 'cycle': return cycleStatus !== '';
      case 'diagnosis': return diagnosis.length > 0;
      case 'symptoms': return true;
      case 'diet': return diet !== '';
      case 'fitness': return fitness !== '';
    }
  })();

  const transition = (fn: () => void) => {
    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const next = async () => {
    if (stepIdx === STEPS.length - 1) {
      await saveProfile({
        name: name.trim() || 'lovely',
        cycleStatus,
        diagnosis,
        symptoms,
        diet,
        fitness,
        cycleStartDate: todayISO(),
        completedAt: new Date().toISOString(),
      });
      await addPeriodStart(todayISO());
      router.replace('/');
    } else {
      transition(() => setStepIdx((i) => i + 1));
    }
  };

  const back = () => {
    if (stepIdx > 0) transition(() => setStepIdx((i) => i - 1));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Progress + back */}
        <View style={styles.progressRow}>
          <Pressable
            onPress={back}
            disabled={stepIdx === 0}
            style={[styles.backBtn, stepIdx === 0 && { opacity: 0.3 }]}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i <= stepIdx ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>
        </View>

        <Animated.View style={[styles.content, { opacity }]}>
          {step === 'welcome' && (
            <View style={styles.welcomeContainer}>
              <Image
                source={require('../assets/mascot.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
              <Text style={styles.welcomeTitle}>
                Welcome to <Text style={{ color: colors.rose }}>Ovara</Text>
              </Text>
              <Text style={styles.welcomeSubtitle}>
                A soft, AI-tuned companion for PCOS and Endo. Let's tend to you, one gentle day at a time.
              </Text>
            </View>
          )}

          {step === 'name' && (
            <View>
              <Text style={styles.stepTitle}>What should we call you?</Text>
              <Text style={styles.stepSubtitle}>So we can greet you each morning.</Text>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
                placeholderTextColor={colors.inkMuted}
                style={styles.textInput}
              />
            </View>
          )}

          {step === 'cycle' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>How's your cycle these days?</Text>
              <Text style={styles.stepSubtitle}>No wrong answer.</Text>
              <View style={styles.chipWrap}>
                {CYCLE_OPTIONS.map((o) => (
                  <Chip key={o} tone="lavender" selected={cycleStatus === o} onPress={() => setCycleStatus(o)}>{o}</Chip>
                ))}
              </View>
            </ScrollView>
          )}

          {step === 'diagnosis' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>What are you navigating?</Text>
              <Text style={styles.stepSubtitle}>Pick anything that fits.</Text>
              <View style={styles.chipWrap}>
                {DIAGNOSIS_OPTIONS.map((o) => (
                  <Chip key={o} tone="rose" selected={diagnosis.includes(o)} onPress={() => toggle(diagnosis, setDiagnosis, o)}>{o}</Chip>
                ))}
              </View>
            </ScrollView>
          )}

          {step === 'symptoms' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>Anything feeling loud lately?</Text>
              <Text style={styles.stepSubtitle}>Tap any. You can skip this.</Text>
              <View style={styles.chipWrap}>
                {SYMPTOM_OPTIONS.map((o) => (
                  <Chip key={o} tone="sage" selected={symptoms.includes(o)} onPress={() => toggle(symptoms, setSymptoms, o)}>{o}</Chip>
                ))}
              </View>
            </ScrollView>
          )}

          {step === 'diet' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>How do you eat?</Text>
              <Text style={styles.stepSubtitle}>We'll tune meal ideas to fit.</Text>
              <View style={styles.chipWrap}>
                {DIET_OPTIONS.map((o) => (
                  <Chip key={o} tone="amber" selected={diet === o} onPress={() => setDiet(o)}>{o}</Chip>
                ))}
              </View>
            </ScrollView>
          )}

          {step === 'fitness' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>How active are you feeling?</Text>
              <Text style={styles.stepSubtitle}>We'll meet you where you are.</Text>
              <View style={styles.chipWrap}>
                {FITNESS_OPTIONS.map((o) => (
                  <Chip key={o} tone="lavender" selected={fitness === o} onPress={() => setFitness(o)}>{o}</Chip>
                ))}
              </View>
            </ScrollView>
          )}
        </Animated.View>

        <Pressable
          onPress={next}
          disabled={!canAdvance}
          style={({ pressed }) => [
            styles.continueBtn,
            !canAdvance && { opacity: 0.35 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.continueBtnText}>
            {stepIdx === STEPS.length - 1 ? 'Begin your day' : 'Continue'} →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  backBtn: {
    width: 40, height: 40, borderRadius: 16,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: colors.inkDim },
  dots: { flex: 1, flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: 'rgba(62,44,42,0.7)' },
  dotInactive: { backgroundColor: 'rgba(62,44,42,0.1)' },
  content: { flex: 1 },
  welcomeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mascot: { width: 180, height: 180 },
  welcomeTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 36, color: colors.ink, marginTop: 24, textAlign: 'center' },
  welcomeSubtitle: { fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.inkDim, marginTop: 16, textAlign: 'center', maxWidth: 280, lineHeight: 22 },
  stepTitle: { fontFamily: 'Fraunces_600SemiBold', fontSize: 28, color: colors.ink, lineHeight: 36 },
  stepSubtitle: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.inkDim, marginTop: 8, marginBottom: 24 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  textInput: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 18,
    fontSize: 17, fontFamily: 'Nunito_400Regular', color: colors.ink,
  },
  continueBtn: {
    backgroundColor: colors.ink, borderRadius: 24, paddingVertical: 20,
    alignItems: 'center', marginTop: 16,
    shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  continueBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: colors.canvas },
});
