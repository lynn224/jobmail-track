import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChipReorder from "@/src/components/ChipReorder";
import { colors, font, radius, spacing } from "@/src/theme";

type Payload = {
  email: string;
  subjek: string;
  perusahaan: string;
  posisi: string;
  pesan: string;
  berkas: string;
  nama_pdf: string;
};

type Props = {
  options: string[];
  onSubmit: (p: Payload) => Promise<boolean>;
};

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  multiline,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: "email-address" | "default";
  multiline?: boolean;
  testID: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceMuted}
        keyboardType={keyboardType || "default"}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { borderBottomColor: error ? colors.badge.gagal.fg : focused ? colors.borderStrong : colors.border },
        ]}
      />
      {error ? (
        <Text style={styles.errorText} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const AddLamaranSheet = forwardRef<BottomSheetModal, Props>(({ options, onSubmit }, ref) => {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ["92%"], []);

  const [email, setEmail] = useState("");
  const [subjek, setSubjek] = useState("");
  const [perusahaan, setPerusahaan] = useState("");
  const [posisi, setPosisi] = useState("");
  const [pesan, setPesan] = useState("");
  const [berkas, setBerkas] = useState<string[]>([]);
  const [namaPdf, setNamaPdf] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setEmail("");
    setSubjek("");
    setPerusahaan("");
    setPosisi("");
    setPesan("");
    setBerkas([]);
    setNamaPdf("");
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const emailTrim = email.trim();
    if (!emailTrim) e.email = "Email Penerima tidak boleh kosong";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) e.email = "Format email tidak valid";
    if (!perusahaan.trim()) e.perusahaan = "Nama Perusahaan tidak boleh kosong";
    if (!posisi.trim()) e.posisi = "Posisi tidak boleh kosong";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    const ok = await onSubmit({
      email: email.trim(),
      subjek: subjek.trim(),
      perusahaan: perusahaan.trim(),
      posisi: posisi.trim(),
      pesan: pesan.trim(),
      berkas: berkas.join(", "),
      nama_pdf: namaPdf.trim(),
    });
    setSubmitting(false);
    if (ok) {
      reset();
      (ref as any)?.current?.dismiss();
    }
  }, [email, subjek, perusahaan, posisi, pesan, berkas, namaPdf, onSubmit, ref]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBg}
      onDismiss={reset}
    >
      <BottomSheetView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Tambah Lamaran</Text>
        </View>
        <BottomSheetScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            testID="input-email"
            label="Email Penerima *"
            value={email}
            onChangeText={setEmail}
            placeholder="nama@perusahaan.com"
            keyboardType="email-address"
            error={errors.email}
          />
          <Field
            testID="input-subjek"
            label="Subjek Email"
            value={subjek}
            onChangeText={setSubjek}
            placeholder="Biarkan kosong untuk otomatis default script"
          />
          <Field
            testID="input-perusahaan"
            label="Nama Perusahaan *"
            value={perusahaan}
            onChangeText={setPerusahaan}
            placeholder="PT Contoh Sejahtera"
            error={errors.perusahaan}
          />
          <Field
            testID="input-posisi"
            label="Posisi *"
            value={posisi}
            onChangeText={setPosisi}
            placeholder="Staff Administrasi"
            error={errors.posisi}
          />
          <Field
            testID="input-pesan"
            label="Isi Pesan Custom"
            value={pesan}
            onChangeText={setPesan}
            placeholder="Biarkan kosong untuk menggunakan template surat bawaan"
            multiline
          />

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Pilih Berkas PDF</Text>
            <ChipReorder options={options} value={berkas} onChange={setBerkas} />
          </View>

          <Field
            testID="input-nama-pdf"
            label="Nama File PDF"
            value={namaPdf}
            onChangeText={setNamaPdf}
            placeholder="Biarkan kosong untuk otomatis Berkas_Lamaran_[Perusahaan].pdf"
          />
        </BottomSheetScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            testID="save-lamaran-button"
            onPress={submit}
            disabled={submitting}
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.saveText}>Simpan Ke Sheet</Text>
            )}
          </Pressable>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AddLamaranSheet.displayName = "AddLamaranSheet";
export default AddLamaranSheet;

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  handle: { backgroundColor: colors.border, width: 40 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: font.xl, fontWeight: "800", color: colors.onSurface },
  fieldWrap: { marginBottom: spacing.xl },
  label: { fontSize: font.sm, color: colors.onSurfaceMuted, marginBottom: spacing.xs, fontWeight: "600" },
  input: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    fontSize: font.lg,
    color: colors.onSurface,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  errorText: { color: colors.badge.gagal.fg, fontSize: font.sm, marginTop: spacing.xs },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  saveBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: colors.onBrand, fontSize: font.lg, fontWeight: "700" },
});
