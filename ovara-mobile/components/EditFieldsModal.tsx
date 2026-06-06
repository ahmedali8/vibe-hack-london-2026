import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { colors } from '../lib/colors';

export type EditField = {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
};

type Props = {
  visible: boolean;
  title: string;
  fields: EditField[];
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
};

export function EditFieldsModal({ visible, title, fields, onSave, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setValues(Object.fromEntries(fields.map((f) => [f.key, f.value])));
    }
  }, [visible, fields]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {fields.map((field) => (
            <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                value={values[field.key] ?? ''}
                onChangeText={(text) => setValues((v) => ({ ...v, [field.key]: text }))}
                multiline={field.multiline}
                style={[styles.input, field.multiline && styles.inputMulti]}
                placeholderTextColor={colors.inkMuted}
              />
            </View>
          ))}
          <View style={styles.row}>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.btn, styles.cancel, pressed && { opacity: 0.8 }]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(values)}
              style={({ pressed }) => [styles.btn, styles.save, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(62,44,42,0.35)' },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: colors.ink, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: colors.inkMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  cancel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  save: { backgroundColor: colors.ink },
  cancelText: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: colors.ink },
  saveText: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: colors.canvas },
});
