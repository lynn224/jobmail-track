import React, { useRef } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius, spacing } from "@/src/theme";

type Layout = { x: number; w: number };

// A single selected chip that can be long-pressed and dragged to reorder.
function DraggableChip({
  label,
  index,
  onLayout,
  onRemove,
  onDrop,
}: {
  label: string;
  index: number;
  onLayout: (i: number, l: Layout) => void;
  onRemove: (i: number) => void;
  onDrop: (i: number, translationX: number) => void;
}) {
  const tx = useSharedValue(0);
  const active = useSharedValue(0);

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      active.value = 1;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      runOnJS(onDrop)(index, e.translationX);
      tx.value = withTiming(0, { duration: 120 });
      active.value = 0;
    })
    .onFinalize(() => {
      active.value = 0;
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { scale: active.value ? 1.06 : 1 }],
    opacity: active.value ? 0.92 : 1,
    zIndex: active.value ? 100 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(e: LayoutChangeEvent) =>
          onLayout(index, { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })
        }
        style={[styles.selChip, style]}
      >
        <Ionicons name="reorder-two" size={14} color={colors.onBrand} style={{ marginRight: 4 }} />
        <Text style={styles.selChipText}>{label}</Text>
        <Pressable
          hitSlop={8}
          onPress={() => onRemove(index)}
          testID={`chip-remove-${label}`}
          style={styles.removeBtn}
        >
          <Ionicons name="close" size={13} color={colors.onBrand} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export default function ChipReorder({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const layouts = useRef<Record<number, Layout>>({});
  const available = options.filter((o) => !value.includes(o));

  const add = (label: string) => onChange([...value, label]);
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const handleDrop = (from: number, translationX: number) => {
    const centers = value.map((_, i) => {
      const l = layouts.current[i];
      return l ? l.x + l.w / 2 : i * 110;
    });
    const dropX = centers[from] + translationX;
    const others = value.map((_, i) => i).filter((i) => i !== from);
    const target = others.filter((i) => centers[i] < dropX).length;
    if (target === from) return;
    const arr = [...value];
    const [moved] = arr.splice(from, 1);
    arr.splice(target, 0, moved);
    onChange(arr);
  };

  return (
    <View>
      {value.length > 0 ? (
        <>
          <Text style={styles.hint}>Terpilih · tahan & geser untuk urutkan</Text>
          <View style={styles.selRow} testID="selected-chips-row">
            {value.map((label, i) => (
              <DraggableChip
                key={label}
                label={label}
                index={i}
                onLayout={(idx, l) => (layouts.current[idx] = l)}
                onRemove={remove}
                onDrop={handleDrop}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.hint}>Tersedia · ketuk untuk memilih</Text>
      <View style={styles.availRow}>
        {available.length === 0 ? (
          <Text style={styles.emptyText}>Semua berkas telah dipilih</Text>
        ) : (
          available.map((label) => (
            <Pressable
              key={label}
              onPress={() => add(label)}
              testID={`chip-add-${label}`}
              style={styles.availChip}
            >
              <Ionicons name="add" size={13} color={colors.onSurface} style={{ marginRight: 3 }} />
              <Text style={styles.availChipText}>{label}</Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: font.sm,
    color: colors.onSurfaceMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  selRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  selChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  selChipText: { color: colors.onBrand, fontSize: font.base, fontWeight: "600" },
  removeBtn: {
    marginLeft: spacing.sm,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  availRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  availChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  availChipText: { color: colors.onSurface, fontSize: font.base, fontWeight: "500" },
  emptyText: { fontSize: font.base, color: colors.onSurfaceMuted },
});
