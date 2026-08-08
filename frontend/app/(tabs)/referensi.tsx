import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useData } from "@/src/context/DataContext";
import { useToast } from "@/src/components/Toast";
import { RefRow } from "@/src/api/client";
import { GAS_URL_KEY } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { colors, font, radius, spacing } from "@/src/theme";

export default function ReferensiScreen() {
  const insets = useSafeAreaInsets();
  const { referensi, syncReferensi } = useData();
  const { show } = useToast();
  const [syncing, setSyncing] = useState(false);

  const onSync = useCallback(async () => {
    setSyncing(true);
    const ok = await syncReferensi();
    setSyncing(false);
    show(ok ? "Drive tersinkron" : "Gagal sinkron Drive");
  }, [syncReferensi, show]);

  const onChangeConnection = useCallback(async () => {
    await storage.removeItem(GAS_URL_KEY);
    router.replace("/setup");
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: RefRow; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 30)} style={styles.row} testID={`ref-row-${item.row_index}`}>
        <Ionicons name="document-text-outline" size={18} color={colors.onSurfaceMuted} />
        <Text style={styles.fileName} numberOfLines={1}>
          {item.nama_file}
        </Text>
      </Animated.View>
    ),
    []
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Gudang Referensi Berkas</Text>
          <Text style={styles.subtitle}>Data berkas PDF terhubung dari Google Drive</Text>
        </View>
        <Pressable onPress={onChangeConnection} hitSlop={12} testID="change-connection" style={styles.gearBtn}>
          <Ionicons name="settings-outline" size={20} color={colors.onSurfaceMuted} />
        </Pressable>
      </View>

      <FlatList
        data={referensi}
        keyExtractor={(item) => String(item.row_index)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={
          <View style={styles.center} testID="ref-empty">
            <Ionicons name="folder-open-outline" size={40} color={colors.onSurfaceMuted} />
            <Text style={styles.centerText}>Belum ada berkas tersinkron</Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          referensi.length === 0 && { flexGrow: 1 },
          { paddingBottom: insets.bottom + 100 },
        ]}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          testID="synchronize-drive"
          onPress={onSync}
          disabled={syncing}
          style={({ pressed }) => [styles.syncBtn, pressed && { opacity: 0.8 }]}
        >
          {syncing ? (
            <ActivityIndicator color={colors.onSurface} />
          ) : (
            <>
              <Ionicons name="cloud-download-outline" size={18} color={colors.onSurface} />
              <Text style={styles.syncText}>Synchronize Drive</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: font["2xl"], fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: font.base, color: colors.onSurfaceMuted, marginTop: 2 },
  gearBtn: { padding: spacing.xs },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  fileName: { flex: 1, fontSize: font.lg, color: colors.onSurface, fontWeight: "500" },
  divider: { height: 1, backgroundColor: colors.divider },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerText: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface, marginTop: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
  },
  syncText: { color: colors.onSurface, fontSize: font.lg, fontWeight: "700" },
});
