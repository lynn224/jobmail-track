import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEMO_URL, saveUrl } from "@/src/api/client";
import { useData } from "@/src/context/DataContext";
import { colors, font, radius, spacing } from "@/src/theme";

export default function Setup() {
  const insets = useSafeAreaInsets();
  const { reloadConnection } = useData();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = async (value: string) => {
    const v = value.trim();
    const isDemo = v === "demo";
    if (!isDemo) {
      if (!v) {
        setError("URL Web App tidak boleh kosong");
        return;
      }
      if (!/^https?:\/\//i.test(v)) {
        setError("URL harus diawali http:// atau https://");
        return;
      }
    }
    setError(null);
    setBusy(true);
    await saveUrl(v);
    await reloadConnection();
    setBusy(false);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing["3xl"], paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logo}>
          <Ionicons name="mail-unread" size={30} color={colors.onBrand} />
        </View>
        <Text style={styles.title}>JobMail Tracker</Text>
        <Text style={styles.subtitle}>
          Hubungkan aplikasi ke Web App Google Apps Script Anda. Tanpa login Google.
        </Text>

        <Text style={styles.label}>Web App URL GAS</Text>
        <TextInput
          testID="input-gas-url"
          value={url}
          onChangeText={setUrl}
          placeholder="https://script.google.com/macros/s/..../exec"
          placeholderTextColor={colors.onSurfaceMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={[styles.input, { borderBottomColor: error ? colors.badge.gagal.fg : colors.border }]}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          testID="connect-button"
          onPress={() => connect(url)}
          disabled={busy}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.primaryText}>Hubungkan App</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.or}>atau</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          testID="demo-button"
          onPress={() => connect(DEMO_URL)}
          disabled={busy}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="flask-outline" size={16} color={colors.onSurface} />
          <Text style={styles.secondaryText}>Coba dengan Data Demo</Text>
        </Pressable>
        <Text style={styles.hint}>
          Data demo meniru struktur sheet Anda. Ganti URL kapan saja lewat menu Referensi.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: { paddingHorizontal: spacing.xl },
  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  subtitle: {
    fontSize: font.lg,
    color: colors.onSurfaceMuted,
    marginTop: spacing.sm,
    marginBottom: spacing["2xl"],
    lineHeight: 20,
  },
  label: { fontSize: font.sm, color: colors.onSurfaceMuted, fontWeight: "600", marginBottom: spacing.xs },
  input: { borderBottomWidth: 1, paddingVertical: spacing.md, fontSize: font.lg, color: colors.onSurface },
  error: { color: colors.badge.gagal.fg, fontSize: font.sm, marginTop: spacing.xs },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  primaryText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xl },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: spacing.md, color: colors.onSurfaceMuted, fontSize: font.base },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
  },
  secondaryText: { color: colors.onSurface, fontSize: font.lg, fontWeight: "600" },
  hint: { fontSize: font.sm, color: colors.onSurfaceMuted, marginTop: spacing.md, textAlign: "center", lineHeight: 16 },
});
