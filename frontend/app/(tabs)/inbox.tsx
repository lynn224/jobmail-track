import { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useData } from "@/src/context/DataContext";
import CategoryDot from "@/src/components/CategoryDot";
import { InboxRow } from "@/src/api/client";
import { colors, font, spacing } from "@/src/theme";

export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const { inbox, loading, error, refresh } = useData();

  const renderItem = useCallback(
    ({ item, index }: { item: InboxRow; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 40)}>
        <Pressable
          testID={`inbox-card-${item.row_index}`}
          onPress={() => router.push(`/email/${item.row_index}`)}
          style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.surfaceSecondary }]}
        >
          <View style={styles.dotWrap}>
            <CategoryDot kategori={item.kategori} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.rowTop}>
              <Text style={styles.company} numberOfLines={1}>
                {item.nama_perusahaan}
              </Text>
              <Text style={styles.date}>{item.tanggal}</Text>
            </View>
            <Text style={styles.subject} numberOfLines={1}>
              {item.subjek}
            </Text>
            {item.status_tindak_lanjut ? (
              <View style={styles.followRow}>
                <Ionicons name="checkmark-circle" size={12} color={colors.onSurfaceMuted} />
                <Text style={styles.followText} numberOfLines={1}>
                  {item.status_tindak_lanjut}
                </Text>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
        </Pressable>
      </Animated.View>
    ),
    []
  );

  const listEmpty = () => {
    if (loading) {
      return (
        <View>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.center} testID="inbox-error">
          <Ionicons name="cloud-offline-outline" size={40} color={colors.onSurfaceMuted} />
          <Text style={styles.centerText}>Gagal memuat inbox</Text>
        </View>
      );
    }
    return (
      <View style={styles.center} testID="inbox-empty">
        <Ionicons name="mail-open-outline" size={40} color={colors.onSurfaceMuted} />
        <Text style={styles.centerText}>Inbox kosong</Text>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox HRD</Text>
      </View>
      <FlatList
        data={inbox}
        keyExtractor={(item) => String(item.row_index)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          inbox.length === 0 && { flexGrow: 1 },
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: font["2xl"], fontWeight: "800", color: colors.onSurface },
  listContent: { paddingHorizontal: spacing.lg },
  card: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg, gap: spacing.md },
  dotWrap: { width: 12, alignItems: "center", paddingTop: 4, alignSelf: "flex-start" },
  cardBody: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  company: { flex: 1, fontSize: font.lg, fontWeight: "700", color: colors.onSurface, paddingRight: spacing.sm },
  date: { fontSize: font.sm, color: colors.onSurfaceMuted },
  subject: { fontSize: font.base, color: colors.onSurface, marginTop: 3 },
  followRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  followText: { flex: 1, fontSize: font.sm, color: colors.onSurfaceMuted, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: colors.divider },
  skeleton: { height: 72, borderRadius: 8, backgroundColor: colors.surfaceTertiary, marginBottom: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerText: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface, marginTop: spacing.md },
});
