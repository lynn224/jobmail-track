import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useData } from "@/src/context/DataContext";
import { useToast } from "@/src/components/Toast";
import CategoryDot from "@/src/components/CategoryDot";
import { colors, font, radius, spacing } from "@/src/theme";

export default function EmailDetail() {
  const insets = useSafeAreaInsets();
  const { rowIndex } = useLocalSearchParams<{ rowIndex: string }>();
  const { inbox, updateFollowUp } = useData();
  const { show } = useToast();

  const ri = Number(rowIndex);
  const email = useMemo(() => inbox.find((e) => e.row_index === ri), [inbox, ri]);
  const [text, setText] = useState(email?.status_tindak_lanjut || "");
  const [sending, setSending] = useState(false);

  const openGmail = async () => {
    const url = email?.link_email;
    if (!url) return;
    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else show("Tidak dapat membuka Gmail");
  };

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    const ok = await updateFollowUp(ri, t);
    setSending(false);
    show(ok ? "Tindak lanjut tersimpan" : "Gagal menyimpan");
  };

  if (!email) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.centerText}>Email tidak ditemukan</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="detail-back">
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={styles.catRow}>
          <CategoryDot kategori={email.kategori} />
          <Text style={styles.catText}>{email.kategori || "Lainnya"}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.company} testID="detail-company">
          {email.nama_perusahaan}
        </Text>
        <Text style={styles.sender}>{email.pengirim}</Text>
        <Text style={styles.date}>{email.tanggal}</Text>

        <View style={styles.divider} />

        <Text style={styles.subjectLabel}>Subjek</Text>
        <Text style={styles.subject}>{email.subjek}</Text>

        <View style={styles.highlight} testID="detail-poin-kunci">
          <View style={styles.highlightHeader}>
            <Ionicons name="sparkles" size={14} color={colors.badge.terkirim.fg} />
            <Text style={styles.highlightTitle}>Poin Kunci</Text>
          </View>
          <Text style={styles.highlightText}>{email.poin_kunci}</Text>
        </View>

        <Pressable
          testID="open-gmail"
          onPress={openGmail}
          style={({ pressed }) => [styles.gmailBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="open-outline" size={18} color={colors.onSurface} />
          <Text style={styles.gmailText}>Buka di Gmail</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          testID="followup-input"
          value={text}
          onChangeText={setText}
          placeholder="Catat status tindak lanjut di sini..."
          placeholderTextColor={colors.onSurfaceMuted}
          style={styles.input}
          multiline
        />
        <Pressable
          testID="followup-send"
          onPress={send}
          disabled={sending || !text.trim()}
          style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
        >
          <Ionicons name="arrow-up" size={20} color={colors.onBrand} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  catRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  catText: { fontSize: font.sm, color: colors.onSurfaceMuted, fontWeight: "600" },
  company: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface },
  sender: { fontSize: font.base, color: colors.onSurfaceMuted, marginTop: 4 },
  date: { fontSize: font.sm, color: colors.onSurfaceMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.lg },
  subjectLabel: { fontSize: font.sm, color: colors.onSurfaceMuted, fontWeight: "600", marginBottom: spacing.xs },
  subject: { fontSize: font.lg, color: colors.onSurface, fontWeight: "600", lineHeight: 20 },
  highlight: {
    backgroundColor: colors.badge.terkirim.bg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  highlightHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  highlightTitle: { fontSize: font.sm, fontWeight: "700", color: colors.badge.terkirim.fg },
  highlightText: { fontSize: font.lg, color: colors.badge.terkirim.fg, lineHeight: 21 },
  gmailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
  },
  gmailText: { fontSize: font.lg, fontWeight: "700", color: colors.onSurface },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 40,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontSize: font.lg,
    color: colors.onSurface,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { alignItems: "center", justifyContent: "center", flex: 1 },
  centerText: { fontSize: font.lg, color: colors.onSurface, fontWeight: "600" },
  backLink: { marginTop: spacing.lg },
  backLinkText: { color: colors.onSurfaceMuted, fontSize: font.base },
});
