import { Feather } from '@expo/vector-icons';
import { ReactNode, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { colors } from '../lib/colors';

const ACTION_WIDTH = 52;

type Props = {
  children: ReactNode;
  onEdit: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
};

export function SwipeableCard({
  children,
  onEdit,
  onDelete,
  canDelete = true,
  borderRadius = 20,
  backgroundColor = colors.white,
  borderColor = colors.border,
}: Props) {
  const ref = useRef<Swipeable>(null);
  const showDelete = canDelete && !!onDelete;
  const actionsWidth = ACTION_WIDTH * (showDelete ? 2 : 1);

  const close = () => ref.current?.close();

  const renderRightActions = () => (
    <View style={[styles.actions, { width: actionsWidth }]}>
      <Pressable
        accessibilityLabel="Edit"
        onPress={() => {
          close();
          onEdit();
        }}
        style={({ pressed }) => [styles.actionBtn, styles.editBtn, pressed && styles.pressed]}
      >
        <Feather name="edit-2" size={18} color={colors.ink} />
      </Pressable>
      {showDelete ? (
        <Pressable
          accessibilityLabel="Delete"
          onPress={() => {
            close();
            onDelete!();
          }}
          style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && styles.pressed]}
        >
          <Feather name="trash-2" size={18} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        styles.shell,
        { borderRadius, borderColor, backgroundColor, marginBottom: 10 },
      ]}
    >
      <Swipeable
        ref={ref}
        friction={2}
        overshootRight={false}
        rightThreshold={actionsWidth / 2}
        renderRightActions={renderRightActions}
      >
        {/* Square right edge — outer shell clips the rounded corners */}
        <View style={[styles.foreground, { backgroundColor }]}>
          {children}
        </View>
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  foreground: {
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
  },
  actionBtn: {
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: { backgroundColor: colors.lavender },
  deleteBtn: { backgroundColor: colors.rose },
  pressed: { opacity: 0.88 },
});
