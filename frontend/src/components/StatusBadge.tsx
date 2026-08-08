import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { font, radius, spacing, statusStyle } from "@/src/theme";

export default function StatusBadge({ status, testID }: { status?: string; testID?: string }) {
  const s = statusStyle(status);
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]} testID={testID}>
      <Text style={[styles.text, { color: s.fg }]} numberOfLines={1}>
        {s.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
  },
  text: { fontSize: font.sm, fontWeight: "700" },
});
