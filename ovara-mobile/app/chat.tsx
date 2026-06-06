import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Image, TextInput, Pressable, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getProfile, getPlan, getState, defaultPlan, computePhase,
  type OvaraProfile, type DailyPlan, type DailyState,
} from '../lib/storage';
import { sendChatMessage, type ChatMessage } from '../lib/ai';
import { colors } from '../lib/colors';

const QUICK_REPLIES = [
  'Had my breakfast 🥣',
  'Feeling tired today 😴',
  'Extra coffee oops ☕',
  'Skipped my workout',
  'Cramps showed up 🌸',
];

function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    dots.forEach((d, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: -4, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);
  return (
    <View style={typingStyles.container}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[typingStyles.dot, { transform: [{ translateY: d }] }]} />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingVertical: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(62,44,42,0.45)' },
});

export default function Chat() {
  const router = useRouter();
  const [profile, setProfile] = useState<OvaraProfile | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [dailyState, setDailyState] = useState<DailyState | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
      if (p) {
        let pl = await getPlan();
        if (!pl) pl = defaultPlan(p);
        setPlan(pl);
        const s = await getState();
        setDailyState(s);
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `hi ${p.name} 🌸 how is your day going so far? you can tell me what you ate, how you're feeling, or just say hi.`,
        }]);
      } else {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'hi lovely 🌸 how is your day going so far?',
        }]);
      }
    })();
  }, []);

  const context = useMemo(() => {
    if (!profile || !plan || !dailyState) return null;
    const phase = computePhase(profile.cycleStartDate);
    return {
      profile: { name: profile.name, diagnosis: profile.diagnosis, symptoms: profile.symptoms, diet: profile.diet, fitness: profile.fitness },
      cycle: { phase: phase.label, dayOfCycle: phase.dayOfCycle },
      plan: { meals: plan.meals.map((m) => `${m.label}: ${m.title}`), workout: plan.workout.title },
      today: { waterMl: dailyState.waterMl, coffeeCount: dailyState.coffeeCount, goalMl: plan.waterGoalMl },
    };
  }, [profile, plan, dailyState]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    const reply = await sendChatMessage(newMessages, context);
    const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperAssistant]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Image source={require('../assets/mascot.png')} style={styles.avatar} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>Ovara</Text>
            <Text style={styles.headerSub}>always here</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListFooterComponent={
            isLoading ? (
              <View style={[styles.bubble, styles.bubbleAssistant, { alignSelf: 'flex-start', marginHorizontal: 20 }]}>
                <TypingDots />
              </View>
            ) : null
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Quick replies */}
        <FlatList
          horizontal
          data={QUICK_REPLIES}
          keyExtractor={(q) => q}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickList}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => send(item)}
              disabled={isLoading}
              style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.quickChipText}>{item}</Text>
            </Pressable>
          )}
        />

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Tell Ovara…"
            placeholderTextColor={colors.inkMuted}
            style={styles.composerInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || isLoading}
            style={({ pressed }) => [styles.sendBtn, (!input.trim() || isLoading) && { opacity: 0.35 }, pressed && { opacity: 0.8 }]}
          >
            <Text style={{ fontSize: 18, color: colors.canvas }}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.canvas,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 16,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: colors.inkDim },
  avatar: { width: 40, height: 40 },
  headerName: { fontFamily: 'Fraunces_600SemiBold', fontSize: 18, color: colors.ink },
  headerSub: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.inkMuted, letterSpacing: 1.5, textTransform: 'uppercase' },

  messageList: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  msgWrapper: { marginBottom: 12 },
  msgWrapperUser: { alignItems: 'flex-end' },
  msgWrapperAssistant: { alignItems: 'flex-start' },
  bubble: { maxWidth: '85%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
  bubbleUser: { backgroundColor: colors.ink, borderBottomRightRadius: 6 },
  bubbleAssistant: { backgroundColor: colors.lavenderMuted, borderBottomLeftRadius: 6 },
  bubbleText: { fontFamily: 'Nunito_400Regular', fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: colors.canvas },
  bubbleTextAssistant: { color: colors.ink },

  quickList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  quickChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  quickChipText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: colors.inkDim },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.canvas,
  },
  composerInput: {
    flex: 1, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 14,
    fontSize: 14, fontFamily: 'Nunito_400Regular', color: colors.ink,
    maxHeight: 120,
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 18,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
  },
});
