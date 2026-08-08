import { useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";

import { useData } from "@/src/context/DataContext";
import { useToast } from "@/src/components/Toast";
import StatusBadge from "@/src/components/StatusBadge";
import CircularCheckbox from "@/src/components/CircularCheckbox";
import AddLamaranSheet from "@/src/components/AddLamaranSheet";
import { LogRow } from "@/src/api/client";
import { colors, font, spacing } from "@/src/theme";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { log, referensi, loading, error, refresh, triggerKirim, syncReferensi, addLamaran } =
    useData();
  const { show } = useToast();
  const sheetRef = useRef<BottomSheetModal>(null);

  const onSync = useCallback(async () => {
    show("Menyinkron referensi berkas...");
    const ok = await syncReferensi();
    show(ok ? "Referensi tersinkron" : "Gagal sinkron referensi");
  }, [syncReferensi, show]);

  const onCheck = useCallback(
    (row: LogRow) => {
      show("Proses Mengirim...");
      triggerKirim(row.row_index);
    },
    [triggerKirim, show]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LogRow; index: number }) => {
      const terkirim = (item.status || "").toLowerCase().includes("terkirim");
      return (
        <Animated.View entering={FadeInDown.delay(index * 40)} style={styles.card} testID={`lamaran-card-${item.row_index}`}>
          <View style={styles.cardLeft}>
            <Text style={styles.posisi} numberOfLines={1}>
              {item.posisi || "(Tanpa Posisi)"}
            </Text>
            <Text style={styles.perusahaan} numberOfLines={1}>
              {item.perusahaan}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {item.email}
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <StatusBadge status={item.status} testID={`status-badge-${item.row_index}`} />
            </View>
          </View>
          <CircularCheckbox
            testID={`send-checkbox-${item.row_index}`}
            checked={terkirim}
            disabled={terkirim}
            onPress={() => onCheck(item)}
          />
        </Animated.View>
      );
    },
    [onCheck]
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
        <View style={styles.center} testID="home-error">
          <Ionicons name="cloud-offline-outline" size={40} color={colors.onSurfaceMuted} />
          <Text style={styles.centerText}>Gagal memuat data</Text>
          <Pressable onPress={refresh} style={styles.retryBtn} testID="home-retry">
            <Text style={styles.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.center} testID="home-empty">
        <Ionicons name="mail-outline" size={40} color={colors.onSurfaceMuted} />
        <Text style={styles.centerText}>Belum ada lamaran dikirim</Text>
        <Text style={styles.centerSub}>Ketuk tombol + untuk menambah lamaran baru</Text>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title} testID="home-title">
          Lamaran
        </Text>
        <Pressable onPress={onSync} hitSlop={12} style={styles.syncBtn} testID="sync-button">
          <Ionicons name="sync" size={22} color={colors.onSurface} />
        </Pressable>
      </View>

      <FlatList
        data={log}
        keyExtractor={(item) => String(item.row_index)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          log.length === 0 && { flexGrow: 1 },
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.brand} />
        }
      />

      <Pressable
        testID="fab-add"
        onPress={() => sheetRef.current?.present()}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + spacing.lg }, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Ionicons name="add" size={30} color={colors.onBrand} />
      </Pressable>

      <AddLamaranSheet
        ref={sheetRef}
        options={referensi.map((r) => r.nama_file)}
        onSubmit={async (p) => {
          const ok = await addLamaran(p);
          show(ok ? "Lamaran tersimpan ke sheet" : "Gagal menyimpan lamaran");
          return ok;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: font["2xl"], fontWeight: "800", color: colors.onSurface },
  syncBtn: { padding: spacing.xs },
  listContent: { paddingHorizontal: spacing.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  cardLeft: { flex: 1, paddingRight: spacing.md },
  posisi: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  perusahaan: { fontSize: font.base, color: colors.onSurface, marginTop: 2 },
  email: { fontSize: font.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider },
  skeleton: {
    height: 92,
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
    marginBottom: spacing.md,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing["3xl"] },
  centerText: { fontSize: font.lg, fontWeight: "600", color: colors.onSurface, marginTop: spacing.md },
  centerSub: { fontSize: font.base, color: colors.onSurfaceMuted, marginTop: spacing.xs },
  retryBtn: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: { color: colors.onSurface, fontWeight: "600", fontSize: font.base },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
