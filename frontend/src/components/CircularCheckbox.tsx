import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/src/theme";

export default function CircularCheckbox({
  checked,
  disabled,
  onPress,
  testID,
}: {
  checked: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const handle = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress?.();
  };
  return (
    <Pressable
      testID={testID}
      onPress={handle}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [styles.base, pressed && !disabled && { transform: [{ scale: 0.9 }] }]}
    >
      <View style={[styles.circle, checked && styles.circleChecked]}>
        {checked ? <Ionicons name="checkmark" size={20} color={colors.onBrand} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  circleChecked: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
});
